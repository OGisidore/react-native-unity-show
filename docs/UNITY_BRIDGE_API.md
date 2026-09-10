# Unity Bridge API Contract

This document defines the public JavaScript/TypeScript API that the native Unity
integration must implement. The contract is exported by the package before the
platform Unity runtimes are implemented, so consumers can review and type-check
against the target API early.

Native Unity runtime support is still pending:

- Android implementation: MOD-009.
- iOS implementation: MOD-010.
- End-to-end Unity sample: MOD-011.

Until those tasks are complete, Unity commands throw a clear "native Unity
runtime implementation is not available yet" error, and `UnityShowView` throws if
no native view manager is registered.

## Exports

Runtime exports:

- `UnityShowView`: React component contract for embedding Unity content.
- `loadUnity(source?)`: prepares or loads Unity content.
- `unloadUnity()`: unloads Unity content.
- `pauseUnity()`: pauses Unity runtime rendering/execution.
- `resumeUnity()`: resumes Unity runtime rendering/execution.
- `sendMessage(message)`: sends a typed message from React Native to Unity.
- `addUnityEventListener(eventName, listener)`: subscribes to Unity bridge
  events.
- `multiply(a, b)`: temporary native smoke-test API.
- `getUserAgent()`: temporary iOS WebKit helper retained for compatibility.

Type exports:

- `UnityShowViewProps`
- `UnityShowViewRef`
- `UnityShowSource`
- `UnityShowMessage`
- `UnityShowJSONValue`
- `UnityShowLifecycleState`
- `UnityShowReadyEvent`
- `UnityShowMessageEvent`
- `UnityShowStateChangeEvent`
- `UnityShowErrorEvent`
- `UnityShowEventMap`
- `UnityShowEventName`
- `UnityShowEventSubscription`

## View Contract

```tsx
import { UnityShowView, type UnityShowViewRef } from 'react-native-unity-show';

const unityRef = React.useRef<UnityShowViewRef>(null);

<UnityShowView
  ref={unityRef}
  source={{
    projectId: 'default',
    initialScene: 'Main',
    launchOptions: {
      locale: 'en-US',
    },
  }}
  onReady={(event) => {
    console.log(event.unityVersion);
  }}
  onMessage={(event) => {
    console.log(event.name, event.payload);
  }}
  onStateChange={(event) => {
    console.log(event.state);
  }}
  onError={(event) => {
    console.error(event.code, event.message);
  }}
/>;
```

`UnityShowViewProps` intentionally avoids platform-specific paths or framework
names. Platform-specific Unity library discovery and packaging belong in the
native implementation and Expo config plugin tasks.

## Message Contract

```ts
import { sendMessage, type UnityShowMessage } from 'react-native-unity-show';

const message: UnityShowMessage = {
  gameObject: 'Bridge',
  methodName: 'ReceiveMessage',
  payload: {
    score: 21,
  },
};

await sendMessage(message);
```

`payload` must be JSON-compatible. The native layer is responsible for encoding
the payload into the format required by Unity.

## Lifecycle Contract

```ts
import {
  loadUnity,
  pauseUnity,
  resumeUnity,
  unloadUnity,
} from 'react-native-unity-show';

await loadUnity({ projectId: 'default', initialScene: 'Main' });
await pauseUnity();
await resumeUnity();
await unloadUnity();
```

Lifecycle commands are global in the initial contract. If platform work proves
that multiple Unity views can be supported safely, the contract can be narrowed
or extended before a stable Unity release.

## Event Contract

```ts
import { addUnityEventListener } from 'react-native-unity-show';

const subscription = addUnityEventListener('message', (event) => {
  console.log(event.name, event.payload);
});

subscription.remove();
```

Supported event names:

- `ready`
- `message`
- `stateChange`
- `error`

Native implementations must emit these event payloads consistently on Android
and iOS.

## Compatibility Notes

- Expo Modules API is the primary native module path.
- The legacy `NativeModules.UnityShow` path remains as a fallback while the
  repository is migrating.
- The API is additive relative to the existing `multiply` and `getUserAgent`
  exports.
- `multiply` and `getUserAgent` are transitional APIs and should not be treated
  as part of the final Unity bridge surface.
