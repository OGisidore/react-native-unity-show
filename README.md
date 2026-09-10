# react-native-unity-show

React Native native module groundwork for a Unity bridge.

## Modernization status

This repository is under active modernization. The package name and original
README describe a Unity integration goal, but the current published code does
not yet expose a Unity view or a complete React Native / Expo to Unity bridge.

Current implemented APIs:

- `multiply(a, b)`: native-module smoke test available on Android and iOS.
- `getUserAgent()`: iOS native-module helper that resolves a `WKWebView` user
  agent string.

Current Unity bridge contract exports:

- `UnityShowView`
- `loadUnity(source?)`
- `unloadUnity()`
- `pauseUnity()`
- `resumeUnity()`
- `sendMessage(message)`
- `addUnityEventListener(eventName, listener)`

These Unity bridge APIs are typed and documented, but the native Unity runtime
implementation is still pending. Rendering `UnityShowView` or calling Unity
commands before the Android/iOS Unity integration is complete will fail with an
explicit implementation error.

Planned Unity bridge work is tracked in:

- [`docs/MODERNIZATION_AUDIT.md`](docs/MODERNIZATION_AUDIT.md)
- [`docs/MODERNIZATION_TASKS.md`](docs/MODERNIZATION_TASKS.md)
- [`docs/UNITY_BRIDGE_API.md`](docs/UNITY_BRIDGE_API.md)

## Installation

```sh
npm install react-native-unity-show
```

## Usage

```ts
import { multiply, getUserAgent } from 'react-native-unity-show';

const result = await multiply(3, 7);
const userAgent = await getUserAgent();
```

See [`docs/UNITY_BRIDGE_API.md`](docs/UNITY_BRIDGE_API.md) for the target Unity
bridge API contract. The Unity runtime implementation is planned separately for
Android and iOS.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
