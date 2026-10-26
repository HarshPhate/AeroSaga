package com.aerosaga.gateway.config;

import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowClientOptions;
import io.temporal.serviceclient.WorkflowServiceStubs;
import io.temporal.serviceclient.WorkflowServiceStubsOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TemporalClientConfig {

  @Bean
  public WorkflowServiceStubs workflowServiceStubs(
      @Value("${temporal.client.host:localhost}") String host,
      @Value("${temporal.client.port:7233}") int port) {
    WorkflowServiceStubsOptions options = WorkflowServiceStubsOptions.newBuilder()
        .setTarget(host + ":" + port)
        .build();
    return WorkflowServiceStubs.newInstance(options);
  }

  @Bean
  public WorkflowClient workflowClient(WorkflowServiceStubs workflowServiceStubs,
      @Value("${temporal.client.namespace:default}") String namespace) {
    WorkflowClientOptions options = WorkflowClientOptions.newBuilder()
        .setNamespace(namespace)
        .build();
    return WorkflowClient.newInstance(workflowServiceStubs, options);
  }
}