# Android Unity Integration

This package does not ship Unity build output. Host applications must provide a
Unity Android export and wire it into the native Android project.

## Current Status

The Android bridge uses the Expo Modules API and loads Unity by reflection:

- The package compiles without Unity classes on the classpath.
- If `com.unity3d.player.UnityPlayer` is available at runtime, the bridge can
  create and attach it.
- If Unity is not available, the bridge rejects commands with a coded runtime
  error and view rendering emits an error event.

This keeps npm package size reasonable and avoids publishing generated Unity
artifacts.

## Unity Export Contract

Use Unity's Android Gradle export with Unity as a Library. Unity's generated
project contains:

- `unityLibrary`: the reusable library module that contains Unity runtime and
  player data.
- `launcher`: a thin app module that can be replaced by the React Native / Expo
  application.

The host app must include the generated `unityLibrary` module in Gradle. For
Expo CNG apps, use the config plugin documented in
[`EXPO_CONFIG_PLUGIN.md`](EXPO_CONFIG_PLUGIN.md).

Recommended local layout for the example app:

```text
example/
  unity/
    android/
      unityLibrary/
      launcher/
```

`example/unity/` is ignored by Git.

## JavaScript to Unity

`sendMessage()` maps to Unity's static Android player API:

```ts
await sendMessage({
  gameObject: 'Bridge',
  methodName: 'ReceiveMessage',
  payload: {
    score: 21,
  },
});
```

The Android bridge calls:

```text
UnityPlayer.UnitySendMessage(gameObject, methodName, payloadString)
```

String payloads are forwarded as-is. Object and array payloads are serialized to
JSON.

## Unity to JavaScript

Unity C# code can emit events through the Android bridge:

```csharp
using UnityEngine;

public class ReactNativeBridge : MonoBehaviour
{
    public void EmitReady()
    {
        using var bridge = new AndroidJavaClass("com.reactnativeunityshow.UnityShowEventBus");
        bridge.CallStatic("emitReady", Application.unityVersion);
    }

    public void EmitMessage(string name, string jsonPayload)
    {
        using var bridge = new AndroidJavaClass("com.reactnativeunityshow.UnityShowEventBus");
        bridge.CallStatic("emitMessage", name, jsonPayload);
    }

    public void EmitError(string code, string message)
    {
        using var bridge = new AndroidJavaClass("com.reactnativeunityshow.UnityShowEventBus");
        bridge.CallStatic("emitError", code, message, true);
    }
}
```

JavaScript receives these via:

```ts
const subscription = addUnityEventListener('message', (event) => {
  console.log(event.name, event.payload);
});
```

## Lifecycle

The Android module exposes:

- `loadUnity(source?)`
- `pauseUnity()`
- `resumeUnity()`
- `unloadUnity()`

The Expo module also forwards activity background/foreground/destroy events to
the Unity runtime when Unity has been loaded.

## Unity Limitations

Unity as a Library has important Android constraints:

- Unity rendering is designed for full-screen use.
- Only one Unity runtime instance can be loaded in a process.
- Third-party native or managed Unity plugins may need adaptation.
- Unity runtime cannot be shipped as a Play Feature Delivery dynamic module.

The React Native view contract exists for ergonomic composition, but product
integrations should treat Unity as a single full-screen/native surface unless a
specific Unity version and license tier proves a narrower embedded layout is
supported.

## References

- Unity Manual: Integrating Unity into Android applications  
  https://docs.unity3d.com/Manual/UnityasaLibrary-Android.html  
  Relevant because it defines the generated `unityLibrary` module, lifecycle
  callbacks, UnityPlayer control APIs, and Android limitations.
- Unity Manual: Using Unity as a Library in other applications  
  https://docs.unity3d.com/2023.1/Documentation/Manual/UnityasaLibrary.html  
  Relevant because it documents platform support, single-runtime constraints,
  unload memory behavior, and the Unity 2019.3+ baseline for Unity as a Library.
