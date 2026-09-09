function loadModule(nativeModules = {}, os = 'ios') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: nativeModules,
    Platform: {
      OS: os,
      select: (options: Record<string, string>) =>
        options[os] ?? options.default,
    },
  }));

  return require('../index');
}

describe('react-native-unity-show public API', () => {
  afterEach(() => {
    jest.dontMock('react-native');
  });

  it('delegates multiply to the UnityShow native module', async () => {
    const multiplyNative = jest.fn().mockResolvedValue(21);
    const { multiply } = loadModule({
      UnityShow: {
        multiply: multiplyNative,
      },
    });

    await expect(multiply(3, 7)).resolves.toBe(21);
    expect(multiplyNative).toHaveBeenCalledWith(3, 7);
  });

  it('delegates getUserAgent to the UnityShowUserAgent native module', async () => {
    const getWebViewUserAgent = jest.fn().mockResolvedValue('ExampleUserAgent');
    const { getUserAgent } = loadModule({
      UnityShowUserAgent: {
        getWebViewUserAgent,
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
