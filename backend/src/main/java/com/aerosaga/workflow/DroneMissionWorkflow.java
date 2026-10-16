package com.aerosaga.workflow;
import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;

@WorkflowInterface
public interface DroneMissionWorkflow {
  @WorkflowMethod
  void execute(DroneMissionInput input);
  class DroneMissionInput {
    public String droneId;
  }
}
