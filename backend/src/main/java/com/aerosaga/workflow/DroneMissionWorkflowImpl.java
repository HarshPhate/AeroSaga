package com.aerosaga.workflow;

import com.aerosaga.activity.DroneMissionActivity;
import io.temporal.activity.ActivityOptions;
import io.temporal.workflow.Workflow;
import java.time.Duration;

public class DroneMissionWorkflowImpl implements DroneMissionWorkflow {

  private final DroneMissionActivity activity = Workflow.newActivityStub(
      DroneMissionActivity.class,
      ActivityOptions.newBuilder()
          .setStartToCloseTimeout(Duration.ofMinutes(5))
          .setRetryOptions(io.temporal.common.RetryOptions.newBuilder()
              .setInitialInterval(Duration.ofSeconds(1))
              .setMaximumAttempts(3)
              .build())
          .build());

  private String droneId;
  private String missionId;
  private volatile String currentStep = "INIT";
  private volatile String stepStatus = "PENDING";
  private volatile double battery = 100.0;
  private volatile double lastLat = 0.0;
  private volatile double lastLon = 0.0;
  private volatile double lastAlt = 0.0;
  private volatile long lastUpdate = 0L;
  private volatile boolean offline = false;
  private volatile boolean aborted = false;
  private volatile boolean reconnectReceived = false;

  @Override
  public void execute(DroneMissionInput input) {
    this.droneId = input.droneId;
    this.missionId = input.missionId;
    lastUpdate = Workflow.currentTimeMillis();
    lastLat = input.startLat;
    lastLon = input.startLon;
    lastAlt = input.altitude;

    currentStep = "TAKEOFF";
    stepStatus = "ACTIVE";
    waitForOnline();
    activity.takeoff(input);
    stepStatus = "COMPLETED";
    battery -= 5.0;
    lastUpdate = Workflow.currentTimeMillis();

    if (aborted) {
      currentStep = "ABORTED";
      stepStatus = "COMPENSATED";
      return;
    }

    currentStep = "NAVIGATE";
    stepStatus = "ACTIVE";
    waitForOnline();
    activity.navigateTo(input.destLat, input.destLon, input.altitude);
    stepStatus = "COMPLETED";
    battery -= 15.0;
    lastUpdate = Workflow.currentTimeMillis();

    if (aborted) {
      currentStep = "ABORTED";
      stepStatus = "COMPENSATED";
      return;
    }

    currentStep = "DROP_PACKAGE";
    stepStatus = "ACTIVE";
    waitForOnline();
    try {
      activity.dropPackage();
      stepStatus = "COMPLETED";
      battery -= 2.0;
    } catch (Exception e) {
      stepStatus = "FAILED";
      currentStep = "RETURN_TO_BASE";
      stepStatus = "ACTIVE";
      activity.returnToBase(input.startLat, input.startLon);
      stepStatus = "COMPLETED";
      battery -= 10.0;
      lastUpdate = Workflow.currentTimeMillis();
      currentStep = "MISSION_COMPLETE";
      stepStatus = "COMPENSATED";
      return;
    }
    lastUpdate = Workflow.currentTimeMillis();

    currentStep = "RETURN_TO_BASE";
    stepStatus = "ACTIVE";
    waitForOnline();
    activity.returnToBase(input.startLat, input.startLon);
    stepStatus = "COMPLETED";
    battery -= 10.0;
    lastUpdate = Workflow.currentTimeMillis();

    currentStep = "MISSION_COMPLETE";
    stepStatus = "COMPLETED";
  }

  private void waitForOnline() {
    if (offline) {
      currentStep = "WAITING_FOR_RECONNECT";
      stepStatus = "PAUSED";
      Workflow.await(() -> reconnectReceived);
      reconnectReceived = false;
      offline = false;
    }
  }

  @Override
  public void signalReconnect(DroneReconnectSignal signal) {
    reconnectReceived = true;
    offline = false;
    lastUpdate = Workflow.currentTimeMillis();
  }

  @Override
  public void signalDroneOffline() {
    offline = true;
    lastUpdate = Workflow.currentTimeMillis();
  }

  @Override
  public void signalEmergencyAbort() {
    aborted = true;
    currentStep = "ABORTED";
    stepStatus = "COMPENSATED";
    reconnectReceived = true;
  }

  @Override
  public DroneMissionState queryState() {
    DroneMissionState state = new DroneMissionState();
    state.droneId = droneId;
    state.missionId = missionId;
    state.currentStep = currentStep;
    state.stepStatus = stepStatus;
    state.battery = battery;
    state.lastLat = lastLat;
    state.lastLon = lastLon;
    state.lastAlt = lastAlt;
    state.lastUpdate = lastUpdate;
    state.offline = offline;
    state.aborted = aborted;
    return state;
  }
} // battery discharge profile
 // Replay safe determinism
 // Saga compensation transaction flow
 // Telemetry timestamp capture
 // Battery floor guard
