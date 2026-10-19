package com.aerosaga.activity;

import com.aerosaga.workflow.DroneMissionWorkflow;
import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface DroneMissionActivity {

  @ActivityMethod
  void takeoff(DroneMissionWorkflow.DroneMissionInput input);

  @ActivityMethod
  void navigateTo(double lat, double lon, double altitude);

  @ActivityMethod
  void dropPackage();

  @ActivityMethod
  void returnToBase(double lat, double lon);

  class DroneMissionInput {
    public String droneId;
    public String missionId;
    public double startLat;
    public double startLon;
    public double destLat;
    public double destLon;
    public double altitude;
  }
} // Idempotent activity definitions
