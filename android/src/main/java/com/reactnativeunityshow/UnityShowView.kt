package com.reactnativeunityshow

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

@SuppressLint("ViewConstructor")
internal class UnityShowView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  private var source: Map<String, Any?>? = null
  private var paused = false
  private var listening = false
  private val eventListener: UnityShowEventListener = { eventName, body ->
    post {
      dispatchEvent(eventName, body)
    }
  }

  private val onUnityReady by EventDispatcher<Map<String, Any?>>()
  private val onUnityMessage by EventDispatcher<Map<String, Any?>>()
  private val onUnityStateChange by EventDispatcher<Map<String, Any?>>()
  private val onUnityError by EventDispatcher<Map<String, Any?>>()

  init {
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
  }

  fun setSource(source: Map<String, Any?>?) {
    this.source = source
    attachUnityIfReady()
  }

  fun setPaused(paused: Boolean) {
    if (this.paused == paused) {
      return
    }

    this.paused = paused

    if (!isAttachedToWindow) {
      return
    }

    try {
      if (paused) {
        UnityShowRuntime.pause()
      } else {
        UnityShowRuntime.resume()
      }
    } catch (exception: Exception) {
      dispatchError("ERR_UNITY_LIFECYCLE", exception.message, true)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    startListening()
    attachUnityIfReady()
  }

  override fun onDetachedFromWindow() {
    stopListening()
    UnityShowRuntime.detachFrom(this)
    super.onDetachedFromWindow()
  }

  fun onViewDestroys() {
    stopListening()
    UnityShowRuntime.detachFrom(this)
    removeAllViews()
  }

  private fun attachUnityIfReady() {
    if (!isAttachedToWindow) {
      return
    }

    val activity = appContext.currentActivity
    if (activity == null) {
      dispatchError(
        "ERR_UNITY_ACTIVITY_UNAVAILABLE",
        "The current Android activity is required to attach Unity.",
        true
      )
      return
    }

    try {
      UnityShowRuntime.attachTo(this, activity, source)
    } catch (exception: Exception) {
      dispatchError("ERR_UNITY_RUNTIME_UNAVAILABLE", exception.message, true)
    }
  }

  private fun startListening() {
    if (listening) {
      return
    }

    UnityShowEventBus.addListener(eventListener)
    listening = true
  }

  private fun stopListening() {
    if (!listening) {
      return
    }

    UnityShowEventBus.removeListener(eventListener)
    listening = false
  }

  private fun dispatchEvent(eventName: String, body: Map<String, Any?>) {
    when (eventName) {
      "ready" -> onUnityReady(body)
      "message" -> onUnityMessage(body)
      "stateChange" -> onUnityStateChange(body)
      "error" -> onUnityError(body)
    }
  }

  private fun dispatchError(code: String, message: String?, recoverable: Boolean) {
    onUnityError(
      mapOf(
        "code" to code,
        "message" to (message ?: "Unity Android integration failed."),
        "recoverable" to recoverable,
      )
    )
  }
}
