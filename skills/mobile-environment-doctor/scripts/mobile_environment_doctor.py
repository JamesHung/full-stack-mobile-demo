#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tomllib
from dataclasses import asdict, dataclass, field
from pathlib import Path


PACKAGE_MANAGER_RE = re.compile(r"^(?P<name>[a-z0-9._-]+)@(?P<version>[0-9][^ ]*)$")
VERSION_RE = re.compile(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?")
PRELIGHT_REQUIRE_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*require_command\s+([A-Za-z0-9._-]+)")
DOCUMENTED_PYTHON_RE = re.compile(r"\bPython\s+(\d+\.\d+)\b")
SPEC_RE = re.compile(r"(<=|>=|==|<|>)\s*([0-9]+(?:\.[0-9]+){0,2})$")


@dataclass
class CommandStatus:
    present: bool
    path: str | None = None
    version: str | None = None
    bootstrap_only: bool = False


@dataclass
class CheckResult:
    key: str
    status: str
    summary: str
    details: list[str] = field(default_factory=list)
    fix: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)


def first_line(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return text.strip()


def relative_path(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def run_command(command: list[str], cwd: Path | None = None) -> tuple[bool, str]:
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            check=False,
            timeout=10,
        )
    except FileNotFoundError:
        return False, ""
    except subprocess.TimeoutExpired as exc:
        return False, exc.stdout or exc.stderr or ""

    output = "\n".join(part for part in (completed.stdout, completed.stderr) if part).strip()
    return completed.returncode == 0, output


def version_tuple(text: str | None) -> tuple[int, int, int] | None:
    if not text:
        return None
    match = VERSION_RE.search(text)
    if not match:
        return None
    parts = [int(part) if part is not None else 0 for part in match.groups()]
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts[:3])


def compare_versions(left: tuple[int, int, int], right: tuple[int, int, int]) -> int:
    if left < right:
        return -1
    if left > right:
        return 1
    return 0


def satisfies_version_spec(spec: str | None, actual_text: str | None) -> bool | None:
    if not spec or not actual_text:
        return None

    actual = version_tuple(actual_text)
    if actual is None:
        return None

    for clause in spec.split(","):
        clause = clause.strip()
        if not clause:
            continue
        match = SPEC_RE.fullmatch(clause)
        if not match:
            return None
        operator, expected_text = match.groups()
        expected = version_tuple(expected_text)
        if expected is None:
            return None
        comparison = compare_versions(actual, expected)
        if operator == "==" and comparison != 0:
            return False
        if operator == ">=" and comparison < 0:
            return False
        if operator == ">" and comparison <= 0:
            return False
        if operator == "<=" and comparison > 0:
            return False
        if operator == "<" and comparison >= 0:
            return False
    return True


def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text())


def load_toml(path: Path) -> dict:
    if not path.is_file():
        return {}
    return tomllib.loads(path.read_text())


def discover_repo_root(raw_path: str | None) -> Path:
    root = Path(raw_path or os.getcwd()).resolve()
    if root.is_file():
        return root.parent
    return root


def discover_preflight_files(repo_root: Path) -> list[Path]:
    candidates = []
    for pattern in ("**/preflight.sh", "**/*preflight*.sh"):
        for path in repo_root.glob(pattern):
            if path.is_file() and path not in candidates:
                candidates.append(path)
    candidates.sort()
    return candidates


def parse_package_manager(field: str | None) -> tuple[str | None, str | None]:
    if not field:
        return None, None
    match = PACKAGE_MANAGER_RE.match(field.strip())
    if not match:
        return field.strip(), None
    return match.group("name"), match.group("version")


def resolve_command_status(
    command_name: str,
    bootstrap_paths: dict[str, Path],
    version_command: list[str] | None = None,
) -> CommandStatus:
    path = shutil.which(command_name)
    bootstrap_only = False
    resolved = Path(path) if path else bootstrap_paths.get(command_name)
    if resolved and not path:
        bootstrap_only = True
    if not resolved:
        return CommandStatus(present=False)

    version = None
    command = version_command or [str(resolved), "--version"]
    if command and command[0] == command_name:
        command = [str(resolved), *command[1:]]

    success, output = run_command(command)
    if success and output:
        version = first_line(output)
    return CommandStatus(
        present=True,
        path=str(resolved),
        version=version,
        bootstrap_only=bootstrap_only,
    )


def discover_bootstrap_paths(repo_root: Path, preflight_files: list[Path]) -> tuple[dict[str, Path], Path, str]:
    env = os.environ
    android_sdk_root = env.get("ANDROID_HOME") or env.get("ANDROID_SDK_ROOT")
    sdk_source = "environment"
    if not android_sdk_root:
        android_sdk_root = str(Path.home() / "Library" / "Android" / "sdk")
        sdk_source = "default"

    bootstrap_paths: dict[str, Path] = {}
    maestro_bin = Path.home() / ".maestro" / "bin" / "maestro"
    if any(".maestro/bin" in path.read_text() for path in preflight_files if path.is_file()) and maestro_bin.exists():
        bootstrap_paths["maestro"] = maestro_bin

    sdk_root = Path(android_sdk_root).expanduser()
    adb_bin = sdk_root / "platform-tools" / "adb"
    emulator_bin = sdk_root / "emulator" / "emulator"
    if adb_bin.exists():
        bootstrap_paths["adb"] = adb_bin
    if emulator_bin.exists():
        bootstrap_paths["emulator"] = emulator_bin
    return bootstrap_paths, sdk_root, sdk_source


def discover_python_baseline(repo_root: Path) -> tuple[str | None, list[str]]:
    baselines: list[str] = []
    sources: list[str] = []
    for candidate in (repo_root / "AGENTS.md", repo_root / "README.md"):
        if not candidate.is_file():
            continue
        matches = DOCUMENTED_PYTHON_RE.findall(candidate.read_text())
        if not matches:
            continue
        baselines.extend(matches)
        sources.append(relative_path(candidate, repo_root))
    if not baselines:
        return None, []
    counts: dict[str, int] = {}
    for baseline in baselines:
        counts[baseline] = counts.get(baseline, 0) + 1
    best = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]
    return best, sources


def parse_preflight_expectations(repo_root: Path, preflight_files: list[Path]) -> tuple[set[str], list[str]]:
    required_commands: set[str] = set()
    sources: list[str] = []
    for path in preflight_files:
        text = path.read_text()
        required_commands.update(PRELIGHT_REQUIRE_RE.findall(text))
        sources.append(relative_path(path, repo_root))
    return required_commands, sources


def add_check(
    checks: list[CheckResult],
    key: str,
    status: str,
    summary: str,
    details: list[str] | None = None,
    fix: list[str] | None = None,
    sources: list[str] | None = None,
) -> None:
    checks.append(
        CheckResult(
            key=key,
            status=status,
            summary=summary,
            details=details or [],
            fix=fix or [],
            sources=sources or [],
        )
    )


def command_version_args(command_name: str) -> list[str]:
    if command_name == "java":
        return [command_name, "-version"]
    if command_name == "xcodebuild":
        return [command_name, "-version"]
    if command_name == "xcrun":
        return [command_name, "--version"]
    return [command_name, "--version"]


def platform_list(raw_platform: str, preflight_files: list[Path], app_config: dict) -> list[str]:
    if raw_platform != "all":
        return [raw_platform]

    platforms: list[str] = []
    combined = "\n".join(path.read_text() for path in preflight_files if path.is_file())
    if "adb" in combined or "ANDROID_HOME" in combined or "ANDROID_SDK_ROOT" in combined:
        platforms.append("android")
    if "xcodebuild" in combined or "xcrun" in combined:
        platforms.append("ios")

    expo = app_config.get("expo", {}) if isinstance(app_config, dict) else {}
    if "android" in expo and "android" not in platforms:
        platforms.append("android")
    if "ios" in expo and "ios" not in platforms:
        platforms.append("ios")
    return platforms or ["android", "ios"]


def check_package_manager(
    checks: list[CheckResult],
    repo_root: Path,
    root_package: dict,
    required_commands: set[str],
) -> None:
    package_manager_field = root_package.get("packageManager")
    source = [relative_path(repo_root / "package.json", repo_root)] if package_manager_field else []
    manager_name, expected_version = parse_package_manager(package_manager_field)
    if not manager_name:
        add_check(
            checks,
            "package-manager-config",
            "warn",
            "No packageManager pin found in package.json.",
            fix=["Add packageManager to package.json if exact package-manager drift should be enforced."],
            sources=source,
        )
        return

    direct_status = resolve_command_status(manager_name, {})
    corepack_status = resolve_command_status("corepack", {})

    details = [f"package.json pins {manager_name}@{expected_version or 'unknown'}."]
    if direct_status.present:
        details.append(f"{manager_name} resolves to {direct_status.path}.")
    if corepack_status.present:
        details.append(f"corepack resolves to {corepack_status.path}.")

    if not direct_status.present:
        status = "fail" if manager_name in required_commands else "warn"
        add_check(
            checks,
            "package-manager-command",
            status,
            f"{manager_name} is not available on PATH.",
            details=details,
            fix=[f"Install {manager_name} or enable its Corepack shim before running repo commands."],
            sources=source,
        )
        return

    if expected_version and direct_status.version:
        actual = version_tuple(direct_status.version)
        expected = version_tuple(expected_version)
        if actual and expected and compare_versions(actual, expected) == 0:
            add_check(
                checks,
                "package-manager-version",
                "pass",
                f"{manager_name} matches the pinned version {expected_version}.",
                details=details + [f"Detected version: {direct_status.version}."],
                sources=source,
            )
        else:
            add_check(
                checks,
                "package-manager-version",
                "fail",
                f"{manager_name} version does not match the pinned {expected_version}.",
                details=details + [f"Detected version: {direct_status.version or 'unknown'}."],
                fix=[f"Activate {manager_name}@{expected_version} before running repo commands."],
                sources=source,
            )
    else:
        add_check(
            checks,
            "package-manager-version",
            "warn",
            f"{manager_name} is present, but the exact version could not be verified.",
            details=details + [f"Detected version: {direct_status.version or 'unknown'}."],
            sources=source,
        )

    node_status = resolve_command_status("node", {})
    if node_status.present:
        add_check(
            checks,
            "node-runtime",
            "pass",
            f"node is available ({node_status.version or node_status.path}).",
            details=[f"Resolved path: {node_status.path}."],
            sources=source,
        )
    else:
        add_check(
            checks,
            "node-runtime",
            "fail",
            "node is missing.",
            fix=["Install Node.js before using the repo package manager."],
            sources=source,
        )


def check_workspace_bootstrap(
    checks: list[CheckResult],
    repo_root: Path,
    required_commands: set[str],
    source_files: list[str],
) -> None:
    node_modules = repo_root / "node_modules"
    backend_venv = repo_root / "backend" / ".venv"

    if node_modules.is_dir():
        add_check(
            checks,
            "workspace-node-modules",
            "pass",
            "node_modules is present.",
            sources=source_files if "pnpm" in required_commands else [],
        )
    else:
        add_check(
            checks,
            "workspace-node-modules",
            "fail",
            "node_modules is missing.",
            fix=["Run `corepack pnpm install` from the repo root."],
            sources=source_files,
        )

    if backend_venv.is_dir():
        add_check(
            checks,
            "backend-venv-dir",
            "pass",
            "backend/.venv is present.",
            sources=source_files,
        )
    else:
        add_check(
            checks,
            "backend-venv-dir",
            "fail",
            "backend/.venv is missing.",
            fix=["Run `uv sync --directory backend` from the repo root."],
            sources=source_files,
        )


def check_python(
    checks: list[CheckResult],
    repo_root: Path,
    pyproject: dict,
    documented_baseline: str | None,
    documented_sources: list[str],
) -> None:
    pyproject_path = repo_root / "backend" / "pyproject.toml"
    requires_python = (
        pyproject.get("project", {}).get("requires-python")
        if isinstance(pyproject.get("project"), dict)
        else None
    )
    sources = [relative_path(pyproject_path, repo_root)] if pyproject_path.is_file() else []

    uv_status = resolve_command_status("uv", {})
    if uv_status.present:
        add_check(
            checks,
            "uv-command",
            "pass",
            f"uv is available ({uv_status.version or uv_status.path}).",
            details=[f"Resolved path: {uv_status.path}."],
            sources=sources,
        )
    else:
        add_check(
            checks,
            "uv-command",
            "fail",
            "uv is missing.",
            fix=["Install uv before bootstrapping the backend environment."],
            sources=sources,
        )

    venv_python = repo_root / "backend" / ".venv" / "bin" / "python"
    if venv_python.is_file():
        success, output = run_command([str(venv_python), "--version"])
        version_text = first_line(output) if success else None
        satisfies = satisfies_version_spec(requires_python, version_text)
        if satisfies is False:
            add_check(
                checks,
                "backend-venv-python",
                "fail",
                f"backend/.venv does not satisfy requires-python {requires_python}.",
                details=[f"Detected version: {version_text or 'unknown'}."],
                fix=["Recreate backend/.venv with a compatible Python and re-run `uv sync --directory backend`."],
                sources=sources,
            )
        else:
            add_check(
                checks,
                "backend-venv-python",
                "pass",
                f"backend/.venv satisfies requires-python {requires_python or 'unknown'}.",
                details=[f"Detected version: {version_text or 'unknown'}."],
                sources=sources,
            )

        if documented_baseline:
            detected_tuple = version_tuple(version_text)
            detected_minor = None
            if detected_tuple is not None:
                detected_minor = f"{detected_tuple[0]}.{detected_tuple[1]}"
            if detected_minor and detected_minor != documented_baseline:
                add_check(
                    checks,
                    "documented-python-baseline",
                    "warn",
                    f"backend/.venv uses Python {detected_minor}, while docs say {documented_baseline}.",
                    details=[f"Detected version: {version_text}.", "Manifest still controls pass or fail behavior."],
                    sources=sources + documented_sources,
                )
            else:
                add_check(
                    checks,
                    "documented-python-baseline",
                    "pass",
                    f"Documented Python baseline {documented_baseline} matches backend/.venv.",
                    details=[f"Detected version: {version_text or 'unknown'}."],
                    sources=source_dedupe(sources + documented_sources),
                )
    else:
        add_check(
            checks,
            "backend-venv-python",
            "fail",
            "backend/.venv/bin/python is missing.",
            fix=["Run `uv sync --directory backend` to create the backend virtualenv."],
            sources=sources,
        )

    python3_status = resolve_command_status("python3", {})
    if python3_status.present and requires_python:
        satisfies = satisfies_version_spec(requires_python, python3_status.version)
        status = "pass" if satisfies else "warn"
        summary = (
            f"python3 satisfies requires-python {requires_python}."
            if satisfies
            else f"python3 does not satisfy requires-python {requires_python}."
        )
        add_check(
            checks,
            "global-python3",
            status,
            summary,
            details=[f"Detected version: {python3_status.version or 'unknown'}.", f"Resolved path: {python3_status.path}."],
            fix=[] if satisfies else ["Prefer `backend/.venv/bin/python` or recreate the local interpreter with a compatible version."],
            sources=sources,
        )


def source_dedupe(items: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for item in items:
        if item not in seen:
            deduped.append(item)
            seen.add(item)
    return deduped


def check_generic_required_commands(
    checks: list[CheckResult],
    required_commands: set[str],
    bootstrap_paths: dict[str, Path],
    source_files: list[str],
) -> None:
    for command_name in sorted(required_commands - {"node", "pnpm", "uv", "adb", "xcodebuild", "xcrun"}):
        status = resolve_command_status(command_name, bootstrap_paths, command_version_args(command_name))
        if status.present:
            summary = (
                f"{command_name} is available via preflight bootstrap."
                if status.bootstrap_only
                else f"{command_name} is available."
            )
            add_check(
                checks,
                f"command-{command_name}",
                "pass",
                summary,
                details=[
                    f"Resolved path: {status.path}.",
                    f"Detected version: {status.version or 'unknown'}.",
                ],
                sources=source_files,
            )
        else:
            add_check(
                checks,
                f"command-{command_name}",
                "fail",
                f"{command_name} is required by preflight but missing.",
                fix=[f"Install {command_name} or add it to the bootstrap path used by preflight."],
                sources=source_files,
            )


def check_android(
    checks: list[CheckResult],
    repo_root: Path,
    bootstrap_paths: dict[str, Path],
    android_sdk_root: Path,
    sdk_source: str,
    source_files: list[str],
) -> None:
    details = [f"Resolved SDK root: {android_sdk_root} ({sdk_source})."]
    if android_sdk_root.is_dir():
        add_check(
            checks,
            "android-sdk-root",
            "pass",
            "Android SDK root exists.",
            details=details,
            sources=source_files,
        )
    else:
        add_check(
            checks,
            "android-sdk-root",
            "fail",
            "Android SDK root is missing.",
            details=details,
            fix=["Install the Android SDK or export ANDROID_HOME / ANDROID_SDK_ROOT to the correct location."],
            sources=source_files,
        )
        return

    adb_status = resolve_command_status("adb", bootstrap_paths)
    if adb_status.present:
        add_check(
            checks,
            "android-adb",
            "pass",
            "adb is available.",
            details=[
                f"Resolved path: {adb_status.path}.",
                f"Detected version: {adb_status.version or 'unknown'}.",
                "Preflight bootstrap is sufficient." if adb_status.bootstrap_only else "Command already works from the current shell PATH.",
            ],
            sources=source_files,
        )
        success, output = run_command([adb_status.path, "devices"]) if adb_status.path else (False, "")
        device_lines = [
            line.strip()
            for line in output.splitlines()
            if line.strip() and not line.startswith("List of devices attached")
        ]
        if success and any(line.endswith("\tdevice") or line.endswith(" device") for line in device_lines):
            add_check(
                checks,
                "android-devices",
                "pass",
                "At least one Android device or emulator is booted.",
                details=device_lines,
                sources=source_files,
            )
        else:
            add_check(
                checks,
                "android-devices",
                "warn",
                "No booted Android device or emulator detected.",
                fix=["Boot an Android emulator or connect a device before running Android smoke flows."],
                sources=source_files,
            )
    else:
        add_check(
            checks,
            "android-adb",
            "fail",
            "adb is not available, even after applying preflight bootstrap paths.",
            fix=["Install Android platform-tools or point ANDROID_HOME / ANDROID_SDK_ROOT at the correct SDK root."],
            sources=source_files,
        )

    emulator_path = bootstrap_paths.get("emulator")
    if emulator_path and emulator_path.exists():
        add_check(
            checks,
            "android-emulator-binary",
            "pass",
            "Android emulator binary is available.",
            details=[f"Resolved path: {emulator_path}."],
            sources=source_files,
        )
    else:
        add_check(
            checks,
            "android-emulator-binary",
            "warn",
            "Android emulator binary is not available through the detected SDK root.",
            fix=["Install the Android emulator package if local Android smoke runs should boot an AVD."],
            sources=source_files,
        )


def check_ios(checks: list[CheckResult], bootstrap_paths: dict[str, Path], source_files: list[str]) -> None:
    del bootstrap_paths
    xcodebuild_status = resolve_command_status("xcodebuild", {}, ["xcodebuild", "-version"])
    xcrun_status = resolve_command_status("xcrun", {}, ["xcrun", "--version"])

    if xcodebuild_status.present and xcrun_status.present:
        add_check(
            checks,
            "ios-toolchain",
            "pass",
            "xcodebuild and xcrun are available.",
            details=[
                f"xcodebuild: {xcodebuild_status.version or xcodebuild_status.path}.",
                f"xcrun: {xcrun_status.version or xcrun_status.path}.",
            ],
            sources=source_files,
        )
        success, output = run_command(["xcrun", "simctl", "list", "devices", "booted"])
        if success and "Booted" in output:
            add_check(
                checks,
                "ios-simulators",
                "pass",
                "At least one iOS simulator is booted.",
                details=[first_line(output)],
                sources=source_files,
            )
        else:
            add_check(
                checks,
                "ios-simulators",
                "warn",
                "No booted iOS simulator detected.",
                fix=["Boot an iOS simulator before running iOS smoke flows."],
                sources=source_files,
            )
    else:
        missing = []
        if not xcodebuild_status.present:
            missing.append("xcodebuild")
        if not xcrun_status.present:
            missing.append("xcrun")
        add_check(
            checks,
            "ios-toolchain",
            "fail",
            f"Missing required iOS toolchain command(s): {', '.join(missing)}.",
            fix=["Install Xcode command line tools and ensure they are available on PATH."],
            sources=source_files,
        )


def build_report(repo_root: Path, platform: str) -> dict:
    preflight_files = discover_preflight_files(repo_root)
    preflight_sources = [relative_path(path, repo_root) for path in preflight_files]
    root_package = load_json(repo_root / "package.json")
    pyproject = load_toml(repo_root / "backend" / "pyproject.toml")
    app_config = load_json(repo_root / "app" / "app.json")
    documented_baseline, documented_sources = discover_python_baseline(repo_root)
    required_commands, required_sources = parse_preflight_expectations(repo_root, preflight_files)
    bootstrap_paths, android_sdk_root, sdk_source = discover_bootstrap_paths(repo_root, preflight_files)
    selected_platforms = platform_list(platform, preflight_files, app_config)

    checks: list[CheckResult] = []

    if preflight_sources:
        add_check(
            checks,
            "preflight-discovery",
            "pass",
            "Discovered repo preflight files.",
            details=preflight_sources,
            sources=preflight_sources,
        )
    else:
        add_check(
            checks,
            "preflight-discovery",
            "warn",
            "No preflight.sh file found. Falling back to manifests and local heuristics.",
        )

    check_package_manager(checks, repo_root, root_package, required_commands)
    check_workspace_bootstrap(checks, repo_root, required_commands, required_sources or preflight_sources)
    check_python(checks, repo_root, pyproject, documented_baseline, documented_sources)
    check_generic_required_commands(checks, required_commands, bootstrap_paths, required_sources)

    if "android" in selected_platforms:
        check_android(checks, repo_root, bootstrap_paths, android_sdk_root, sdk_source, required_sources or preflight_sources)
    if "ios" in selected_platforms:
        check_ios(checks, bootstrap_paths, required_sources or preflight_sources)

    summary = {"pass": 0, "warn": 0, "fail": 0}
    for check in checks:
        summary[check.status] = summary.get(check.status, 0) + 1

    return {
        "repo_root": str(repo_root),
        "platforms": selected_platforms,
        "sources": source_dedupe(
            preflight_sources
            + [relative_path(repo_root / "package.json", repo_root)]
            + ([relative_path(repo_root / "backend" / "pyproject.toml", repo_root)] if (repo_root / "backend" / "pyproject.toml").is_file() else [])
            + documented_sources
        ),
        "checks": [asdict(check) for check in checks],
        "summary": summary,
    }


def print_human_report(report: dict) -> None:
    print("Mobile Environment Doctor")
    print(f"Repo: {report['repo_root']}")
    print(f"Platforms: {', '.join(report['platforms'])}")
    print(f"Sources: {', '.join(report['sources'])}")
    print()

    for check in report["checks"]:
        print(f"[{check['status'].upper()}] {check['key']}: {check['summary']}")
        for detail in check["details"]:
            print(f"  - {detail}")
        if check["sources"]:
            print(f"  - sources: {', '.join(check['sources'])}")
        for fix in check["fix"]:
            print(f"  - fix: {fix}")
        print()

    summary = report["summary"]
    print(
        "Summary: "
        f"{summary.get('pass', 0)} pass, "
        f"{summary.get('warn', 0)} warn, "
        f"{summary.get('fail', 0)} fail"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Diagnose mobile environment drift from repo configuration.")
    parser.add_argument("--repo", default=".", help="Repo root to inspect. Defaults to the current directory.")
    parser.add_argument(
        "--platform",
        choices=("all", "android", "ios"),
        default="all",
        help="Limit platform-specific checks. Defaults to all discovered platforms.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    args = parser.parse_args()

    repo_root = discover_repo_root(args.repo)
    report = build_report(repo_root, args.platform)
    if args.json:
        json.dump(report, sys.stdout, indent=2)
        print()
    else:
        print_human_report(report)
    return 1 if report["summary"].get("fail", 0) else 0


if __name__ == "__main__":
    raise SystemExit(main())
