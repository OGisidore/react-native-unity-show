# Modernization Audit

Date: 2026-09-10

## Repository Overview

`react-native-unity-show` is published as a React Native module for Unity, but the current repository does not contain a working Expo / React Native to Unity bridge.

The package is a `react-native-builder-bob` scaffold from the React Native 0.63 era. Its public JavaScript surface exposes:

- `multiply(a, b)`: calls a trivial native module method on Android and iOS.
- `getUserAgent()`: calls an iOS-only `UnityShowUserAgent` module that creates a `WKWebView` and reads `navigator.userAgent`.

The README shows `UnityShowView`, but no such export exists in `src/index.tsx`. The Android package returns an empty `createViewManagers()` list, and iOS has no native view manager. There are no Unity artifacts, no `UnityPlayer`, no `UnityFramework`, no exported Unity Android project, no CocoaPods integration for Unity, no config plugin, and no end-to-end Unity message path.

## Current Architecture

### JavaScript / TypeScript

- Entry point: `src/index.tsx`.
- Uses `NativeModules` from `react-native` directly.
- Creates runtime proxies that throw a linking error if `UnityShow` or `UnityShowUserAgent` is missing.
- Exports only `multiply()` and `getUserAgent()`.
- Does not export a native component, event emitter, commands API, or typed bridge contract.
- TypeScript config targets `esnext`, JSX `react`, and uses older options such as `importsNotUsedAsValues`.

### Android

- Library source is under `android/src/main/java/com/reactnativeunityshow`.
- `UnityShowModule` extends `ReactContextBaseJavaModule`.
- `UnityShowPackage` implements legacy `ReactPackage`.
- `createNativeModules()` manually instantiates `UnityShowModule`.
- `createViewManagers()` returns `Collections.emptyList()`.
- Android build uses AGP `3.5.3`, `compileSdkVersion` 29, `targetSdkVersion` 29, `minSdkVersion` 16, Java 8, `jcenter()`, and dynamic `implementation "com.facebook.react:react-native:+"`.
- There is no Kotlin, no React Native Gradle Plugin setup, no Codegen config, no Fabric component, no TurboModule spec, and no Unity Android `unityLibrary` module.

### iOS

- Package podspec: `react-native-unity-show.podspec`.
- `UnityShow.m` implements a legacy Objective-C `RCTBridgeModule` with only `multiply`.
- `UnityShowUserAgent.m` implements a second legacy `RCTBridgeModule` with constants and `getWebViewUserAgent`.
- Podspec declares iOS 12.0 and depends only on `React-Core`.
- `ios/UnityShow.xcodeproj` still has deployment target 8.0, which conflicts with the podspec and modern RN/Expo baselines.
- There is no `RCTViewManager`, no Swift module, no Expo module, no `UnityFramework.framework` embedding, no workspace integration with an exported Unity iOS project, and no lifecycle forwarding.

### Example App

- Example app is a plain React Native 0.63.4 app, not an Expo app.
- `example/src/App.tsx` calls only `multiply(3, 7)`.
- Android example uses Gradle 6.2 and AGP 3.5.3, `jcenter()`, legacy `react.gradle`, Hermes disabled, and Flipper 0.80-era wiring.
- iOS example uses a RN 0.63 Podfile with iOS 10.0 and Flipper.
- The example does not prove Unity rendering, Unity lifecycle, or bidirectional messages.

### CI/CD And Publishing

- CI is CircleCI using `circleci/node:10`.
- Jobs install dependencies, lint, typecheck, test, and run `yarn prepare`.
- No Android or iOS native build is executed in CI.
- No Unity export/build validation exists.
- Publishing uses `release-it` with npm and GitHub releases.
- No lockfile is present, but CI uses `--frozen-lockfile`, which is unreliable without committed lockfiles.

## Technology Inventory

Detected versions in repository:

| Area | Current repository state |
| --- | --- |
| React Native | `0.63.4` dev/example dependency |
| React | `16.13.1` |
| TypeScript | `^4.1.3` |
| Jest | `^26.0.1` |
| ESLint | `^7.2.0` with `@react-native-community/eslint-config` |
| Builder | `react-native-builder-bob ^0.18.0` |
| Release tooling | `release-it ^14.2.2` |
| Android Gradle Plugin | `3.5.3` |
| Gradle wrapper | `6.2` |
| Android SDK | compile/target 29, min 16 |
| Android language | Java 8 |
| iOS podspec target | iOS 12.0 |
| iOS Xcode project target | iOS 8.0 |
| Example iOS target | iOS 10.0 |
| Expo | No Expo dependency, no Expo module config, no config plugin |
| Unity | No Unity runtime integration present |
| Tests | Placeholder `it.todo` only |

Current registry versions checked during audit:

| Package | Latest observed version |
| --- | --- |
| `react-native` | `0.87.1` |
| `expo` | `57.0.21` |
| `react-native-builder-bob` | `0.43.1` |
| `typescript` | `7.0.2` |
| `jest` | `30.5.1` |
| `eslint` | `10.10.0` |
| `release-it` | `21.0.2` |

## Outdated Components

- React Native 0.63.4 and React 16.13.1 are far behind the current RN/Expo baseline.
- CircleCI Node 10 is obsolete for current React Native, Expo, TypeScript, and many npm packages.
- Android AGP 3.5.3, Gradle 6.2, SDK 29, Java 8 baseline, `jcenter()`, and dynamic React Native dependency are obsolete.
- iOS deployment targets are inconsistent and too old for current Expo SDK baselines.
- Legacy native module style is still used on both platforms.
- No New Architecture, TurboModule, Fabric, JSI, or Codegen integration exists.
- The README documents an API that does not exist.
- There are no real tests, no native build validation, and no Unity fixtures.
- `UnityShowUserAgent` contains a hard-coded legacy iOS model map that stops around iPhone 11-era devices and should not be maintained in this package.

## Compatibility Problems

### React Native

Modern React Native projects use the New Architecture by default, and recent releases are actively removing legacy architecture internals. A native Unity view should not be designed as a legacy-only `NativeModules` wrapper.

Concrete issues:

- Current Android/iOS modules are legacy bridge modules.
- No typed spec exists for Codegen.
- No Fabric native component exists for a Unity view.
- `NativeModules` direct access provides weak typing and no New Architecture contract.
- Android `int` arguments in `@ReactMethod` are specifically called out by RN legacy docs as types to avoid for TurboModule migration.
- Example app cannot validate modern RN because it is locked to RN 0.63 templates.

### Expo

The package is not compatible with Expo managed workflows as-is. The current error message explicitly says the user is not using Expo managed workflow. That is accurate for the current package, but incompatible with the project goal.

Modern Expo compatibility requires at least:

- an Expo Modules API implementation, or a well-supported RN New Architecture implementation;
- `expo-module.config.json`;
- Kotlin and Swift module definitions if using Expo Modules API;
- config plugins for native project changes that cannot be handled by autolinking;
- development builds/EAS builds for custom native Unity runtime code.

### Android

Concrete issues:

- AGP 3.5.3 cannot be treated as a viable base for current RN/Expo/Android builds.
- Gradle wrapper 6.2 is incompatible with modern AGP lines.
- `compileSdkVersion` and `targetSdkVersion` 29 are too old for current Android/Expo baselines.
- `minSdkVersion` 16 is below modern React Native and Expo expectations.
- `jcenter()` should be removed.
- Dynamic `com.facebook.react:react-native:+` should be replaced by the modern React Native dependency pattern expected by the RN Gradle Plugin.
- A real Unity Android integration requires including Unity's exported `unityLibrary` module or consuming an AAR/exported artifact, with lifecycle, activity, memory, ABI, and Gradle configuration handled explicitly.

### iOS

Concrete issues:

- Objective-C legacy modules compile today only through compatibility layers; they are not a future-proof basis for a Unity view.
- iOS target values are inconsistent: podspec 12.0, library project 8.0, example Podfile 10.0.
- Modern Expo SDK 56 requires iOS 16.4+ and Xcode 26.4+; SDK 57 builds on that line.
- Unity iOS integration requires `UnityFramework.framework` from an exported Unity project, embedded in the host app target.
- Unity as a Library has important limitations: one Unity runtime, full-screen rendering only according to Unity docs, lifecycle ownership stays with the host app, and plugins may need adaptation.

### Unity

Concrete issues:

- The package contains no Unity runtime integration at all.
- Unity as a Library is the modern official integration model from Unity 2019.3 onward.
- Android integration must account for `UnityPlayer`, `IUnityPlayerLifecycleEvents`, exported Gradle module structure, ABIs, manifests, resources, and memory management.
- iOS integration must account for `UnityFramework`, workspace composition, framework embedding, app lifecycle, and message forwarding.
- Bidirectional messaging must be designed explicitly:
  - React Native / Expo to Unity: load/show/unload/pause, send message to GameObject/function/payload.
  - Unity to native to JS: event emitter with lifecycle and message events.

## Architecture Risks

- The repository name and README imply a Unity view, but the code does not contain one. Modernization is therefore a product/architecture implementation, not only dependency maintenance.
- A partial update that keeps only legacy `RCTBridgeModule` APIs will remain fragile as RN removes more legacy internals.
- A Unity runtime cannot behave like an ordinary reusable RN view in all cases. Unity's own docs state limitations around full-screen rendering and single runtime instances.
- Expo Go cannot load arbitrary custom native Unity code. Expo support must be framed around development builds / prebuild / EAS, not Expo Go.
- Packaging Unity artifacts inside an npm package may create very large packages and platform-specific build fragility. The package should likely support user-supplied Unity exports instead of publishing Unity binaries by default.
- Tests need to move beyond JS unit tests. Native build tests and fixture apps are required because most risks are in native integration.
- iOS and Android will likely need different internal implementations under one JS API because Unity's platform integration models differ significantly.

## Recommended Modern Architecture

### Keep / Update

- Keep the npm package as a React Native library.
- Keep `react-native-builder-bob`, but upgrade to a current version and regenerate the package layout.
- Keep a small JS/TS entrypoint, but replace the current untyped `NativeModules` usage with typed module/view wrappers.
- Keep a simple example app, but regenerate it on a current Expo/RN baseline.
- Keep `multiply` only as a temporary compatibility check during migration, then remove or move it to tests before a stable release.

### Migrate

- Migrate package metadata, CI, linting, TypeScript, Jest, and builder configuration to current tooling.
- Migrate Android build files to the React Native Gradle Plugin era and current Android SDK values.
- Migrate iOS podspec/project settings to a consistent modern deployment target.
- Migrate native APIs to a typed contract:
  - Expo Modules API is recommended for Expo-first support, because it uses Swift/Kotlin, supports native views, supports New Architecture, and remains backward-compatible with existing RN apps.
  - If low-level C++/JSI access becomes necessary, implement a TurboModule/Fabric path instead.

### Rewrite

- Rewrite Android native code in Kotlin around an Expo Module or New Architecture RN module.
- Rewrite iOS native code in Swift around an Expo Module or New Architecture RN module.
- Implement a real native view/controller that owns Unity presentation and lifecycle.
- Implement event delivery from Unity/native to JS.
- Implement command APIs from JS to Unity.
- Replace `UnityShowUserAgent` with either no API or a narrow platform utility only if a Unity use case requires it.

### Remove

- Remove misleading README examples until a real `UnityShowView` exists.
- Remove stale Xcode project files if CocoaPods/autolinking no longer requires them.
- Remove `jcenter()`, Flipper legacy wiring, Node 10 CI, and placeholder tests.
- Remove dynamic Android dependency versions.
- Remove legacy device model mapping from `UnityShowUserAgent` unless a documented compatibility requirement exists.

## Research References

### React Native release status and New Architecture

- Title: React Native Versions
  URL: https://reactnative.dev/versions
  Technology: React Native
  Relevance: Establishes the current documented latest version line. Used to compare repository RN 0.63.4 with current RN 0.87.

- Title: Releases Overview
  URL: https://reactnative.dev/docs/0.83/releases
  Technology: React Native
  Relevance: Shows RN's release cadence and active/unsupported lines. Supports treating RN 0.63.4 as far outside current support.

- Title: About the New Architecture
  URL: https://reactnative.dev/architecture/landing-page
  Technology: React Native New Architecture
  Relevance: Documents that New Architecture is enabled by default from RN 0.76 and how apps opt out. Used to assess compatibility risk.

- Title: New Architecture is here
  URL: https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
  Technology: TurboModules, Fabric, New Architecture
  Relevance: Explains that the new native module/component systems provide type-safe direct native interfaces without the legacy bridge.

- Title: React Native 0.82 - A New Era
  URL: https://reactnative.dev/blog/2025/10/08/react-native-0.82
  Technology: React Native, Hermes, New Architecture
  Relevance: Documents the transition to RN running entirely on the New Architecture and continuing removal of legacy paths.

- Title: React Native 0.84 - Hermes V1 by Default
  URL: https://reactnative.dev/blog/2026/02/11/react-native-0.84
  Technology: React Native, Hermes, Legacy Architecture removal
  Relevance: Documents further removal of legacy classes and Node.js 22 minimum.

- Title: React Native 0.87 - Strict TypeScript API, Metro Update, Swift Package Manager, AGP 9 Support
  URL: https://reactnative.dev/blog/2026/08/11/react-native-0.87
  Technology: React Native, TypeScript, AGP, SwiftPM
  Relevance: Establishes current RN 0.87 toolchain direction: Node 22, AGP 9, Kotlin 2.0+, strict TS API, and SwiftPM experimentation.

- Title: Native Platform
  URL: https://reactnative.dev/docs/next/native-platform
  Technology: React Native native modules/components
  Relevance: States that legacy native modules/components are deprecated and recommends Turbo Native Modules or Fabric Native Components.

- Title: Android Native Modules
  URL: https://reactnative.dev/docs/legacy/native-modules-android
  Technology: Legacy native modules, TurboModule migration
  Relevance: Documents the current legacy-module API and warns about types not supported by TurboModules.

- Title: Native Modules: Introduction
  URL: https://reactnative.dev/docs/turbo-native-modules-introduction
  Technology: TurboModules, Codegen
  Relevance: Defines the modern TurboModule workflow: typed JS spec, dependency config for Codegen, native implementation.

- Title: Fabric Native Components Introduction
  URL: https://reactnative.dev/docs/next/fabric-native-components-introduction
  Technology: Fabric, Codegen
  Relevance: Defines the modern native component workflow needed for a Unity view.

- Title: What is Codegen?
  URL: https://reactnative.dev/docs/the-new-architecture/what-is-codegen
  Technology: React Native Codegen
  Relevance: Explains how Codegen discovers typed specs and generates native scaffolding for TurboModules/Fabric.

### Expo and Expo Modules

- Title: Expo SDK 57
  URL: https://expo.dev/changelog/sdk-57
  Technology: Expo SDK, React Native
  Relevance: Establishes current Expo SDK 57 and its React Native 0.86 basis.

- Title: Expo SDK reference
  URL: https://docs.expo.dev/versions/v56.0.0/
  Technology: Expo SDK, platform baselines
  Relevance: Provides Expo SDK/RN mapping and platform baselines for SDK 56: RN 0.85, Android compile/target 36, iOS 16.4+, Xcode 26.4+.

- Title: Expo Modules API: Overview
  URL: https://docs.expo.dev/modules/overview/
  Technology: Expo Modules API
  Relevance: Documents Expo Modules API as Swift/Kotlin, low-boilerplate, New Architecture-compatible, and backward-compatible with old RN apps.

- Title: Module API Reference
  URL: https://docs.expo.dev/modules/module-api/
  Technology: Expo Modules API, JSI, native views
  Relevance: Documents `Module`, `View`, events, properties, async functions, and `requireNativeModule`/native view mechanisms.

- Title: Integrate in an existing library
  URL: https://docs.expo.dev/modules/existing-library/
  Technology: Expo Modules API, autolinking
  Relevance: Shows how to add Expo Modules classes and `expo-module.config.json` to an existing package.

- Title: Tutorial: Create a native view
  URL: https://docs.expo.dev/modules/native-view-tutorial/
  Technology: Expo native views
  Relevance: Gives the concrete Expo Modules pattern for exporting a native view to JS.

- Title: Add custom native code
  URL: https://docs.expo.dev/workflow/customizing/
  Technology: Expo development builds, custom native code
  Relevance: Clarifies that custom native code requires development builds and that Expo Modules API is the recommended way to write native code.

### Android build system

- Title: About Android Gradle Plugin
  URL: https://developer.android.com/build/releases/about-agp
  Technology: Android Gradle Plugin, Gradle
  Relevance: Provides AGP-to-Gradle compatibility table. Used to identify AGP 3.5.3/Gradle 6.2 as obsolete and plan modern AGP migration.

- Title: Android Gradle plugin 9.0.1 release notes
  URL: https://developer.android.com/build/releases/agp-9-0-0-release-notes
  Technology: Android Gradle Plugin 9, JDK, SDK
  Relevance: Documents AGP 9 compatibility, JDK 17, Gradle 9.1+, SDK build tools 36, and variant API changes.

- Title: Java versions in Android builds
  URL: https://developer.android.com/build/jdks
  Technology: Android, JDK, Gradle
  Relevance: Documents JDK selection and recommends explicit Java toolchains; notes AGP 8 requires JDK 17.

- Title: Set up the Android 16 SDK
  URL: https://developer.android.com/about/versions/16/setup-sdk
  Technology: Android SDK
  Relevance: Documents compileSdk/targetSdk 36 for Android 16.

- Title: SDK Platform release notes
  URL: https://developer.android.com/tools/releases/platforms
  Technology: Android SDK
  Relevance: Confirms Android 16 API level 36 and recent SDK platform state.

- Title: Configure a Gradle project
  URL: https://kotlinlang.org/docs/gradle-configure-project.html
  Technology: Kotlin Gradle Plugin
  Relevance: Provides Kotlin Gradle Plugin compatibility with Gradle and AGP versions for Kotlin-based native modules.

### Unity

- Title: Using Unity as a Library in other applications
  URL: https://docs.unity3d.com/Manual/UnityasaLibrary.html
  Technology: Unity as a Library
  Relevance: Establishes Unity as a Library as the official model for embedding Unity runtime/content in native apps from Unity 2019.3 onward.

- Title: Integrating Unity into Android applications
  URL: https://docs.unity3d.com/6000.0/Manual/UnityasaLibrary-Android.html
  Technology: Unity Android integration
  Relevance: Documents Android Unity as a Library concepts, lifecycle events, and limitations.

- Title: Integrating Unity into native iOS applications
  URL: https://docs.unity3d.com/6000.0/Manual/UnityasaLibrary-iOS.html
  Technology: Unity iOS integration
  Relevance: Documents `UnityFramework.framework`, `UnityFramework` runtime control, and workspace/framework embedding requirements.

- Title: Gradle for Android
  URL: https://docs.unity3d.com/Manual/android-gradle-overview.html
  Technology: Unity Android export
  Relevance: Documents Unity exported Gradle project structure with `unityLibrary` and launcher modules.

- Title: Structure of a Unity Xcode Project
  URL: https://docs.unity3d.com/Manual/StructureOfXcodeProject.html
  Technology: Unity iOS export
  Relevance: Documents Unity iOS project structure changes around `UnityFramework` target.
