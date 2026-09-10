package com.reactnativeunityshow

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UnityShowExpoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UnityShowExpo")

    AsyncFunction("multiply") { a: Double, b: Double ->
      a * b
    }
  }
}
