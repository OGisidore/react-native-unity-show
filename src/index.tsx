import { NativeModules, Platform } from 'react-native';

type ExpoModulesCore = typeof import('expo-modules-core');

type UnityShowModule = {
  multiply(a: number, b: number): Promise<number>;
};

const LINKING_ERROR =
  `The package 'react-native-unity-show' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

function loadUnityShowExpoModule(): UnityShowModule | null {
  try {
    const { requireOptionalNativeModule } =
      require('expo-modules-core') as ExpoModulesCore;

    return requireOptionalNativeModule<UnityShowModule>('UnityShowExpo');
  } catch {
    return null;
  }
}

const UnityShowExpo = loadUnityShowExpoModule();

const UnityShow = NativeModules.UnityShow
  ? NativeModules.UnityShow
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const UnityShowUserAgent = NativeModules.UnityShowUserAgent
  ? NativeModules.UnityShowUserAgent
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function multiply(a: number, b: number): Promise<number> {
  return (UnityShowExpo ?? UnityShow).multiply(a, b);
}

export function getUserAgent(): Promise<string> {
  return UnityShowUserAgent.getWebViewUserAgent();
}
