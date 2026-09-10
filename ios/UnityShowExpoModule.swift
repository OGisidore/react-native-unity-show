import ExpoModulesCore

public class UnityShowExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UnityShowExpo")

    AsyncFunction("multiply") { (a: Double, b: Double) in
      return a * b
    }
  }
}
