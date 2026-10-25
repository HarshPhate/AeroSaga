package com.aerosaga.config;

import com.aerosaga.activity.DroneMissionActivityImpl;
import com.aerosaga.workflow.DroneMissionWorkflowImpl;
import com.aerosaga.workflow.FleetMissionWorkflowImpl;
import io.temporal.client.WorkflowClient;
import io.temporal.worker.Worker;
import io.temporal.worker.WorkerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WorkerConfig {

  @Bean
  public WorkerFactory workerFactory(WorkflowClient workflowClient) {
    return WorkerFactory.newInstance(workflowClient);
  }

  @Bean
  public Worker droneWorker(WorkerFactory workerFactory) {
    var worker = workerFactory.newWorker("drone-mission-queue");
    worker.registerWorkflowImplementationTypes(DroneMissionWorkflowImpl.class);
    worker.registerActivitiesImplementations(new DroneMissionActivityImpl());
    return worker;
  }

  @Bean
  public Worker fleetWorker(WorkerFactory workerFactory) {
    var worker = workerFactory.newWorker("fleet-mission-queue");
    worker.registerWorkflowImplementationTypes(FleetMissionWorkflowImpl.class);
    worker.registerWorkflowImplementationTypes(DroneMissionWorkflowImpl.class);
    worker.registerActivitiesImplementations(new DroneMissionActivityImpl());
    return worker;
  }

  @Bean
  CommandLineRunner startWorkers(WorkerFactory workerFactory) {
    return args -> workerFactory.start();
  }
} // worker thread config
 // Worker lifecycle runner
