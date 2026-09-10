# CI

The repository now has GitHub Actions coverage for the package and generated
Expo example projects.

## Workflow

`.github/workflows/ci.yml` runs:

- package checks on Ubuntu with Node 22.13;
- Expo example typechecking;
- Android Expo prebuild plus `:app:assembleDebug` with JDK 17 and the Expo/RN
  Android toolchain;
- iOS Expo prebuild plus `pod install` and an iOS simulator Xcode build on
  `macos-latest`.

The native jobs validate the package without generated Unity artifacts. The Expo
config plugin conditionally wires Unity exports when they exist and lets the
example build without Unity when they do not.

## Local Commands

Run the same validation entrypoints locally:

```sh
yarn ci:js
yarn ci:example:typecheck
yarn ci:android
yarn ci:ios
```

`ci:android` and `ci:ios` generate ignored native projects under `example/`.
Remove `example/android` and `example/ios` after local runs if you want a clean
working tree.

## Unity Runtime Validation

CI does not currently run a real Unity runtime smoke test because the repository
does not contain Unity exports. A production CI setup should fetch private Unity
artifacts before the Android/iOS native jobs and set the config plugin paths to
those artifacts.
