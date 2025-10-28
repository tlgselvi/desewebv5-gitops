# EA Plan v6.0 Microservices Structure

This directory contains the microservices architecture for EA Plan v6.0.

## Services Overview

- **auth-service**: Authentication and authorization
- **metrics-service**: Metrics collection and processing
- **events-service**: Event streaming and processing
- **alerts-service**: Alert management and notifications
- **ml-service**: Machine learning and anomaly detection
- **api-gateway**: Kong-based API gateway
- **shared-libs**: Common libraries and utilities

## Architecture

Each service follows the microservices pattern with:
- Fastify-based REST APIs
- Docker containerization
- Kubernetes deployment
- Prometheus metrics
- Health checks
- Event-driven communication via Kafka
