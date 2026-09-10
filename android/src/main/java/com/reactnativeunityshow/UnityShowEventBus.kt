package com.reactnativeunityshow

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.util.concurrent.CopyOnWriteArraySet

internal typealias UnityShowEventListener = (String, Map<String, Any?>) -> Unit

object UnityShowEventBus {
  private val listeners = CopyOnWriteArraySet<UnityShowEventListener>()

  internal fun addListener(listener: UnityShowEventListener) {
    listeners.add(listener)
  }

  internal fun removeListener(listener: UnityShowEventListener) {
    listeners.remove(listener)
  }

  internal fun emit(eventName: String, body: Map<String, Any?>) {
    listeners.forEach { listener ->
      listener(eventName, body)
    }
  }

  @JvmStatic
  fun emitReady(unityVersion: String?) {
    emit(
      "ready",
      mapOf(
        "unityVersion" to unityVersion,
      )
    )
  }

  @JvmStatic
  fun emitMessage(name: String?, payload: String?) {
    emit(
      "message",
      mapOf(
        "name" to name,
        "rawMessage" to payload,
        "payload" to parsePayload(payload),
      )
    )
  }

  @JvmStatic
  fun emitStateChange(state: String, reason: String?) {
    emit(
      "stateChange",
      mapOf(
        "state" to state,
        "reason" to reason,
      )
    )
  }

  @JvmStatic
  fun emitError(code: String, message: String, recoverable: Boolean) {
    emit(
      "error",
      mapOf(
        "code" to code,
        "message" to message,
        "recoverable" to recoverable,
      )
    )
  }

  private fun parsePayload(payload: String?): Any? {
    if (payload.isNullOrBlank()) {
      return null
    }

    return try {
      when (val value = JSONTokener(payload).nextValue()) {
        is JSONObject -> value.toMap()
        is JSONArray -> value.toList()
        else -> value
      }
    } catch (_: Exception) {
      payload
    }
  }
}

private fun JSONObject.toMap(): Map<String, Any?> {
  val result = mutableMapOf<String, Any?>()
  val keys = keys()

  while (keys.hasNext()) {
    val key = keys.next()
    result[key] = normalizeJsonValue(get(key))
  }

  return result
}

private fun JSONArray.toList(): List<Any?> {
  return (0 until length()).map { index ->
    normalizeJsonValue(get(index))
  }
}

private fun normalizeJsonValue(value: Any?): Any? {
  return when (value) {
    JSONObject.NULL -> null
    is JSONObject -> value.toMap()
    is JSONArray -> value.toList()
    else -> value
  }
}
