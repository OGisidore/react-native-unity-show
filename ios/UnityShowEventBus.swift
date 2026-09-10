import Foundation

internal typealias UnityShowEventListener = (String, [String: Any?]) -> Void

@objc(UnityShowEventBus)
public final class UnityShowEventBus: NSObject {
  private static var listeners = NSHashTable<UnityShowEventListenerBox>.weakObjects()
  private static let lock = NSLock()

  internal static func addListener(_ listener: @escaping UnityShowEventListener) -> UnityShowEventListenerBox {
    let box = UnityShowEventListenerBox(listener)

    lock.lock()
    listeners.add(box)
    lock.unlock()

    return box
  }

  internal static func removeListener(_ box: UnityShowEventListenerBox?) {
    guard let box else {
      return
    }

    lock.lock()
    listeners.remove(box)
    lock.unlock()
  }

  internal static func emit(_ eventName: String, body: [String: Any?]) {
    let currentListeners = allListeners()

    DispatchQueue.main.async {
      currentListeners.forEach { listener in
        listener.invoke(eventName, body)
      }
    }
  }

  @objc
  public static func emitReady(_ unityVersion: String?) {
    emit(
      "ready",
      body: [
        "unityVersion": unityVersion
      ]
    )
  }

  @objc
  public static func emitMessage(_ name: String?, payload: String?) {
    emit(
      "message",
      body: [
        "name": name,
        "rawMessage": payload,
        "payload": parsePayload(payload)
      ]
    )
  }

  @objc
  public static func emitStateChange(_ state: String, reason: String?) {
    emit(
      "stateChange",
      body: [
        "state": state,
        "reason": reason
      ]
    )
  }

  @objc
  public static func emitError(_ code: String, message: String, recoverable: Bool) {
    emit(
      "error",
      body: [
        "code": code,
        "message": message,
        "recoverable": recoverable
      ]
    )
  }

  private static func allListeners() -> [UnityShowEventListenerBox] {
    lock.lock()
    let result = listeners.allObjects
    lock.unlock()

    return result
  }

  private static func parsePayload(_ payload: String?) -> Any? {
    guard let payload, let data = payload.data(using: .utf8) else {
      return nil
    }

    do {
      return try JSONSerialization.jsonObject(with: data)
    } catch {
      return payload
    }
  }
}

internal final class UnityShowEventListenerBox: NSObject {
  private let listener: UnityShowEventListener

  init(_ listener: @escaping UnityShowEventListener) {
    self.listener = listener
  }

  func invoke(_ eventName: String, _ body: [String: Any?]) {
    listener(eventName, body)
  }
}

@_cdecl("UnityShowEmitReady")
public func UnityShowEmitReady(_ unityVersion: UnsafePointer<CChar>?) {
  UnityShowEventBus.emitReady(unityShowString(from: unityVersion))
}

@_cdecl("UnityShowEmitMessage")
public func UnityShowEmitMessage(
  _ name: UnsafePointer<CChar>?,
  _ payload: UnsafePointer<CChar>?
) {
  UnityShowEventBus.emitMessage(
    unityShowString(from: name),
    payload: unityShowString(from: payload)
  )
}

@_cdecl("UnityShowEmitStateChange")
public func UnityShowEmitStateChange(
  _ state: UnsafePointer<CChar>?,
  _ reason: UnsafePointer<CChar>?
) {
  UnityShowEventBus.emitStateChange(
    unityShowString(from: state) ?? "loaded",
    reason: unityShowString(from: reason)
  )
}

@_cdecl("UnityShowEmitError")
public func UnityShowEmitError(
  _ code: UnsafePointer<CChar>?,
  _ message: UnsafePointer<CChar>?,
  _ recoverable: Bool
) {
  UnityShowEventBus.emitError(
    unityShowString(from: code) ?? "ERR_UNITY_RUNTIME",
    message: unityShowString(from: message) ?? "Unity emitted an unknown error.",
    recoverable: recoverable
  )
}

private func unityShowString(from cString: UnsafePointer<CChar>?) -> String? {
  guard let cString else {
    return nil
  }

  return String(cString: cString)
}
