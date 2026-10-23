package com.aerosaga.workflow;

import io.temporal.workflow.Async;
import io.temporal.workflow.ChildWorkflowOptions;
import io.temporal.workflow.Promise;
import io.temporal.workflow.Workflow;
import java.util.ArrayList;
import java.util.List;

public class FleetMissionWorkflowImpl implements FleetMissionWorkflow {

  private final String fleetId = "fleet-" + Workflow.randomUUID().toString().substring(0, 8);
  private volatile long lastUpdate = 0L;
  private int totalDrones = 0;
  private int completedDrones = 0;
  private int failedDrones = 0;

  @Override
  public void execute(FleetMissionInput input) {
    lastUpdate = Workflow.currentTimeMillis();
    totalDrones = input.drones != null ? input.drones.size() : 0;

    List<Promise<Void>> promises = new ArrayList<>();

    for (DroneMissionWorkflow.DroneMissionInput droneInput : input.drones) {
      ChildWorkflowOptions options = ChildWorkflowOptions.newBuilder()
          .setWorkflowId("drone-mission-" + droneInput.droneId)
          .setTaskQueue("drone-mission-queue")
          .build();
      DroneMissionWorkflow child = Workflow.newChildWorkflowStub(
          DroneMissionWorkflow.class, options);
      promises.add(Async.procedure(child::execute, droneInput));
    }

    // Wait for all child drone workflows to complete in parallel
    for (Promise<Void> promise : promises) {
      try {
        promise.get();
        completedDrones++;
      } catch (Exception e) {
        failedDrones++;
      }
    }

    lastUpdate = Workflow.currentTimeMillis();
  }

  @Override
  public void signalEmergencyAbort(String droneId) {
    DroneMissionWorkflow stub = Workflow.newExternalWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    stub.signalEmergencyAbort();
  }

  @Override
  public void signalDroneReconnect(String droneId) {
    DroneMissionWorkflow stub = Workflow.newExternalWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    var signal = new DroneMissionWorkflow.DroneReconnectSignal();
    signal.droneId = droneId;
    signal.reconnectTimestamp = Workflow.currentTimeMillis();
    stub.signalReconnect(signal);
  }

  @Override
  public void signalDroneOffline(String droneId) {
    DroneMissionWorkflow stub = Workflow.newExternalWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    stub.signalDroneOffline();
  }

  @Override
  public FleetMissionState queryState() {
    FleetMissionState state = new FleetMissionState();
    state.fleetId = fleetId;
    state.totalDrones = totalDrones;
    state.completedDrones = completedDrones;
    state.failedDrones = failedDrones;
    state.activeDrones = Math.max(0, totalDrones - completedDrones - failedDrones);
    state.lastUpdate = lastUpdate;
    return state;
  }
}
 // Parallel saga completion tracking
 // Promise aggregation
