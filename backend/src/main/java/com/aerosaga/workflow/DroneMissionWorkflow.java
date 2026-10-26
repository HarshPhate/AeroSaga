package com.aerosaga.workflow;

import io.temporal.activity.ActivityOptions;
import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;
import io.temporal.workflow.SignalMethod;
import io.temporal.workflow.QueryMethod;

@WorkflowInterface
public interface DroneMissionWorkflow {

  @WorkflowMethod
  void execute(DroneMissionInput input);

  @SignalMethod
  void signalReconnect(DroneReconnectSignal signal);

  @SignalMethod
  void signalDroneOffline();

  @SignalMethod
  void signalEmergencyAbort();

  @QueryMethod
  DroneMissionState queryState();

  class DroneMissionInput {
    public String droneId;
    public String missionId;
    public double startLat;
    public double startLon;
    public double destLat;
    public double destLon;
    public double altitude;
  }

  class DroneReconnectSignal {
    public String droneId;
    public long reconnectTimestamp;
  }

  class DroneMissionState {
    public String droneId;
    public String missionId;
    public String currentStep;
    public String stepStatus;
    public double battery;
    public double lastLat;
    public double lastLon;
    public double lastAlt;
    public long lastUpdate;
    public boolean offline;
    public boolean aborted;
  }
}