package com.aerosaga.activity;
import com.aerosaga.workflow.DroneMissionWorkflow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DroneMissionActivityImpl implements DroneMissionActivity {
  private static final Logger log = LoggerFactory.getLogger(DroneMissionActivityImpl.class);
  @Override
  public void takeoff(DroneMissionWorkflow.DroneMissionInput input) { log.info("Taking off"); }
  @Override
  public void navigateTo(double lat, double lon, double altitude) { log.info("Navigating"); }
  @Override
  public void dropPackage() { log.info("Dropping"); }
  @Override
  public void returnToBase(double lat, double lon) { log.info("Returning"); }
}
