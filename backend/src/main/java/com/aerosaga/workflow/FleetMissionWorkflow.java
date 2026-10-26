package com.aerosaga.workflow;

import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;
import io.temporal.workflow.SignalMethod;
import io.temporal.workflow.QueryMethod;
import java.util.List;
import java.util.ArrayList;

@WorkflowInterface
public interface FleetMissionWorkflow {

  @WorkflowMethod
  void execute(FleetMissionInput input);

  @SignalMethod
  void signalEmergencyAbort(String droneId);

  @SignalMethod
  void signalDroneReconnect(String droneId);

  @SignalMethod
  void signalDroneOffline(String droneId);

  @QueryMethod
  FleetMissionState queryState();

  class FleetMissionInput {
    public List<DroneMissionWorkflow.DroneMissionInput> drones = new ArrayList<>();
  }

  class DroneSummary {
    public String droneId;
    public String missionId;
    public String currentStep;
    public String stepStatus;
    public double battery;
    public double lastLat;
    public double lastLon;
    public boolean offline;
    public boolean aborted;
  }

  class FleetMissionState {
    public String fleetId;
    public int totalDrones;
    public int activeDrones;
    public int completedDrones;
    public int failedDrones;
    public int offlineDrones;
    public List<DroneSummary> drones = new ArrayList<>();
    public long lastUpdate;
  }
}