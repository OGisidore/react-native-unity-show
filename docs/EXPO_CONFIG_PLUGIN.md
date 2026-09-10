# Expo Config Plugin

`react-native-unity-show` includes an Expo config plugin for Continuous Native
Generation projects.

## Usage

Add the plugin to `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      "expo-dev-client",
      [
        "react-native-unity-show",
        {
          "android": {
            "unityLibraryPath": "../unity/android/unityLibrary",
            "unityLibraryModuleName": "unityLibrary"
          },
          "ios": {
            "unityFrameworkPath": "../unity/ios/UnityFramework.framework",
            "unityPodspecName": "UnityFramework"
          },
          "failOnMissingUnityExport": false
        }
      ]
    ]
  }
}
```

Paths are resolved by the native build systems relative to the generated native
project directories:

- Android paths are relative to `android/settings.gradle`.
- iOS paths are relative to `ios/Podfile`.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `android.unityLibraryPath` | `../unity/android/unityLibrary` | Path to Unity's Android `unityLibrary` export. |
| `android.unityLibraryModuleName` | `unityLibrary` | Gradle project name used for the Unity library. |
| `ios.unityFrameworkPath` | `../unity/ios/UnityFramework.framework` | Path to Unity's iOS `UnityFramework.framework`. |
| `ios.unityPodspecName` | `UnityFramework` | Local CocoaPods pod name generated for the Unity framework. |
| `failOnMissingUnityExport` | `false` | When true, native builds fail if the Unity export is not present. |

## Android Behavior

The plugin patches `android/settings.gradle` and `android/app/build.gradle`.

If `android.unityLibraryPath` exists, Gradle includes it as a project and the app
adds `implementation project(':unityLibrary')`. If the export is missing and
`failOnMissingUnityExport` is false, Gradle logs a lifecycle message and
continues so the Expo app can still build without Unity.

## iOS Behavior

The plugin writes `ios/UnityFramework.podspec` and patches `ios/Podfile`.

If `ios.unityFrameworkPath` exists, CocoaPods installs the generated
`UnityFramework` pod using the local podspec. If the framework is missing and
`failOnMissingUnityExport` is false, CocoaPods logs a message and continues so
the Expo app can still build without Unity.

## Artifact Policy

Unity exports are intentionally not committed or published with the npm package.
Keep them in an ignored local directory such as:

```text
example/
  unity/
    android/
      unityLibrary/
    ios/
      UnityFramework.framework/
```

Use a private artifact store or a separate build step for production Unity
exports.
