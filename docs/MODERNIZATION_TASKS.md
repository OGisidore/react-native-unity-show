# Modernization Tasks

Status values: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## MOD-001 - Audit and modernization backlog

Status: `DONE`

Branch: `modernization-audit-plan`

Problem: The repository lacks a documented architecture baseline and modernization plan.

Objective: Add a complete audit and actionable modernization backlog before code migration.

Likely files/components: `docs/MODERNIZATION_AUDIT.md`, `docs/MODERNIZATION_TASKS.md`.

Proposed solution: Document the actual repository state, external research conclusions, target architecture, and task sequence.

Dependencies: None.

Acceptance criteria:

- Audit document exists and covers current architecture, inventory, outdated components, compatibility risks, target architecture, and references.
- Task document exists and breaks migration into reviewable tasks.
- Documents are committed and pushed on the audit branch.

Required tests:

- Markdown/content review.
- `git status` clean after commit.

Risk: `LOW`

Commit: `9796d66`

## MOD-002 - Package metadata and public API baseline

Status: `DONE`

Branch: `fix/mod-002-package-api-baseline`

Problem: README and package metadata claim Unity functionality that is not implemented, and the package description is placeholder text.

Objective: Make the current public API explicit and prevent consumers from expecting a missing `UnityShowView` before it exists.

Likely files/components: `package.json`, `README.md`, `src/index.tsx`, tests.

Proposed solution:

- Update package description and README to describe the current native module state and modernization roadmap.
- Remove or mark misleading `UnityShowView` usage as planned, not available.
- Add minimal JS tests for exported functions and linking-error behavior.
- Decide whether `getUserAgent` remains public during modernization.

Dependencies: MOD-001.

Acceptance criteria:

- README matches actual exports.
- Package metadata is not placeholder text.
- Public exports are documented.
- Unit tests cover current JS wrapper behavior.

Required tests:

- `yarn test`
- `yarn typescript`

Risk: `LOW`

Commit: `40f99ac`

## MOD-003 - Modern JavaScript package tooling

Status: `DONE`

Branch: `fix/mod-003-js-package-tooling`

Problem: Tooling is pinned to a RN 0.63-era stack: Bob 0.18, TypeScript 4.1, Jest 26, ESLint 7, release-it 14, Node 10 CI expectations, and no lockfile.

Objective: Move package build/test tooling to a current baseline compatible with modern React Native libraries.

Likely files/components: `package.json`, `tsconfig.json`, `tsconfig.build.json`, Babel config, Jest config, ESLint config, lockfile, CI.

Proposed solution:

- Upgrade builder-bob and regenerate package build outputs/config as needed.
- Adopt current React Native TypeScript config conventions where appropriate.
- Update Jest and ESLint setup.
- Add a committed lockfile using the selected package manager.
- Set explicit Node engine/CI version aligned with current RN/Expo requirements.

Dependencies: MOD-002.

Acceptance criteria:

- Package builds with current tooling.
- TypeScript, lint, and unit tests pass locally.
- CI uses a supported Node version.
- No generated `lib/` output is committed unless project policy changes.

Required tests:

- `yarn install --frozen-lockfile`
- `yarn prepare`
- `yarn typescript`
- `yarn lint`
- `yarn test`

Risk: `MEDIUM`

Commit: `f3634a6`

## MOD-004 - Android library build modernization

Status: `DONE`

Branch: `fix/mod-004-android-library-build`

Problem: Android library build uses AGP 3.5.3, SDK 29, Java 8, `jcenter()`, and dynamic `react-native:+`.

Objective: Make the Android library build compatible with modern React Native/Expo Android builds.

Likely files/components: `android/build.gradle`, `android/src/main/AndroidManifest.xml`, package metadata.

Proposed solution:

- Remove `jcenter()`.
- Replace dynamic React Native dependency with the modern dependency pattern.
- Add `namespace`.
- Update compile/min/target SDK defaults according to the chosen RN/Expo baseline.
- Add Java/Kotlin toolchain settings if Kotlin is introduced later.
- Verify with an example app once MOD-005 is complete.

Dependencies: MOD-003.

Acceptance criteria:

- Android library Gradle configuration evaluates with modern AGP.
- No dynamic RN dependency remains.
- No deprecated repository remains.
- Build file remains compatible as a React Native library dependency.

Required tests:

- Android Gradle sync/build through example app after MOD-005.
- Static Gradle review for compatibility with AGP target.

Risk: `MEDIUM`

Commit: `47fdafe`

Validation notes:

- `yarn typescript`, `yarn lint`, and `yarn test` pass.
- `./gradlew :reactnativeunityshow:tasks --no-daemon` from `example/android` is blocked before module evaluation because the current example still uses Gradle 6.2 under Java 24 (`Could not initialize class org.codehaus.groovy.reflection.ReflectionCache`). This is expected to be resolved by MOD-005.

## MOD-005 - Regenerate example app on modern Expo/RN baseline

Status: `DONE`

Branch: `fix/mod-005-modern-example-app`

Problem: The example app is RN 0.63 and does not exercise Expo or modern New Architecture defaults.

Objective: Provide a current test harness for the package.

Likely files/components: `example/`, root package scripts, CI.

Proposed solution:

- Replace the old RN example with a modern Expo development-build example.
- Use the current Expo SDK line and its supported React Native version.
- Keep example minimal at first: validate module loading and current APIs.
- Add instructions for iOS/Android development builds.

Dependencies: MOD-003, MOD-004.

Acceptance criteria:

- Example app installs with committed lockfile.
- Example starts with Expo tooling.
- Example can build native projects via prebuild/run commands.
- Existing `multiply` smoke path works before Unity integration begins.

Required tests:

- `yarn example start` or Expo equivalent.
- `npx expo-doctor`
- Android debug build.
- iOS pod install/build when Xcode environment is available.

Risk: `HIGH`

Commit: `e58127d`

Validation notes:

- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the package root.
- `yarn --cwd example tsc --noEmit` passes.
- `yarn --cwd example expo prebuild --no-install` passes and generates modern Expo-managed Android/iOS native projects.
- `yarn --cwd example doctor --verbose` passes 20/21 checks. The remaining failure is duplicate `react`/`react-native` detection caused by local development layout: `example` links `react-native-unity-show` to `..`, while the root package also has its own `node_modules`.
- Android `:app:assembleDebug` after prebuild reaches Gradle/Expo configuration but is blocked by the local Android SDK: NDK `/Users/macuser/Library/Android/sdk/ndk/27.1.12297006` is missing `source.properties`.
- iOS build validation still requires a local Xcode/CocoaPods pass and is covered by MOD-006.

## MOD-006 - iOS build and podspec modernization

Status: `DONE`

Branch: `fix/mod-006-ios-podspec-build`

Problem: iOS targets are inconsistent and old; implementation uses Objective-C legacy bridge modules only.

Objective: Align iOS packaging with the selected modern RN/Expo baseline.

Likely files/components: `react-native-unity-show.podspec`, `ios/`, `example/ios`.

Proposed solution:

- Set a single supported iOS deployment target aligned with the chosen Expo/RN baseline.
- Remove stale standalone Xcode project if not needed for pod consumption.
- Prepare Swift support for Expo Modules API migration.
- Keep Objective-C bridge only as temporary compatibility if necessary.

Dependencies: MOD-003, MOD-005.

Acceptance criteria:

- Podspec passes lint where feasible.
- Example iOS pod install succeeds.
- Deployment target values are consistent.
- iOS package layout is ready for Swift/Expo module implementation.

Required tests:

- `pod lib lint` or scoped pod validation where feasible.
- `npx pod-install` in example.
- iOS build if local Xcode environment is available.

Risk: `MEDIUM`

Commit: `5fee971`

Validation notes:

- `pod ipc spec react-native-unity-show.podspec` passes and reports iOS `16.4`, Swift `5.0`, ARC, `WebKit`, and `React-Core`.
- `yarn --cwd example expo prebuild --platform ios --no-install` passes.
- `pod install` from `example/ios` passes with network access, autolinks `react-native-unity-show`, configures React Native New Architecture, and installs 94 pods.
- `xcodebuild -workspace UnityShowExample.xcworkspace -scheme UnityShowExample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build` passes with Xcode 26.6 when run outside the filesystem sandbox.
- `pod lib lint react-native-unity-show.podspec --allow-warnings --skip-import-validation` is not representative for this React Native library in isolation: CocoaPods trunk resolves `React-Core 0.1.0`, whose headers do not match modern React Native npm podspecs. The example app build is the authoritative validation for MOD-006.

## MOD-007 - Expo Modules API scaffold

Status: `DONE`

Branch: `feat/mod-007-expo-modules-scaffold`

Problem: The package cannot be consumed naturally by modern Expo apps and explicitly rejects Expo managed workflow.

Objective: Add an Expo Modules API implementation path for native modules and native views.

Likely files/components: `expo-module.config.json`, Android Kotlin sources, iOS Swift sources, `src/` wrappers, package dependencies.

Proposed solution:

- Add `expo-modules-core` dependency/peer strategy.
- Add `expo-module.config.json`.
- Implement a minimal Swift/Kotlin Expo module with current smoke-test API.
- Export JS wrapper via `requireNativeModule`.
- Preserve compatibility path only if needed and documented.

Dependencies: MOD-005, MOD-006.

Acceptance criteria:

- Expo autolinking discovers the package.
- JS can call the module in the example development build.
- Native module works under New Architecture defaults.

Required tests:

- Expo example prebuild.
- Android/iOS native build.
- Unit tests for JS wrapper.

Risk: `HIGH`

Commit: `0e69765`

Validation notes:

- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the package root.
- `yarn --cwd example expo prebuild --no-install` passes and regenerates the Expo CNG native projects.
- Expo autolinking `resolve --platform ios` discovers `react-native-unity-show`, the pod `react-native-unity-show`, Swift module `react_native_unity_show`, and `UnityShowExpoModule`.
- Expo autolinking `resolve --platform android` discovers `react-native-unity-show` and `com.reactnativeunityshow.UnityShowExpoModule`.
- `pod install` from `example/ios` passes and the generated Expo modules provider imports `react_native_unity_show` and registers `UnityShowExpoModule.self`.
- `xcodebuild -workspace UnityShowExample.xcworkspace -scheme UnityShowExample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build` passes with Xcode 26.6.
- `yarn --cwd example doctor --verbose` passes 20/21 checks. The remaining failure is duplicate `react`/`react-native` detection caused by the local development layout: `example` links `react-native-unity-show` to `..`, while the root package also has its own `node_modules`.
- Android Gradle evaluation reaches Expo/RN configuration but is blocked by the local Android SDK: NDK `/Users/macuser/Library/Android/sdk/ndk/27.1.12297006` is missing `source.properties`. The local SDK command-line tools are also unavailable (`sdkmanager: command not found`), so this environment cannot repair the NDK install.
- The JS wrapper loads `expo-modules-core` dynamically and falls back to the legacy `NativeModules.UnityShow` path when the Expo module is unavailable.

## MOD-008 - Define Unity bridge public API

Status: `DONE`

Branch: `feat/mod-008-unity-bridge-api-contract`

Problem: There is no real API contract for Unity lifecycle, messages, events, errors, or view behavior.

Objective: Define a typed public API before implementing platform-specific Unity integration.

Likely files/components: `src/`, documentation, tests.

Proposed solution:

- Add typed APIs for `UnityShowView`, lifecycle commands, `sendMessage`, event subscriptions, load/unload/pause/resume, and error states.
- Document platform limitations and Expo development-build requirement.
- Add tests for type-level and JS wrapper behavior.

Dependencies: MOD-007.

Acceptance criteria:

- API contract is documented.
- TypeScript types express message/event payloads.
- No platform-specific implementation details leak into user API.
- Backward compatibility decision for `multiply`/`getUserAgent` is documented.

Required tests:

- `yarn typescript`
- `yarn test`

Risk: `HIGH`

Commit: `e2829c8`

Validation notes:

- Added the public TypeScript contract for `UnityShowView`, lifecycle commands, Unity messages, event subscriptions, lifecycle states, and error payloads.
- Added `docs/UNITY_BRIDGE_API.md` and linked it from the README.
- The contract is additive relative to `multiply` and `getUserAgent`; both remain documented as transitional compatibility APIs.
- `UnityShowView` and Unity commands fail with explicit implementation errors until the Android/iOS native Unity runtime tasks are complete.
- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the package root.
- `yarn --cwd example tsc --noEmit` passes after `yarn prepare` has generated package declaration files.

## MOD-009 - Android Unity as a Library integration

Status: `BLOCKED`

Branch: `feat/mod-009-android-unity-library`

Problem: Android has no Unity runtime integration.

Objective: Implement Android Unity as a Library support behind the typed API.

Likely files/components: Android Kotlin/Java sources, Gradle config, example Android project, docs.

Proposed solution:

- Define expected location/contract for user-provided Unity Android export or AAR.
- Integrate Unity `unityLibrary`/AAR into the example.
- Implement native view/controller or full-screen presentation according to Unity constraints.
- Forward Android lifecycle events.
- Implement JS-to-Unity messages and Unity-to-JS events.

Dependencies: MOD-008.

Acceptance criteria:

- Example Android app can load Unity content.
- JS can send a message to Unity.
- Unity/native can emit an event to JS.
- Pause/resume/unload behavior is documented and tested manually.

Required tests:

- Android debug build.
- Device/emulator smoke test with sample Unity export.
- Manual lifecycle test: load, background, foreground, unload.

Risk: `HIGH`

Commit: `50a03ae`

Validation notes:

- Added Android Expo Modules API commands for `load`, `unload`, `pause`, `resume`, and `sendMessage`.
- Added an Android `UnityShowView` Expo view wrapper that attaches `UnityPlayer` when the host app provides Unity's `unityLibrary`.
- Added a reflection-based `UnityShowRuntime`, so the npm package compiles without bundling generated Unity artifacts or requiring Unity classes on the compile classpath.
- Added `UnityShowEventBus` with `@JvmStatic` methods for Unity C# code to emit `ready`, `message`, `stateChange`, and `error` events to JavaScript.
- Added `docs/ANDROID_UNITY_INTEGRATION.md` with the expected Unity export layout, manual Gradle integration contract, JS-to-Unity message mapping, Unity-to-JS callback examples, lifecycle behavior, and Unity limitations.
- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the package root.
- `yarn --cwd example expo prebuild --no-install` passes.
- Expo autolinking `resolve --platform android` discovers `react-native-unity-show`.
- `./gradlew projects --no-daemon` from `example/android` passes and includes project `:react-native-unity-show`.
- `./gradlew :react-native-unity-show:compileDebugKotlin --no-daemon` passes.
- `./gradlew :app:assembleDebug --no-daemon` passes without a Unity export, validating that the package can compile in a modern Expo/RN Android app.

Blocking condition:

- Runtime Unity validation is not complete because the repository does not contain a user-provided Android Unity export with a `unityLibrary` module. The remaining acceptance checks require a real Unity export and device/emulator smoke test: load Unity content, send JS-to-Unity message, emit Unity-to-JS event, and manually validate load/background/foreground/unload lifecycle.

## MOD-010 - iOS Unity as a Library integration

Status: `BLOCKED`

Branch: `feat/mod-010-ios-unity-framework`

Problem: iOS has no `UnityFramework` integration.

Objective: Implement iOS Unity as a Library support behind the typed API.

Likely files/components: iOS Swift/Objective-C++ sources, podspec, example iOS project, docs.

Proposed solution:

- Define expected location/contract for user-provided Unity iOS export/framework.
- Integrate `UnityFramework.framework` into example app.
- Implement runtime load/show/pause/unload controls.
- Forward app lifecycle.
- Implement JS-to-Unity messages and Unity-to-JS events.

Dependencies: MOD-008.

Acceptance criteria:

- Example iOS app can load Unity content.
- JS can send a message to Unity.
- Unity/native can emit an event to JS.
- Lifecycle behavior and Unity limitations are documented.

Required tests:

- `npx pod-install`.
- iOS simulator/device build where Unity export supports the target.
- Manual lifecycle test: load, background, foreground, unload.

Risk: `HIGH`

Commit: `d19aae2`

Implementation notes:

- Added an Expo Modules iOS runtime surface for `load`, `unload`, `pause`,
  `resume`, `sendMessage`, and `UnityShowView`.
- Added dynamic `UnityFramework.framework` discovery/loading so the package can
  compile without Unity headers or generated Unity artifacts in the npm package.
- Added C-callable symbols `UnityShowEmitReady`, `UnityShowEmitMessage`,
  `UnityShowEmitStateChange`, and `UnityShowEmitError` so Unity C# code can emit
  bridge events back to JavaScript on iOS.
- Added `docs/IOS_UNITY_INTEGRATION.md` with the expected Unity export layout,
  manual embedding contract, JS-to-Unity message mapping, Unity-to-JS callback
  examples, lifecycle behavior, and Unity limitations.
- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the
  package root.
- `yarn --cwd example tsc --noEmit` passes.
- `yarn --cwd example expo prebuild --platform ios --no-install` passes.
- `pod install` passes in `example/ios`.
- `xcodebuild -workspace UnityShowExample.xcworkspace -scheme UnityShowExample
  -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS
  Simulator' build` passes without a Unity export, validating that the package
  can compile in a modern Expo/RN iOS app.

Blocking condition:

- Runtime Unity validation is not complete because the repository does not
  contain a user-provided iOS Unity export with `UnityFramework.framework`. The
  remaining acceptance checks require a real Unity export and simulator/device
  smoke test: load Unity content, send JS-to-Unity message, emit Unity-to-JS
  event, and manually validate load/background/foreground/unload lifecycle.

## MOD-011 - Config plugin and Unity artifact integration workflow

Status: `DONE`

Branch: `feat/mod-011-expo-config-plugin-unity`

Problem: Expo prebuild/CNG will overwrite direct native project edits; Unity integration requires native project configuration.

Objective: Provide an Expo config plugin and documented Unity artifact workflow.

Likely files/components: plugin source, `app.plugin.js` or config plugin package files, example `app.json`, docs.

Proposed solution:

- Add a config plugin that wires required Android/iOS project settings where possible.
- Document user-supplied Unity exports and unsupported cases.
- Avoid committing large Unity build artifacts to npm.
- Add plugin tests using Expo config plugin test utilities if feasible.

Dependencies: MOD-009, MOD-010.

Acceptance criteria:

- Expo prebuild applies required native configuration.
- Example app can regenerate native projects without manual edits.
- Plugin options are documented.

Required tests:

- `npx expo prebuild --clean`.
- Config plugin unit tests/snapshots.
- Android/iOS build smoke tests.

Risk: `HIGH`

Commit: `176c8e7`

Implementation notes:

- Added `app.plugin.js` and `plugin/withUnityShow.js` as the package Expo
  config plugin entrypoint.
- Added plugin options for Android `unityLibrary` path/module name, iOS
  `UnityFramework.framework` path/podspec name, and
  `failOnMissingUnityExport`.
- Android prebuild now patches `settings.gradle` and `app/build.gradle`
  idempotently. The generated Gradle config includes `unityLibrary` only when
  the configured export path exists, so the example still builds without Unity
  artifacts.
- iOS prebuild now writes a local `UnityFramework.podspec` and patches the
  Podfile idempotently. The generated Podfile installs the Unity pod only when
  the configured framework path exists, so the example still builds without
  Unity artifacts.
- Added `docs/EXPO_CONFIG_PLUGIN.md` and linked it from the Android/iOS Unity
  integration docs and README.
- Added unit tests for option normalization, Android Gradle patching, iOS
  Podfile patching, podspec generation, idempotency, and Ruby string escaping.
- Updated `example/app.json` to enable the package config plugin with the
  default ignored Unity artifact paths.

Validation:

- `yarn install --ignore-scripts` updated the root lockfile.
- `yarn prepare`, `yarn typescript`, `yarn lint`, and `yarn test` pass from the
  package root.
- `yarn --cwd example expo prebuild --clean --no-install` applies the plugin and
  generates Android/iOS native projects.
- Generated Android files contain the expected `unityLibrary` wiring.
- Generated iOS files contain the expected conditional `UnityFramework` pod
  wiring and generated podspec.
- `./gradlew :app:assembleDebug --no-daemon` passes from `example/android`
  without a Unity export.
- `pod install` passes from `example/ios` without a Unity export.
- `xcodebuild -workspace UnityShowExample.xcworkspace -scheme UnityShowExample
  -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS
  Simulator' build` passes without a Unity export.

Remaining runtime limitation:

- The plugin has not been validated with real Unity Android/iOS exports because
  the repository intentionally does not contain generated Unity artifacts. That
  validation remains part of the end-to-end smoke sample/runtime tasks.

## MOD-012 - CI modernization and native validation

Status: `DONE`

Branch: `fix/mod-012-ci-native-validation`

Problem: CI only runs JS checks on Node 10 and does not validate native builds.

Objective: Add CI that validates the package and example on modern supported toolchains.

Likely files/components: `.circleci/config.yml` or replacement GitHub Actions workflow, package scripts, docs.

Proposed solution:

- Move CI to supported Node/JDK/Xcode/macOS/Android images.
- Run JS checks, package build, Android build, and iOS pod/build checks where available.
- Add caching based on committed lockfiles.
- Add a Unity integration smoke workflow if small fixture artifacts can be used.

Dependencies: MOD-003, MOD-005, MOD-009, MOD-010.

Acceptance criteria:

- CI passes for JS checks.
- CI validates at least Android native build.
- iOS validation exists where hosted macOS runner is available.
- CI documents any Unity artifact limitations.

Required tests:

- CI run on branch.
- Local equivalent scripts where possible.

Risk: `MEDIUM`

Commit: `1970eac`

Implementation notes:

- Added `.github/workflows/ci.yml` with separate package, Android generated
  build, and iOS generated build jobs.
- Added local CI scripts: `ci:js`, `ci:example:typecheck`, `ci:android`, and
  `ci:ios`.
- Added `docs/CI.md` documenting workflow coverage, local equivalents, and the
  current Unity artifact limitation.
- CI validates Expo CNG regeneration and native builds without checked-in Unity
  artifacts. Real Unity runtime smoke validation still requires private Unity
  exports.

Validation:

- `yarn ci:js` passes.
- `yarn ci:example:typecheck` passes.
- `yarn ci:android` passes when run outside the filesystem sandbox so Gradle can
  access `~/.gradle`.
- `yarn ci:ios` passes when run outside the filesystem sandbox so CocoaPods and
  Xcode can access their normal caches and build directories.

## MOD-013 - Deprecation/removal cleanup

Status: `TODO`

Branch: `fix/mod-013-deprecation-cleanup`

Problem: Migration will leave temporary compatibility paths and scaffold leftovers.

Objective: Remove obsolete APIs/files once the Unity bridge is functional.

Likely files/components: `src/`, `ios/`, `android/`, README, tests.

Proposed solution:

- Remove `multiply` if no longer useful as public API.
- Remove or replace `UnityShowUserAgent`.
- Remove stale native bridge modules if Expo Modules/New Architecture implementation replaces them.
- Remove stale generated/scaffold files and docs.

Dependencies: MOD-009, MOD-010, MOD-011.

Acceptance criteria:

- Public API contains only documented Unity bridge functionality.
- No obsolete bridge-only code remains unless intentionally documented.
- Tests and examples use the real Unity API.

Required tests:

- Full JS checks.
- Android/iOS example builds.
- Manual Unity bridge smoke tests.

Risk: `MEDIUM`

Commit: `TBD`
