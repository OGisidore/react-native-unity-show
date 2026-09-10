import ExpoModulesCore

internal final class UnityShowFrameworkUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "UnityFramework.framework is not available. Add a Unity iOS export to the host app before loading Unity."
  }
}

internal final class UnityShowRuntimeException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    param
  }
}
