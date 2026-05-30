package expo.modules.walkingdogwatchbridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WalkingDogWatchBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WalkingDogWatchBridge")

    Events("onWatchWalkCommand")

    AsyncFunction("publishWalkSnapshot") { _: String ->
      Unit
    }

    AsyncFunction("getPendingCommands") {
      emptyList<String>()
    }

    AsyncFunction("ackCommand") { _: String ->
      Unit
    }
  }
}
