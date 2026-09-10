package com.reactnativeunityshow

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UnityShowExpoModule : Module() {
  private val eventListener: UnityShowEventListener = { eventName, body ->
    sendEvent(eventName, body)
  }

  override fun definition() = ModuleDefinition {
    Name("UnityShowExpo")

    Events("ready", "message", "stateChange", "error")

    OnStartObserving {
      UnityShowEventBus.addListener(eventListener)
    }

    OnStopObserving {
      UnityShowEventBus.removeListener(eventListener)
    }

    OnActivityEntersBackground {
      runIgnoringMissingRuntime {
        UnityShowRuntime.pause()
      }
    }

    OnActivityEntersForeground {
      runIgnoringMissingRuntime {
        UnityShowRuntime.resume()
      }
    }

    OnActivityDestroys {
      UnityShowRuntime.destroy()
    }

    OnDestroy {
      UnityShowEventBus.removeListener(eventListener)
    }

    AsyncFunction("multiply") { a: Double, b: Double ->
      a * b
    }

    AsyncFunction("load") { source: Map<String, Any?>? ->
      val activity = appContext.currentActivity
        ?: throw UnityShowActivityUnavailableException()

      UnityShowRuntime.load(activity, source)
    }

    AsyncFunction("unload") {
      UnityShowRuntime.unload()
    }

    AsyncFunction("pause") {
      UnityShowRuntime.pause()
    }

    AsyncFunction("resume") {
      UnityShowRuntime.resume()
    }

    AsyncFunction("sendMessage") { message: Map<String, Any?> ->
      UnityShowRuntime.sendMessage(message)
    }

    View(UnityShowView::class) {
      Events("onUnityReady", "onUnityMessage", "onUnityStateChange", "onUnityError")

      Prop("source") { view: UnityShowView, source: Map<String, Any?>? ->
        view.setSource(source)
      }

      Prop("paused") { view: UnityShowView, paused: Boolean ->
        view.setPaused(paused)
      }

      OnViewDestroys { view: UnityShowView ->
        view.onViewDestroys()
      }
    }
  }

  private fun runIgnoringMissingRuntime(block: () -> Unit) {
    try {
      block()
    } catch (_: UnityShowRuntimeUnavailableException) {
    }
  }
}
