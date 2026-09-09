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

Planned Unity bridge work is tracked in:

- [`docs/MODERNIZATION_AUDIT.md`](docs/MODERNIZATION_AUDIT.md)
- [`docs/MODERNIZATION_TASKS.md`](docs/MODERNIZATION_TASKS.md)

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

`UnityShowView` is not currently exported. It is part of the planned
modernization work and should not be considered available until the native Unity
integration tasks are complete.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
