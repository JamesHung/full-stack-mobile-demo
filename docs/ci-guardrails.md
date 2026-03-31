# CI Guardrails — smoke-kit Policy Engine

smoke-kit 的 policy engine 在 **push 前攔截問題**，避免浪費 CI 時間。
改了哪些路徑，就跑對應的檢查。跑不過就擋住 push。

## 快速開始

```bash
# 診斷環境是否就緒
make doctor

# 查看目前 diff 需要跑哪些檢查
make plan

# 執行所有必要檢查（等同 pre-push hook 的效果）
make enforce

# 安裝 pre-push hook（push 前自動 enforce）
make install-hook
```

## 運作原理

```
開發者改了檔案
    │
    ▼
git push
    │
    ▼
pre-push hook 啟動
    │
    ▼
smoke-kit enforce
    ├── 讀取 smoke-plan.yml
    ├── git diff → 取得變更路徑
    ├── 比對 rules → 決定要跑哪些 checks
    ├── 驗證 command allowlist（安全性）
    ├── 平行執行 lint / shell-validation
    │   + 依序執行 smoke tests
    └── 全部通過 → push 繼續
        任一失敗 → push 中止
```

## smoke-plan.yml

路徑在 repo root。定義了「哪些路徑變更對應哪些檢查」：

```yaml
version: 1

checks:
  backend-lint:
    command: "pnpm --filter backend run lint"
    timeout_s: 60
  ios-smoke:
    command: "pnpm --filter smoke-kit exec smoke-kit run ios"
    timeout_s: 300
  android-smoke:
    command: "pnpm --filter smoke-kit exec smoke-kit run android"
    timeout_s: 300
  shell-validation:
    command: "find scripts/ -name '*.sh' -exec bash -n {} \\;"
    timeout_s: 30

rules:
  - paths: ["app/**", "backend/**", "scripts/**"]
    checks: [backend-lint, ios-smoke, android-smoke, shell-validation]
  - paths: [".github/workflows/**", "android/fastlane/**"]
    checks: [backend-lint, ios-smoke, android-smoke, shell-validation]
  - paths: ["packages/smoke-kit/**"]
    checks: [backend-lint, shell-validation]
  - paths: ["smoke-plan.yml", "package.json", "pnpm-lock.yaml", "tsconfig.base.json"]
    checks: [backend-lint, ios-smoke, android-smoke]

ci_average_duration_s: 720
```

### 路徑對應邏輯

| 改了什麼 | 會跑的檢查 |
|----------|-----------|
| `app/**`, `backend/**`, `scripts/**` | 全部（lint + smoke tests + shell） |
| `.github/workflows/**`, `android/fastlane/**` | 全部（CI/build 變更影響範圍大） |
| `packages/smoke-kit/**` | lint + shell validation |
| `smoke-plan.yml`, `package.json`, `pnpm-lock.yaml` | lint + smoke tests |
| `README.md`, `docs/**` 等其他路徑 | 不需要跑任何檢查 |

## 指令詳解

### `smoke-kit plan`

顯示目前 diff 需要跑哪些檢查，不實際執行。

```bash
# 人類可讀
smoke-kit plan --verbose

# JSON 輸出（給 CI 或腳本用）
smoke-kit plan --json

# 含上次執行結果
smoke-kit plan --last-run

# 指定 diff 來源（預設自動偵測）
smoke-kit plan --mode ci     # git diff main...HEAD
smoke-kit plan --mode local  # git diff HEAD
```

### `smoke-kit enforce`

執行所有必要檢查。fail-closed：`smoke-plan.yml` 不存在就直接失敗。

```bash
smoke-kit enforce --verbose
```

執行策略：
- **lint / shell-validation**：平行執行
- **smoke tests (ios, android)**：依序執行（共用 backend 和模擬器資源）
- 每個 check 有 `timeout_s` 限制，超時自動終止

### `smoke-kit install-hook`

安裝 `.git/hooks/pre-push`。

```bash
smoke-kit install-hook          # 建立或跳過（冪等）
smoke-kit install-hook --force  # 覆蓋既有 hook
```

行為：
- Hook 不存在 → 建立
- 已是 smoke-kit hook → 跳過（冪等）
- 是其他 hook → 警告 + 印出手動合併方式
- `--force` → 直接覆蓋

### `smoke-kit doctor`

檢查環境是否就緒。

```bash
smoke-kit doctor
```

檢查項目：git、smoke-plan.yml、smoke.config.json、node、pnpm、pre-push hook、port 8000。

## 逃生艙

如果需要緊急 push（例如 hotfix），使用環境變數跳過：

```bash
SMOKE_SKIP=1 git push
```

跳過行為會被記錄到 `.smoke-kit/metrics.jsonl`，確保可追溯。

## 安全性

### Command Allowlist

`smoke-plan.yml` 中的 command 必須以已知前綴開頭：

```
pnpm, npm, npx, make, find, bash, sh,
smoke-kit, node, uv, pytest, vitest, tsc
```

其他指令（如 `curl`、`rm`、`python`）會被拒絕，防止 policy 檔被誤用為攻擊向量。

### Fail-Closed

`smoke-plan.yml` 不存在時，`enforce` 會直接失敗。
不會因為「找不到規則」而靜默放行。

## Metrics

每次 enforce / plan 執行後，結果寫入 `.smoke-kit/metrics.jsonl`（已加入 .gitignore）。

```jsonl
{"timestamp":"2026-03-31T08:42:07Z","trigger":"enforce","checks":["backend-lint","shell-validation"],"duration_s":1,"ci_time_saved_s":719}
```

用途：
- `plan --last-run` 可查看上次結果
- `doctor` 會顯示最後一次執行狀態
- 未來可接入 dashboard（見 [TODOS.md][todos]）

## Makefile 目標

| 目標 | 說明 |
|------|------|
| `make plan` | 顯示需要的檢查 |
| `make enforce` | 執行所有檢查 |
| `make install-hook` | 安裝 pre-push hook |
| `make doctor` | 診斷環境 |
| `make verify` | lint + test + build + backend regression |

直接呼叫 CLI 也可以（從 repo root）：

```bash
npx --prefix packages/smoke-kit smoke-kit <command>
```

## 故障排除

### smoke-plan.yml 不見了
```
Error: Policy file not found: smoke-plan.yml
```
把 `smoke-plan.yml` 加回 repo root。enforcement 是 fail-closed，不允許缺少 policy 檔。

### Command allowlist 被擋
```
Error: Command allowlist violation:
  ✖ Check "deploy" uses disallowed command prefix: "curl"
```
只能使用允許的指令前綴。如果需要擴展，修改 `packages/smoke-kit/src/policy/allowlist.ts`。

### 超時
```
⏰ ios-smoke (300.0s) — Timed out after 300s
```
調整 `smoke-plan.yml` 中對應 check 的 `timeout_s`。CI cold-start 建議至少 300s。

### Shallow clone（CI 環境）
自動偵測並執行 `git fetch --unshallow`。如果 unshallow 也失敗，會 fallback 到 `git diff HEAD`。

[todos]: ../TODOS.md
