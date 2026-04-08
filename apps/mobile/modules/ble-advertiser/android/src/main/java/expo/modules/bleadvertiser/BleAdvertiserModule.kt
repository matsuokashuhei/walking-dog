package expo.modules.bleadvertiser

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.UUID

class BleAdvertiserModule : Module() {
  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private var isCurrentlyAdvertising = false

  override fun definition() = ModuleDefinition {
    Name("BleAdvertiser")

    AsyncFunction("startAdvertising") { serviceUuid: String, walkIdUuid: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "React context not available", null)
        return@AsyncFunction
      }

      val bluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      val adapter = bluetoothManager?.adapter

      if (adapter == null || !adapter.isEnabled) {
        promise.reject("BLE_DISABLED", "Bluetooth is not enabled", null)
        return@AsyncFunction
      }

      val bleAdvertiser = adapter.bluetoothLeAdvertiser
      if (bleAdvertiser == null) {
        promise.reject("BLE_UNSUPPORTED", "BLE advertising not supported on this device", null)
        return@AsyncFunction
      }

      // Stop any existing advertising
      advertiseCallback?.let { cb ->
        bleAdvertiser.stopAdvertising(cb)
      }

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
        .setConnectable(false)
        .setTimeout(0)
        .build()

      val data = AdvertiseData.Builder()
        .addServiceUuid(ParcelUuid(UUID.fromString(serviceUuid)))
        .addServiceUuid(ParcelUuid(UUID.fromString(walkIdUuid)))
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .build()

      val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
          isCurrentlyAdvertising = true
          promise.resolve(null)
        }

        override fun onStartFailure(errorCode: Int) {
          isCurrentlyAdvertising = false
          val errorMsg = when (errorCode) {
            ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertise data too large"
            ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers"
            ADVERTISE_FAILED_ALREADY_STARTED -> "Already advertising"
            ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error"
            ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
            else -> "Unknown error: $errorCode"
          }
          promise.reject("ADVERTISE_FAILED", errorMsg, null)
        }
      }

      advertiseCallback = callback
      advertiser = bleAdvertiser
      bleAdvertiser.startAdvertising(settings, data, callback)
    }

    AsyncFunction("stopAdvertising") { promise: Promise ->
      advertiseCallback?.let { cb ->
        advertiser?.stopAdvertising(cb)
      }
      advertiser = null
      advertiseCallback = null
      isCurrentlyAdvertising = false
      promise.resolve(null)
    }

    Function("isAdvertising") {
      return@Function isCurrentlyAdvertising
    }
  }
}
