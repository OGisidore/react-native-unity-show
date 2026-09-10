function loadModule({
  nativeModules = {},
  expoModule = null,
  os = 'ios',
}: {
  nativeModules?: Record<string, unknown>;
  expoModule?: unknown;
  os?: string;
} = {}) {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: nativeModules,
    Platform: {
      OS: os,
      select: (options: Record<string, string>) =>
        options[os] ?? options.default,
    },
  }));
  jest.doMock('expo-modules-core', () => ({
    requireOptionalNativeModule: jest.fn(() => expoModule),
  }));

  return require('../index');
}

describe('react-native-unity-show public API', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('expo-modules-core');
  });

  it('delegates multiply to the Expo module when available', async () => {
    const multiplyNative = jest.fn().mockResolvedValue(21);
    const { multiply } = loadModule({
      expoModule: {
        multiply: multiplyNative,
      },
    });

    await expect(multiply(3, 7)).resolves.toBe(21);
    expect(multiplyNative).toHaveBeenCalledWith(3, 7);
  });

  it('falls back from the Expo module to the UnityShow native module', async () => {
    const multiplyNative = jest.fn().mockResolvedValue(21);
    const { multiply } = loadModule({
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
    const { getUserAgent } = loadModule({
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
    const { multiply } = loadModule();

    expect(() => multiply(3, 7)).toThrow(
      "The package 'react-native-unity-show' doesn't seem to be linked."
    );
  });
});
