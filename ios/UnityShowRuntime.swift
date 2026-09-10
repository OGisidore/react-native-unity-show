import ExpoModulesCore
import ObjectiveC.runtime
import UIKit

internal final class UnityShowRuntime {
  static let shared = UnityShowRuntime()

  private let frameworkName = "UnityFramework"
  private let dataBundleId = "com.unity3d.framework"
  private var unityFramework: NSObject?
  private var unityView: UIView?
  private var state = "idle"

  func load(source: [String: Any?]? = nil) throws {
    try runOnMain {
      let framework = try self.ensureUnityFramework()
      try self.runEmbeddedIfNeeded(framework)
      self.unityView = self.resolveRootView(framework)
      self.updateState("loaded", reason: source?["initialScene"] as? String)
      UnityShowEventBus.emitReady(self.resolveUnityVersion(framework))
    }
  }

  func attach(to container: UIView, source: [String: Any?]? = nil) throws {
    try runOnMain {
      try self.load(source: source)

      guard let unityView = self.unityView else {
        throw UnityShowRuntimeException("UnityFramework did not expose a root Unity view.")
      }

      if unityView.superview !== container {
        unityView.removeFromSuperview()
        container.subviews.forEach { $0.removeFromSuperview() }
        container.addSubview(unityView)
      }

      unityView.frame = container.bounds
      unityView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    }
  }

  func detach(from container: UIView) {
    DispatchQueue.main.async {
      if self.unityView?.superview === container {
        self.unityView?.removeFromSuperview()
      }
    }
  }

  func pause() throws {
    try runOnMain {
      let framework = try self.ensureUnityFramework()
      try self.invokeInstanceVoidBool(framework, selectorName: "pause:", value: true)
      self.updateState("paused")
    }
  }

  func resume() throws {
    try runOnMain {
      let framework = try self.ensureUnityFramework()
      try self.invokeInstanceVoidBool(framework, selectorName: "pause:", value: false)
      self.updateState("loaded")
    }
  }

  func unload() throws {
    try runOnMain {
      let framework = try self.ensureUnityFramework()
      try self.invokeInstanceVoid(framework, selectorName: "unloadApplication")
      self.unityView?.removeFromSuperview()
      self.unityView = nil
      self.updateState("unloaded")
    }
  }

  func quit() {
    DispatchQueue.main.async {
      guard let framework = self.unityFramework else {
        return
      }

      try? self.invokeInstanceVoidInt(framework, selectorName: "quitApplication:", value: 0)
      self.unityFramework = nil
      self.unityView = nil
      self.updateState("idle")
    }
  }

  func sendMessage(_ message: [String: Any?]) throws {
    try runOnMain {
      let framework = try self.ensureUnityFramework()
      guard let gameObject = message["gameObject"] as? String, !gameObject.isEmpty else {
        throw UnityShowRuntimeException("Unity message requires a non-empty gameObject.")
      }
      guard let methodName = message["methodName"] as? String, !methodName.isEmpty else {
        throw UnityShowRuntimeException("Unity message requires a non-empty methodName.")
      }

      let payload = self.encodePayload(message["payload"] ?? nil)
      try self.invokeSendMessage(
        framework,
        gameObject: gameObject,
        methodName: methodName,
        payload: payload
      )
    }
  }

  private func ensureUnityFramework() throws -> NSObject {
    if let unityFramework {
      return unityFramework
    }

    let bundle = try loadUnityFrameworkBundle()
    guard let frameworkClass = bundle.principalClass as? NSObject.Type else {
      throw UnityShowRuntimeException("UnityFramework principal class was not found.")
    }
    let framework = try invokeClassObject(frameworkClass, selectorName: "getInstance")

    try invokeInstanceVoidString(
      framework,
      selectorName: "setDataBundleId:",
      value: dataBundleId
    )

    unityFramework = framework
    return framework
  }

  private func loadUnityFrameworkBundle() throws -> Bundle {
    if let loaded = Bundle.allFrameworks.first(where: { $0.bundlePath.contains("\(frameworkName).framework") }) {
      return loaded
    }

    let candidatePaths = [
      Bundle.main.privateFrameworksPath,
      Bundle.main.bundlePath
    ].compactMap { $0 }

    for basePath in candidatePaths {
      let frameworkPath = (basePath as NSString)
        .appendingPathComponent("\(frameworkName).framework")
      let bundlePath = (frameworkPath as NSString)
        .appendingPathComponent(frameworkName)

      if FileManager.default.fileExists(atPath: bundlePath),
        let bundle = Bundle(path: frameworkPath) {
        try bundle.loadAndReturnError()
        return bundle
      }
    }

    throw UnityShowFrameworkUnavailableException()
  }

  private func runEmbeddedIfNeeded(_ framework: NSObject) throws {
    guard resolveRootView(framework) == nil else {
      return
    }

    let selector = NSSelectorFromString("runEmbeddedWithArgc:argv:appLaunchOpts:")
    guard let method = class_getInstanceMethod(type(of: framework), selector) else {
      throw UnityShowRuntimeException("UnityFramework.runEmbeddedWithArgc:argv:appLaunchOpts: was not found.")
    }

    typealias Function = @convention(c) (
      NSObject,
      Selector,
      Int32,
      UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?,
      [UIApplication.LaunchOptionsKey: Any]?
    ) -> Void

    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    function(framework, selector, 0, nil, nil)
  }

  private func resolveRootView(_ framework: NSObject) -> UIView? {
    if let appController = framework.value(forKey: "appController") as? NSObject,
      let rootView = appController.value(forKey: "rootView") as? UIView {
      return rootView
    }

    return nil
  }

  private func resolveUnityVersion(_ framework: NSObject) -> String? {
    return try? invokeInstanceObject(framework, selectorName: "getUnityVersion") as? String
  }

  private func invokeClassObject(_ klass: NSObject.Type, selectorName: String) throws -> NSObject {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getClassMethod(klass, selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (AnyClass, Selector) -> NSObject
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    return function(klass, selector)
  }

  private func invokeInstanceObject(_ object: NSObject, selectorName: String) throws -> AnyObject? {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (NSObject, Selector) -> AnyObject?
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    return function(object, selector)
  }

  private func invokeInstanceVoid(_ object: NSObject, selectorName: String) throws {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (NSObject, Selector) -> Void
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    function(object, selector)
  }

  private func invokeInstanceVoidBool(_ object: NSObject, selectorName: String, value: Bool) throws {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (NSObject, Selector, Bool) -> Void
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    function(object, selector, value)
  }

  private func invokeInstanceVoidInt(_ object: NSObject, selectorName: String, value: Int32) throws {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (NSObject, Selector, Int32) -> Void
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    function(object, selector, value)
  }

  private func invokeInstanceVoidString(_ object: NSObject, selectorName: String, value: String) throws {
    let selector = NSSelectorFromString(selectorName)
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.\(selectorName) was not found.")
    }

    typealias Function = @convention(c) (NSObject, Selector, NSString) -> Void
    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    function(object, selector, value as NSString)
  }

  private func invokeSendMessage(
    _ object: NSObject,
    gameObject: String,
    methodName: String,
    payload: String
  ) throws {
    let selector = NSSelectorFromString("sendMessageToGOWithName:functionName:message:")
    guard let method = class_getInstanceMethod(type(of: object), selector) else {
      throw UnityShowRuntimeException("UnityFramework.sendMessageToGOWithName:functionName:message: was not found.")
    }

    typealias Function = @convention(c) (
      NSObject,
      Selector,
      UnsafePointer<CChar>,
      UnsafePointer<CChar>,
      UnsafePointer<CChar>
    ) -> Void

    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: Function.self)
    gameObject.withCString { gameObjectPointer in
      methodName.withCString { methodNamePointer in
        payload.withCString { payloadPointer in
          function(object, selector, gameObjectPointer, methodNamePointer, payloadPointer)
        }
      }
    }
  }

  private func updateState(_ nextState: String, reason: String? = nil) {
    if state == nextState, reason == nil {
      return
    }

    state = nextState
    UnityShowEventBus.emitStateChange(nextState, reason: reason)
  }

  private func encodePayload(_ payload: Any?) -> String {
    guard let payload else {
      return ""
    }

    if let string = payload as? String {
      return string
    }

    guard JSONSerialization.isValidJSONObject(payload),
      let data = try? JSONSerialization.data(withJSONObject: payload),
      let json = String(data: data, encoding: .utf8) else {
      return "\(payload)"
    }

    return json
  }

  private func runOnMain(_ block: () throws -> Void) throws {
    if Thread.isMainThread {
      try block()
      return
    }

    try DispatchQueue.main.sync {
      try block()
    }
  }
}
