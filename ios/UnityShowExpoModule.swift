import ExpoModulesCore

public class UnityShowExpoModule: Module {
  private var listenerBox: UnityShowEventListenerBox?

  public func definition() -> ModuleDefinition {
    Name("UnityShowExpo")

    Events("ready", "message", "stateChange", "error")

    OnStartObserving {
      listenerBox = UnityShowEventBus.addListener { [weak self] eventName, body in
        self?.sendEvent(eventName, body)
      }
    }

    OnStopObserving {
      UnityShowEventBus.removeListener(listenerBox)
      listenerBox = nil
    }

    OnAppEntersBackground {
      try? UnityShowRuntime.shared.pause()
    }

    OnAppEntersForeground {
      try? UnityShowRuntime.shared.resume()
    }

    OnAppContextDestroys {
      UnityShowEventBus.removeListener(listenerBox)
      listenerBox = nil
      UnityShowRuntime.shared.quit()
    }

    AsyncFunction("multiply") { (a: Double, b: Double) in
      return a * b
    }

    AsyncFunction("load") { (source: [String: Any?]?) in
      try UnityShowRuntime.shared.load(source: source)
    }

    AsyncFunction("unload") {
      try UnityShowRuntime.shared.unload()
    }

    AsyncFunction("pause") {
      try UnityShowRuntime.shared.pause()
    }

    AsyncFunction("resume") {
      try UnityShowRuntime.shared.resume()
    }

    AsyncFunction("sendMessage") { (message: [String: Any?]) in
      try UnityShowRuntime.shared.sendMessage(message)
    }

    View(UnityShowView.self) {
      Events("onUnityReady", "onUnityMessage", "onUnityStateChange", "onUnityError")

      Prop("source") { (view: UnityShowView, source: [String: Any?]?) in
        view.setSource(source)
      }

      Prop("paused") { (view: UnityShowView, paused: Bool) in
        view.setPaused(paused)
      }
    }
  }
}
