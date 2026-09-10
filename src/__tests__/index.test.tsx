function loadModule({
  nativeModules = {},
  expoModule = null,
  os = 'ios',
  viewManagerConfig = null,
}: {
  nativeModules?: Record<string, unknown>;
  expoModule?: unknown;
  os?: string;
  viewManagerConfig?: unknown;
} = {}) {
  jest.resetModules();

  const expoSubscription = {
    remove: jest.fn(),
  };
  const nativeSubscription = {
    remove: jest.fn(),
  };
  const expoAddListener = jest.fn(() => expoSubscription);
  const nativeAddListener = jest.fn(() => nativeSubscription);

  jest.doMock('react-native', () => ({
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: nativeAddListener,
    })),
    NativeModules: nativeModules,
    Platform: {
      OS: os,
      select: (options: Record<string, string>) =>
        options[os] ?? options.default,
    },
    requireNativeComponent: jest.fn(() => 'UnityShowView'),
    UIManager: {
      getViewManagerConfig: jest.fn(() => viewManagerConfig),
    },
  }));
  jest.doMock('expo-modules-core', () => ({
    EventEmitter: jest.fn().mockImplementation(() => ({
      addListener: expoAddListener,
    })),
    requireOptionalNativeModule: jest.fn(() => expoModule),
  }));

  return {
    mocks: {
      expoAddListener,
      expoSubscription,
      nativeAddListener,
      nativeSubscription,
    },
    native: require('../index'),
  };
}

describe('react-native-unity-show public API', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('expo-modules-core');
  });

  it('delegates multiply to the Expo module when available', async () => {
    const multiplyNative = jest.fn().mockResolvedValue(21);
    const {
      native: { multiply },
    } = loadModule({
      expoModule: {
        multiply: multiplyNative,
      },
    });

    await expect(multiply(3, 7)).resolves.toBe(21);
    expect(multiplyNative).toHaveBeenCalledWith(3, 7);
  });

  it('falls back from the Expo module to the UnityShow native module', async () => {
    const multiplyNative = jest.fn().mockResolvedValue(21);
    const {
      native: { multiply },
    } = loadModule({
      nativeModules: {
        UnityShow: {
          multiply: multiplyNative,
        },
      },
    });

    await expect(multiply(3, 7)).resolves.toBe(21);
    expect(multiplyNative).toHaveBeenCalledWith(3, 7);
  });

  it('delegates getUserAgent to the UnityShowUserAgent native module', async () => {
    const getWebViewUserAgent = jest.fn().mockResolvedValue('ExampleUserAgent');
    const {
      native: { getUserAgent },
    } = loadModule({
      nativeModules: {
        UnityShowUserAgent: {
          getWebViewUserAgent,
        },
      },
    });

    await expect(getUserAgent()).resolves.toBe('ExampleUserAgent');
    expect(getWebViewUserAgent).toHaveBeenCalledTimes(1);
  });

  it('throws a linking error when UnityShow is missing', () => {
    const {
      native: { multiply },
    } = loadModule();

    expect(() => multiply(3, 7)).toThrow(
      "The package 'react-native-unity-show' doesn't seem to be linked."
    );
  });

  it('exports the Unity bridge component contract', () => {
    const {
      native: { UnityShowView },
    } = loadModule();

    expect(UnityShowView).toBeTruthy();
  });

  it('delegates Unity messages to the Expo module when implemented', async () => {
    const sendMessageNative = jest.fn().mockResolvedValue(undefined);
    const {
      native: { sendMessage },
    } = loadModule({
      expoModule: {
        multiply: jest.fn(),
        sendMessage: sendMessageNative,
      },
    });
    const message = {
      gameObject: 'Bridge',
      methodName: 'ReceiveMessage',
      payload: {
        score: 21,
      },
    };

    await expect(sendMessage(message)).resolves.toBeUndefined();
    expect(sendMessageNative).toHaveBeenCalledWith(message);
  });

  it('delegates Unity lifecycle commands to the legacy native module', async () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const pause = jest.fn().mockResolvedValue(undefined);
    const resume = jest.fn().mockResolvedValue(undefined);
    const unload = jest.fn().mockResolvedValue(undefined);
    const {
      native: { loadUnity, pauseUnity, resumeUnity, unloadUnity },
    } = loadModule({
      nativeModules: {
        UnityShow: {
          multiply: jest.fn(),
          load,
          pause,
          resume,
          unload,
        },
      },
    });
    const source = {
      projectId: 'default',
      initialScene: 'Main',
    };

    await expect(loadUnity(source)).resolves.toBeUndefined();
    await expect(pauseUnity()).resolves.toBeUndefined();
    await expect(resumeUnity()).resolves.toBeUndefined();
    await expect(unloadUnity()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledWith(source);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(unload).toHaveBeenCalledTimes(1);
  });

  it('subscribes to Unity events through the Expo event emitter', () => {
    const listener = jest.fn();
    const {
      mocks: { expoAddListener, expoSubscription },
      native: { addUnityEventListener },
    } = loadModule({
      expoModule: {
        multiply: jest.fn(),
      },
    });

    const subscription = addUnityEventListener('message', listener);
    const firstExpoListenerCall = expoAddListener.mock.calls[0] as unknown as
      | [string, (event: unknown) => void]
      | undefined;
    const forwardedListener = firstExpoListenerCall?.[1] as
      | ((event: unknown) => void)
      | undefined;
    forwardedListener?.({
      name: 'received',
      payload: 'ok',
    });

    expect(expoAddListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
    expect(listener).toHaveBeenCalledWith({
      name: 'received',
      payload: 'ok',
    });
    expect(subscription).toBe(expoSubscription);
  });

  it('throws a Unity bridge error when commands are not implemented natively', async () => {
    const {
      native: { loadUnity, addUnityEventListener },
    } = loadModule();

    await expect(loadUnity()).rejects.toThrow(
      'The Unity bridge API is defined'
    );
    expect(() => addUnityEventListener('ready', jest.fn())).toThrow(
      'The Unity bridge API is defined'
    );
  });
});
