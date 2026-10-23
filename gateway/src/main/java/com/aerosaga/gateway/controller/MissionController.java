package com.aerosaga.gateway.controller;

import com.aerosaga.gateway.service.MissionService;
import com.aerosaga.workflow.DroneMissionWorkflow;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MissionController {

  private final MissionService missionService;

  public MissionController(MissionService missionService) {
    this.missionService = missionService;
  }

  @PostMapping("/missions/start")
  public ResponseEntity<String> startMission(@RequestBody Map<String, Object> body) {
    int droneCount = Integer.parseInt(body.getOrDefault("droneCount", "10").toString());
    double startLat = Double.parseDouble(body.getOrDefault("startLat", "37.7749").toString());
    double startLon = Double.parseDouble(body.getOrDefault("startLon", "-122.4194").toString());
    double destLat = Double.parseDouble(body.getOrDefault("destLat", "34.0522").toString());
    double destLon = Double.parseDouble(body.getOrDefault("destLon", "-118.2437").toString());
    double altitude = Double.parseDouble(body.getOrDefault("altitude", "120").toString());

    String fleetId = missionService.startFleetMission(droneCount, startLat, startLon,
        destLat, destLon, altitude);
    return ResponseEntity.ok(fleetId);
  }

  @PostMapping("/missions/{droneId}/start")
  public ResponseEntity<Void> startDroneMission(@PathVariable String droneId,
                                                @RequestBody Map<String, Object> body) {
    double startLat = Double.parseDouble(body.getOrDefault("startLat", "37.7749").toString());
    double startLon = Double.parseDouble(body.getOrDefault("startLon", "-122.4194").toString());
    double destLat = Double.parseDouble(body.getOrDefault("destLat", "34.0522").toString());
    double destLon = Double.parseDouble(body.getOrDefault("destLon", "-118.2437").toString());
    double altitude = Double.parseDouble(body.getOrDefault("altitude", "120").toString());

    missionService.startDroneMission(droneId, startLat, startLon, destLat, destLon, altitude);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/missions/{droneId}/state")
  public ResponseEntity<DroneMissionWorkflow.DroneMissionState> getDroneState(@PathVariable String droneId) {
    try {
      DroneMissionWorkflow.DroneMissionState state = missionService.queryDroneState(droneId);
      return ResponseEntity.ok(state);
    } catch (Exception e) {
      DroneMissionWorkflow.DroneMissionState fallback = new DroneMissionWorkflow.DroneMissionState();
      fallback.droneId = droneId;
      fallback.currentStep = "INIT";
      fallback.stepStatus = "PENDING";
      fallback.battery = 100.0;
      fallback.offline = false;
      fallback.aborted = false;
      return ResponseEntity.ok(fallback);
    }
  }

  @PostMapping("/missions/{droneId}/abort")
  public ResponseEntity<Void> emergencyAbort(@PathVariable String droneId) {
    try {
      missionService.signalEmergencyAbort(droneId);
    } catch (Exception ignored) {
    }
    return ResponseEntity.ok().build();
  }

  @PostMapping("/missions/{droneId}/reconnect")
  public ResponseEntity<Void> droneReconnect(@PathVariable String droneId) {
    try {
      missionService.signalDroneReconnect(droneId);
    } catch (Exception ignored) {
    }
    return ResponseEntity.ok().build();
  }

  @PostMapping("/missions/{droneId}/offline")
  public ResponseEntity<Void> droneOffline(@PathVariable String droneId) {
    try {
      missionService.signalDroneOffline(droneId);
    } catch (Exception ignored) {
    }
    return ResponseEntity.ok().build();
  }
}
 // Signal dispatch error handling
 // Cross-origin resource sharing
