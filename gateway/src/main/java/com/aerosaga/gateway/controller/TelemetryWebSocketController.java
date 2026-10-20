package com.aerosaga.gateway.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
public class TelemetryWebSocketController {

  private final SimpMessagingTemplate messagingTemplate;

  public TelemetryWebSocketController(SimpMessagingTemplate messagingTemplate) {
    this.messagingTemplate = messagingTemplate;
  }

  @MessageMapping("/drone/telemetry")
  public void receiveTelemetry(@Payload Map<String, Object> telemetry) {
    // Broadcast live telemetry to all connected frontend clients
    messagingTemplate.convertAndSend("/topic/telemetry", telemetry);
  }

  @MessageMapping("/drone/offline")
  public void reportOffline(@Payload Map<String, Object> payload) {
    messagingTemplate.convertAndSend("/topic/drone-offline", payload);
  }

  @MessageMapping("/drone/reconnect")
  public void reportReconnect(@Payload Map<String, Object> payload) {
    messagingTemplate.convertAndSend("/topic/drone-reconnect", payload);
  }

  // Also support HTTP REST ingestion for high-frequency or lightweight simulators
  @PostMapping("/api/telemetry")
  @ResponseBody
  public Map<String, Object> postTelemetryHttp(@RequestBody Map<String, Object> telemetry) {
    messagingTemplate.convertAndSend("/topic/telemetry", telemetry);
    return Map.of("status", "ok", "droneId", telemetry.getOrDefault("droneId", ""));
  }
}
 // Payload validation
