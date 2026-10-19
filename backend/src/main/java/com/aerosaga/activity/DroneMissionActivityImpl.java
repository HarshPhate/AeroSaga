package com.aerosaga.activity;

import com.aerosaga.workflow.DroneMissionWorkflow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DroneMissionActivityImpl implements DroneMissionActivity {

  private static final Logger log = LoggerFactory.getLogger(DroneMissionActivityImpl.class);

  @Override
  public void takeoff(DroneMissionWorkflow.DroneMissionInput input) {
    log.info("Drone {} taking off from ({}, {}) at altitude {}", input.droneId, input.startLat, input.startLon, input.altitude);
    try {
      Thread.sleep(2000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Takeoff interrupted", e);
    }
    log.info("Drone {} airborne", input.droneId);
  }

  @Override
  public void navigateTo(double lat, double lon, double altitude) {
    log.info("Navigating to ({}, {}) at altitude {}", lat, lon, altitude);
    try {
      Thread.sleep(3000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Navigation interrupted", e);
    }
    log.info("Arrived at destination");
  }

  @Override
  public void dropPackage() {
    log.info("Dropping package");
    try {
      Thread.sleep(1000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Drop interrupted", e);
    }
    log.info("Package dropped");
  }

  @Override
  public void returnToBase(double lat, double lon) {
    log.info("Returning to base at ({}, {})", lat, lon);
    try {
      Thread.sleep(2000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Return interrupted", e);
    }
    log.info("Arrived at base");
  }
} // simulated navigation
