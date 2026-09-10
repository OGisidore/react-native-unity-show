package com.reactnativeunityshow

import expo.modules.kotlin.exception.CodedException

internal class UnityShowActivityUnavailableException :
  CodedException("The current Android activity is required to load Unity, but it is not available.")

internal class UnityShowRuntimeUnavailableException(cause: Throwable? = null) :
  CodedException(
    "Unity runtime is not available. Export Unity for Android as a Gradle project and include its unityLibrary module in the host app before loading Unity.",
    cause
  )

internal class UnityShowRuntimeException(message: String, cause: Throwable? = null) :
  CodedException(message, cause)
