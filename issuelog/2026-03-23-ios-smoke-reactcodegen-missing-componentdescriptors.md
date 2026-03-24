# iOS Smoke Fails During Native Build

## Problem Analysis

- Command: `make maestro-ios-local`
- Output directory: `.artifacts/maestro/local/ios-20260323095037-wjrwhc/`
- Failure stage: `build-install`
- Observed error:
  - `Build input file cannot be found: '/Users/hungming-hung/repo/ai-project/full-stack-demo/app/ios/build/generated/ios/react/renderer/components/rngesturehandler_codegen/ComponentDescriptors.cpp'`
  - `CommandError: Failed to build iOS project. "xcodebuild" exited with error code 65.`

The failure happens before Maestro starts driving the app, so the blocker is in the iOS native build/codegen layer rather than the smoke flow itself.

## Root Cause

Two issues caused the iOS build failure:

1. **`newArchEnabled` mismatch**: `app/app.json` had `newArchEnabled: true` but `app/ios/Podfile.properties.json` had `newArchEnabled: "false"`. This inconsistency caused ReactCodegen to generate incomplete artifacts for the new architecture build.
2. **Stale native project**: The checked-in `app/ios/` directory had drifted from the dependency graph, leaving `ComponentDescriptors.cpp` files missing or incomplete.

A secondary issue was also found:
3. **CocoaPods too old**: CocoaPods 1.11.3 did not support the `visionos` platform used in `hermes-engine.podspec` (RN 0.76.9). Updated to 1.16.2.
4. **`adb devices` called on iOS path**: `build_and_install_app()` in `run-local.sh` called `adb devices` unconditionally, even for iOS builds.
5. **URL open timeout treated as fatal**: `expo run:ios --no-bundler` exits non-zero when the post-install deep link open times out, even though build and install succeeded.

## Resolution (2026-03-24)

### Changes Applied

1. **`app/ios/Podfile.properties.json`**: Set `newArchEnabled` to `"true"` to match `app.json`.
2. **`npx expo prebuild --clean --platform ios`**: Regenerated the entire iOS native project from clean state with CocoaPods 1.16.2.
3. **`scripts/maestro/run-local.sh`**: Fixed `build_and_install_app()` to:
   - Only call `adb devices` for Android platform
   - Tolerate post-install URL open timeout on iOS when build and install succeeded (checks for "Build Succeeded" and "Installing on" in build log)
4. **`.github/workflows/mobile-smoke.yml`**: Added `ios-smoke` job with `macos-latest` runner, idb, and iPhone 16 simulator.

### Verification

- `make maestro-ios-local`: **PASSED** (1/1 Flow Passed in 51s)
- iOS build: 0 errors, 4 warnings
- All `ComponentDescriptors.cpp` files present in `app/ios/build/generated/`
