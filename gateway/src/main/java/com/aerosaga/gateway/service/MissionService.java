package com.aerosaga.gateway.service;

import com.aerosaga.workflow.DroneMissionWorkflow;
import com.aerosaga.workflow.FleetMissionWorkflow;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowOptions;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.UUID;

@Service
public class MissionService {

  private final WorkflowClient workflowClient;

  public MissionService(WorkflowClient workflowClient) {
    this.workflowClient = workflowClient;
  }

  public String startFleetMission(int droneCount, double startLat, double startLon,
                                  double destLat, double destLon, double altitude) {
    String fleetId = "fleet-" + UUID.randomUUID().toString().substring(0, 8);

    FleetMissionWorkflow.FleetMissionInput fleetInput = new FleetMissionWorkflow.FleetMissionInput();
    fleetInput.drones = new ArrayList<>();

    for (int i = 0; i < droneCount; i++) {
      String droneId = "drone-" + i;
      DroneMissionWorkflow.DroneMissionInput input = new DroneMissionWorkflow.DroneMissionInput();
      input.droneId = droneId;
      input.missionId = "mission-" + droneId;
      input.startLat = startLat;
      input.startLon = startLon;
      input.destLat = destLat;
      input.destLon = destLon;
      input.altitude = altitude;
      fleetInput.drones.add(input);
    }

    WorkflowOptions options = WorkflowOptions.newBuilder()
        .setWorkflowId(fleetId)
        .setTaskQueue("fleet-mission-queue")
        .build();

    FleetMissionWorkflow fleetStub = workflowClient.newWorkflowStub(FleetMissionWorkflow.class, options);
    // Non-blocking asynchronous start of parent fleet workflow
    WorkflowClient.start(fleetStub::execute, fleetInput);

    return fleetId;
  }

  public void startDroneMission(String droneId, double startLat, double startLon,
                                double destLat, double destLon, double altitude) {
    DroneMissionWorkflow.DroneMissionInput input = new DroneMissionWorkflow.DroneMissionInput();
    input.droneId = droneId;
    input.missionId = "mission-" + droneId;
    input.startLat = startLat;
    input.startLon = startLon;
    input.destLat = destLat;
    input.destLon = destLon;
    input.altitude = altitude;

    WorkflowOptions options = WorkflowOptions.newBuilder()
        .setWorkflowId("drone-mission-" + droneId)
        .setTaskQueue("drone-mission-queue")
        .build();

    DroneMissionWorkflow stub = workflowClient.newWorkflowStub(DroneMissionWorkflow.class, options);
    // Non-blocking asynchronous start of individual drone workflow
    WorkflowClient.start(stub::execute, input);
  }

  public DroneMissionWorkflow.DroneMissionState queryDroneState(String droneId) {
    DroneMissionWorkflow stub = workflowClient.newWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    return stub.queryState();
  }

  public void signalEmergencyAbort(String droneId) {
    DroneMissionWorkflow stub = workflowClient.newWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    stub.signalEmergencyAbort();
  }

  public void signalDroneReconnect(String droneId) {
    DroneMissionWorkflow stub = workflowClient.newWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    DroneMissionWorkflow.DroneReconnectSignal signal = new DroneMissionWorkflow.DroneReconnectSignal();
    signal.droneId = droneId;
    signal.reconnectTimestamp = System.currentTimeMillis();
    stub.signalReconnect(signal);
  }

  public void signalDroneOffline(String droneId) {
    DroneMissionWorkflow stub = workflowClient.newWorkflowStub(
        DroneMissionWorkflow.class, "drone-mission-" + droneId);
    stub.signalDroneOffline();
  }
}
 // Asynchronous execution path
 // Abort logging
 // Reconnect logging
