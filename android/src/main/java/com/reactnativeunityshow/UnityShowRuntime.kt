package com.reactnativeunityshow

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import org.json.JSONArray
import org.json.JSONObject
import java.lang.reflect.InvocationTargetException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicReference

internal object UnityShowRuntime {
  private const val UNITY_PLAYER_CLASS_NAME = "com.unity3d.player.UnityPlayer"

  private val mainHandler = Handler(Looper.getMainLooper())
  private var unityPlayer: Any? = null
  private var unityView: View? = null
  private var state: String = "idle"

  fun load(activity: Activity, source: Map<String, Any?>?) {
    runOnMain {
      ensureUnityPlayer(activity)
      updateState("loaded", source?.get("initialScene") as? String)
      UnityShowEventBus.emitReady(resolveUnityVersion())
    }
  }

  fun attachTo(container: ViewGroup, activity: Activity, source: Map<String, Any?>?) {
    runOnMain {
      val view = ensureUnityPlayer(activity)
      val existingParent = view.parent as? ViewGroup

      if (existingParent !== container) {
        existingParent?.removeView(view)
        container.removeAllViews()
        container.addView(
          view,
          ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )
        )
      }

      view.requestFocus()
      updateState("loaded", source?.get("initialScene") as? String)
      UnityShowEventBus.emitReady(resolveUnityVersion())
    }
  }

  fun detachFrom(container: ViewGroup) {
    runOnMain {
      if (unityView?.parent === container) {
        container.removeView(unityView)
      }
    }
  }

  fun pause() {
    runOnMain {
      invokeUnityPlayer("pause")
      updateState("paused")
    }
  }

  fun resume() {
    runOnMain {
      invokeUnityPlayer("resume")
      updateState("loaded")
    }
  }

  fun unload() {
    runOnMain {
      invokeUnityPlayer("unload")
      updateState("unloaded")
    }
  }

  fun destroy() {
    runOnMain {
      unityView?.let { view ->
        (view.parent as? ViewGroup)?.removeView(view)
      }
      invokeUnityPlayerIfPresent("destroy")
      unityView = null
      unityPlayer = null
      updateState("idle")
    }
  }

  fun sendMessage(message: Map<String, Any?>) {
    runOnMain {
      val gameObject = message["gameObject"] as? String
        ?: throw UnityShowRuntimeException("Unity message requires a non-empty gameObject.")
      val methodName = message["methodName"] as? String
        ?: throw UnityShowRuntimeException("Unity message requires a non-empty methodName.")
      val payload = encodePayload(message["payload"])
      val unityPlayerClass = loadUnityPlayerClass()

      try {
        unityPlayerClass
          .getMethod(
            "UnitySendMessage",
            String::class.java,
            String::class.java,
            String::class.java
          )
          .invoke(null, gameObject, methodName, payload)
      } catch (exception: InvocationTargetException) {
        throw UnityShowRuntimeException(
          "UnityPlayer.UnitySendMessage threw an exception.",
          exception.targetException
        )
      } catch (exception: ReflectiveOperationException) {
        throw UnityShowRuntimeException(
          "Unable to send message to UnityPlayer.UnitySendMessage.",
          exception
        )
      }
    }
  }

  private fun ensureUnityPlayer(activity: Activity): View {
    unityView?.let { return it }

    val playerClass = loadUnityPlayerClass()
    val player = createUnityPlayer(playerClass, activity)
    val view = player as? View
      ?: throw UnityShowRuntimeException("UnityPlayer is not an Android View.")

    unityPlayer = player
    unityView = view

    return view
  }

  private fun loadUnityPlayerClass(): Class<*> {
    return try {
      Class.forName(UNITY_PLAYER_CLASS_NAME)
    } catch (exception: ClassNotFoundException) {
      throw UnityShowRuntimeUnavailableException(exception)
    }
  }

  private fun createUnityPlayer(playerClass: Class<*>, activity: Activity): Any {
    val constructors = listOf(
      arrayOf<Class<*>>(Activity::class.java),
      arrayOf(Context::class.java),
    )

    for (parameterTypes in constructors) {
      try {
        return playerClass
          .getConstructor(*parameterTypes)
          .newInstance(activity)
      } catch (_: NoSuchMethodException) {
      } catch (exception: ReflectiveOperationException) {
        throw UnityShowRuntimeException("Unable to create UnityPlayer.", exception)
      }
    }

    throw UnityShowRuntimeException(
      "UnityPlayer constructor was not found. Expected Activity or Context constructor."
    )
  }

  private fun invokeUnityPlayer(methodName: String) {
    val player = unityPlayer ?: throw UnityShowRuntimeUnavailableException()
    invokeUnityPlayerMethod(player, methodName)
  }

  private fun invokeUnityPlayerIfPresent(methodName: String) {
    unityPlayer?.let { player ->
      invokeUnityPlayerMethod(player, methodName)
    }
  }

  private fun invokeUnityPlayerMethod(player: Any, methodName: String) {
    try {
      player.javaClass.getMethod(methodName).invoke(player)
    } catch (exception: NoSuchMethodException) {
      throw UnityShowRuntimeException("UnityPlayer.$methodName() was not found.", exception)
    } catch (exception: InvocationTargetException) {
      throw UnityShowRuntimeException(
        "UnityPlayer.$methodName() threw an exception.",
        exception.targetException
      )
    } catch (exception: ReflectiveOperationException) {
      throw UnityShowRuntimeException("Unable to call UnityPlayer.$methodName().", exception)
    }
  }

  private fun resolveUnityVersion(): String? {
    return try {
      loadUnityPlayerClass()
        .getMethod("getUnityVersion")
        .invoke(null) as? String
    } catch (_: Exception) {
      null
    }
  }

  private fun updateState(nextState: String, reason: String? = null) {
    if (state == nextState && reason == null) {
      return
    }

    state = nextState
    UnityShowEventBus.emitStateChange(nextState, reason)
  }

  private fun encodePayload(payload: Any?): String {
    return when (payload) {
      null -> ""
      is String -> payload
      is Map<*, *> -> JSONObject(payload).toString()
      is List<*> -> JSONArray(payload).toString()
      else -> payload.toString()
    }
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
      return
    }

    val latch = CountDownLatch(1)
    val error = AtomicReference<Throwable?>()

    mainHandler.post {
      try {
        block()
      } catch (throwable: Throwable) {
        error.set(throwable)
      } finally {
        latch.countDown()
      }
    }

    latch.await()
    error.get()?.let { throwable ->
      throw throwable
    }
  }
}
