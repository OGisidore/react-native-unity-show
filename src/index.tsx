import * as React from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  requireNativeComponent,
  UIManager,
  type EmitterSubscription,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

type ExpoModulesCore = typeof import('expo-modules-core');

export type UnityShowJSONValue =
  | string
  | number
  | boolean
  | null
  | UnityShowJSONArray
  | UnityShowJSONObject;

export type UnityShowJSONArray = UnityShowJSONValue[];

export type UnityShowJSONObject = {
  [key: string]: UnityShowJSONValue | undefined;
};

export type UnityShowSource = {
  projectId?: string;
  initialScene?: string;
  launchOptions?: UnityShowJSONObject;
};

export type UnityShowMessage = {
  gameObject: string;
  methodName: string;
  payload?: UnityShowJSONValue;
};

export type UnityShowLifecycleState =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'paused'
  | 'unloaded'
  | 'error';

export type UnityShowReadyEvent = {
  viewId?: number;
  unityVersion?: string;
};

export type UnityShowMessageEvent = {
  name?: string;
  payload?: UnityShowJSONValue;
  rawMessage?: string;
};

export type UnityShowStateChangeEvent = {
  state: UnityShowLifecycleState;
  reason?: string;
};

export type UnityShowErrorEvent = {
  code: string;
  message: string;
  recoverable?: boolean;
  nativeStack?: string;
};

export type UnityShowEventMap = {
  ready: UnityShowReadyEvent;
  message: UnityShowMessageEvent;
  stateChange: UnityShowStateChangeEvent;
  error: UnityShowErrorEvent;
};

export type UnityShowEventName = keyof UnityShowEventMap;

export type UnityShowEventSubscription = {
  remove(): void;
};

export type UnityShowViewRef = {
  load(source?: UnityShowSource): Promise<void>;
  unload(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  sendMessage(message: UnityShowMessage): Promise<void>;
};

export type UnityShowViewProps = ViewProps & {
  source?: UnityShowSource;
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
  onReady?: (event: UnityShowReadyEvent) => void;
  onMessage?: (event: UnityShowMessageEvent) => void;
  onStateChange?: (event: UnityShowStateChangeEvent) => void;
  onError?: (event: UnityShowErrorEvent) => void;
};

type UnityShowSmokeModule = {
  multiply(a: number, b: number): Promise<number>;
};

type UnityShowBridgeNativeModule = Partial<{
  load(source?: UnityShowSource): Promise<void>;
  unload(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  sendMessage(message: UnityShowMessage): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}> &
  UnityShowSmokeModule;

type UnityShowBridgeMethod =
  | 'load'
  | 'unload'
  | 'pause'
  | 'resume'
  | 'sendMessage';

type UnityShowBridgeCallable = (...args: unknown[]) => Promise<void>;

type ExpoEventEmitterConstructor = new (nativeModule: object) => {
  addListener(
    eventName: string,
    listener: (event: unknown) => void
  ): UnityShowEventSubscription;
};

type UnityShowNativeViewProps = Omit<
  UnityShowViewProps,
  'onReady' | 'onMessage' | 'onStateChange' | 'onError'
> & {
  onUnityReady?: (event: NativeSyntheticEvent<UnityShowReadyEvent>) => void;
  onUnityMessage?: (event: NativeSyntheticEvent<UnityShowMessageEvent>) => void;
  onUnityStateChange?: (
    event: NativeSyntheticEvent<UnityShowStateChangeEvent>
  ) => void;
  onUnityError?: (event: NativeSyntheticEvent<UnityShowErrorEvent>) => void;
};

const UNITY_SHOW_VIEW_NAME = 'UnityShowView';

const LINKING_ERROR =
  `The package 'react-native-unity-show' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

const UNITY_BRIDGE_UNIMPLEMENTED_ERROR =
  'The Unity bridge API is defined, but the native Unity runtime implementation is not available yet. Complete the Android/iOS Unity integration tasks before calling this API.';

const UNITY_VIEW_UNIMPLEMENTED_ERROR =
  'UnityShowView is part of the public API contract, but no native Unity view manager is registered yet. Complete the platform Unity view integration before rendering it.';

function loadExpoModulesCore(): ExpoModulesCore | null {
  try {
    return require('expo-modules-core') as ExpoModulesCore;
  } catch {
    return null;
  }
}

const ExpoModulesCoreModule = loadExpoModulesCore();

const UnityShowExpo =
  ExpoModulesCoreModule?.requireOptionalNativeModule<UnityShowBridgeNativeModule>(
    'UnityShowExpo'
  ) ?? null;

const LegacyUnityShow = NativeModules.UnityShow as
  | UnityShowBridgeNativeModule
  | undefined;

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

const NativeUnityShowView = UIManager.getViewManagerConfig?.(UNITY_SHOW_VIEW_NAME)
  ? requireNativeComponent<UnityShowNativeViewProps>(UNITY_SHOW_VIEW_NAME)
  : null;

function getUnityBridgeModules(): UnityShowBridgeNativeModule[] {
  return [UnityShowExpo, LegacyUnityShow].filter(
    (nativeModule): nativeModule is UnityShowBridgeNativeModule =>
      nativeModule != null
  );
}

function findUnityBridgeMethod(methodName: UnityShowBridgeMethod) {
  for (const nativeModule of getUnityBridgeModules()) {
    const method = nativeModule[methodName] as
      | UnityShowBridgeCallable
      | undefined;

    if (typeof method === 'function') {
      return {
        nativeModule,
        method,
      };
    }
  }

  throw new Error(UNITY_BRIDGE_UNIMPLEMENTED_ERROR);
}

async function callUnityBridge(
  methodName: UnityShowBridgeMethod,
  ...args: [UnityShowSource?] | [] | [UnityShowMessage]
): Promise<void> {
  const { nativeModule, method } = findUnityBridgeMethod(methodName);

  await method.apply(nativeModule, args);
}

function createNativeEventHandler<TEvent>(
  handler: ((event: TEvent) => void) | undefined
) {
  return handler
    ? (event: NativeSyntheticEvent<TEvent>) => handler(event.nativeEvent)
    : undefined;
}

export const UnityShowView: React.ForwardRefExoticComponent<
  UnityShowViewProps & React.RefAttributes<UnityShowViewRef>
> = React.forwardRef<UnityShowViewRef, UnityShowViewProps>(
  function UnityShowViewComponent(
    { onReady, onMessage, onStateChange, onError, ...nativeProps },
    ref
  ) {
    React.useImperativeHandle(
      ref,
      () => ({
        load: loadUnity,
        unload: unloadUnity,
        pause: pauseUnity,
        resume: resumeUnity,
        sendMessage,
      }),
      []
    );

    if (!NativeUnityShowView) {
      throw new Error(UNITY_VIEW_UNIMPLEMENTED_ERROR);
    }

    return (
      <NativeUnityShowView
        {...nativeProps}
        onUnityReady={createNativeEventHandler(onReady)}
        onUnityMessage={createNativeEventHandler(onMessage)}
        onUnityStateChange={createNativeEventHandler(onStateChange)}
        onUnityError={createNativeEventHandler(onError)}
      />
    );
  }
);

export function loadUnity(source?: UnityShowSource): Promise<void> {
  return callUnityBridge('load', source);
}

export function unloadUnity(): Promise<void> {
  return callUnityBridge('unload');
}

export function pauseUnity(): Promise<void> {
  return callUnityBridge('pause');
}

export function resumeUnity(): Promise<void> {
  return callUnityBridge('resume');
}

export function sendMessage(message: UnityShowMessage): Promise<void> {
  return callUnityBridge('sendMessage', message);
}

export function addUnityEventListener<EventName extends UnityShowEventName>(
  eventName: EventName,
  listener: (event: UnityShowEventMap[EventName]) => void
): UnityShowEventSubscription {
  if (UnityShowExpo && ExpoModulesCoreModule?.EventEmitter) {
    const EventEmitter =
      ExpoModulesCoreModule.EventEmitter as unknown as ExpoEventEmitterConstructor;
    const emitter = new EventEmitter(UnityShowExpo);

    return emitter.addListener(eventName, (event) => {
      listener(event as UnityShowEventMap[EventName]);
    });
  }

  const nativeModule = LegacyUnityShow;

  if (
    nativeModule &&
    typeof nativeModule.addListener === 'function' &&
    typeof nativeModule.removeListeners === 'function'
  ) {
    const emitter = new NativeEventEmitter(
      nativeModule as ConstructorParameters<typeof NativeEventEmitter>[0]
    );

    return emitter.addListener(eventName, (event: object) => {
      listener(event as UnityShowEventMap[EventName]);
    }) as EmitterSubscription;
  }

  throw new Error(UNITY_BRIDGE_UNIMPLEMENTED_ERROR);
}

/**
 * @deprecated Transitional native-module smoke test retained for compatibility
 * during the Unity bridge migration. Use the Unity bridge APIs instead.
 */
export function multiply(a: number, b: number): Promise<number> {
  return (UnityShowExpo ?? UnityShow).multiply(a, b);
}

/**
 * @deprecated Legacy iOS helper retained for compatibility with the original
 * scaffold. It is unrelated to the Unity bridge and will be removed in a future
 * breaking release after the public API is finalized.
 */
export function getUserAgent(): Promise<string> {
  return UnityShowUserAgent.getWebViewUserAgent();
}
