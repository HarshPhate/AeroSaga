package com.aerosaga.workflow;
import com.aerosaga.activity.DroneMissionActivity;
import io.temporal.workflow.Workflow;

public class DroneMissionWorkflowImpl implements DroneMissionWorkflow {
  @Override public void execute(DroneMissionInput input) {}
  @Override public void signalReconnect(DroneReconnectSignal signal) {}
  @Override public void signalDroneOffline() {}
  @Override public void signalEmergencyAbort() {}
  @Override public DroneMissionState queryState() { return new DroneMissionState(); }
}
