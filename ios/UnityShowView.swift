import ExpoModulesCore
import UIKit

internal final class UnityShowView: ExpoView {
  private var source: [String: Any?]?
  private var paused = false
  private var listenerBox: UnityShowEventListenerBox?

  private let onUnityReady = EventDispatcher()
  private let onUnityMessage = EventDispatcher()
  private let onUnityStateChange = EventDispatcher()
  private let onUnityError = EventDispatcher()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    listenerBox = UnityShowEventBus.addListener { [weak self] eventName, body in
      self?.dispatchEvent(eventName, body: body)
    }
  }

  deinit {
    UnityShowEventBus.removeListener(listenerBox)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window == nil {
      UnityShowRuntime.shared.detach(from: self)
      return
    }

    attachUnityIfReady()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    subviews.forEach { view in
      view.frame = bounds
    }
  }

  func setSource(_ source: [String: Any?]?) {
    self.source = source
    attachUnityIfReady()
  }

  func setPaused(_ paused: Bool) {
    if self.paused == paused {
      return
    }

    self.paused = paused

    do {
      if paused {
        try UnityShowRuntime.shared.pause()
      } else {
        try UnityShowRuntime.shared.resume()
      }
    } catch {
      dispatchError(
        code: "ERR_UNITY_LIFECYCLE",
        message: error.localizedDescription,
        recoverable: true
      )
    }
  }

  private func attachUnityIfReady() {
    guard window != nil else {
      return
    }

    do {
      try UnityShowRuntime.shared.attach(to: self, source: source)
    } catch {
      dispatchError(
        code: "ERR_UNITY_FRAMEWORK_UNAVAILABLE",
        message: error.localizedDescription,
        recoverable: true
      )
    }
  }

  private func dispatchEvent(_ eventName: String, body: [String: Any?]) {
    switch eventName {
    case "ready":
      onUnityReady(body as [String: Any])
    case "message":
      onUnityMessage(body as [String: Any])
    case "stateChange":
      onUnityStateChange(body as [String: Any])
    case "error":
      onUnityError(body as [String: Any])
    default:
      break
    }
  }

  private func dispatchError(code: String, message: String, recoverable: Bool) {
    onUnityError([
      "code": code,
      "message": message,
      "recoverable": recoverable
    ])
  }
}
