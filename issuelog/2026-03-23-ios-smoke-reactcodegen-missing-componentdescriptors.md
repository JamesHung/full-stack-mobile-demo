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

The checked-in Expo/RN iOS native project has drifted from the generated ReactCodegen outputs expected by the current dependency graph. `xcodebuild` is compiling the `ReactCodegen` pod target, but the referenced `ComponentDescriptors.cpp` file is not present under `app/ios/build/generated/...`, which indicates stale or incomplete native generated artifacts.

## Resolution

- Short term: treat iOS smoke as a known issue and keep Android smoke as the active required regression path.
- Next diagnostic step: resync the iOS native project and generated code, then rerun `make maestro-ios-local`.
- Candidate remediation steps:
  - regenerate the iOS native project and codegen outputs from a clean state
  - verify the `react-native-gesture-handler` codegen artifacts are produced in the expected path
  - rerun the iOS local smoke after the native build succeeds
