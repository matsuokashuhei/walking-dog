import ExpoModulesCore
import CoreBluetooth

public class BleAdvertiserModule: Module {
  private var peripheralManager: CBPeripheralManager?
  private var delegate: PeripheralDelegate?
  private var advertising = false

  public func definition() -> ModuleDefinition {
    Name("BleAdvertiser")

    AsyncFunction("startAdvertising") { (serviceUuid: String, walkIdUuid: String, promise: Promise) in
      if self.advertising {
        self.peripheralManager?.stopAdvertising()
        self.advertising = false
      }

      let delegate = PeripheralDelegate()
      self.delegate = delegate

      let manager = CBPeripheralManager(delegate: delegate, queue: nil)
      self.peripheralManager = manager

      delegate.onPoweredOn = { [weak self] in
        guard let self = self else { return }

        // Validate UUIDs via Swift's failable `UUID(uuidString:)` first, then
        // bridge to CBUUID. CBUUID(string:) throws NSException on invalid
        // input and would crash the app; validating up front lets us reject
        // the Promise with a clear error instead.
        guard let serviceNsUuid = UUID(uuidString: serviceUuid) else {
          promise.reject("INVALID_SERVICE_UUID", "Invalid service UUID: \(serviceUuid)")
          return
        }
        guard let walkIdNsUuid = UUID(uuidString: walkIdUuid) else {
          promise.reject("INVALID_WALK_ID_UUID", "Invalid walk ID UUID: \(walkIdUuid)")
          return
        }

        let serviceUUID = CBUUID(nsuuid: serviceNsUuid)
        let walkIdUUID = CBUUID(nsuuid: walkIdNsUuid)

        let advertisementData: [String: Any] = [
          CBAdvertisementDataServiceUUIDsKey: [serviceUUID, walkIdUUID],
          CBAdvertisementDataLocalNameKey: "WD",
        ]

        manager.startAdvertising(advertisementData)
        self.advertising = true
        promise.resolve(nil)
      }

      delegate.onError = { error in
        promise.reject("BLE_ERROR", error.localizedDescription)
      }

      // Timeout after 10 seconds if state never becomes PoweredOn
      DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
        guard let self = self, !self.advertising else { return }
        if delegate.resolved { return }
        delegate.resolved = true
        promise.reject("BLE_TIMEOUT", "Bluetooth did not power on within 10 seconds")
      }
    }

    AsyncFunction("stopAdvertising") { (promise: Promise) in
      self.peripheralManager?.stopAdvertising()
      self.peripheralManager = nil
      self.delegate = nil
      self.advertising = false
      promise.resolve(nil)
    }

    Function("isAdvertising") { () -> Bool in
      return self.advertising
    }
  }
}

private class PeripheralDelegate: NSObject, CBPeripheralManagerDelegate {
  var onPoweredOn: (() -> Void)?
  var onError: ((Error) -> Void)?
  var resolved = false

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard !resolved else { return }

    switch peripheral.state {
    case .poweredOn:
      resolved = true
      onPoweredOn?()
    case .unauthorized:
      resolved = true
      onError?(NSError(
        domain: "BleAdvertiser",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Bluetooth unauthorized"]
      ))
    case .unsupported:
      resolved = true
      onError?(NSError(
        domain: "BleAdvertiser",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "BLE not supported on this device"]
      ))
    case .poweredOff:
      resolved = true
      onError?(NSError(
        domain: "BleAdvertiser",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "Bluetooth is turned off"]
      ))
    default:
      break
    }
  }
}
