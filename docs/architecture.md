# GitHub Release Subscription API Architecture

This document provides a high-level architectural overview of the GitHub Release Subscription API system. It outlines the service boundaries, communication protocols, and internal component flows that enable users to subscribe to repository releases and receive automated notifications.

## High-Level System Design

The system consists of a main entry point and three dedicated microservices:

- **Core Subscription Service:** The main entry point that exposes user-facing APIs, manages subscription lifecycles, and coordinates sagas.
- **GitHub Service:** Handles all direct interactions with the GitHub API for repository validation and data fetching.
- **Tracker Service:** Periodically scans tracked repositories for new releases and publishes discovery events.
- **Notification Service:** Renders email templates and delivers user notifications via SMTP.

---

## System Architecture

The following diagram illustrates how the four primary services interact with each other and cross external network boundaries using HTTP, gRPC, and RabbitMQ.

```mermaid
graph TD
    Client[Client] -->|HTTP/REST| Core[Subscription Service]

    Tracker -->|gRPC| GH[GitHub Service]

    Tracker -->|Release detected| RMQ((RabbitMQ))
    Tracker -->|Saga reply| RMQ
    Core -->|Saga command| RMQ
    Core -->|Subscription event| RMQ

    RMQ -->|Release detected| Core
    RMQ -->|Saga reply| Core
    RMQ -->|Saga command| Tracker[Tracker Service]
    RMQ -->|Subscription event| Notification[Notification Service]

    GH -->|HTTP/REST| GHAPI[GitHub API]
    Notification -->|SMTP| SMTP[SMTP Host]

    classDef service fill:#21262d,stroke:#30363d,stroke-width:2px,color:#c9d1d9;
    classDef broker fill:#161b22,stroke:#8b949e,stroke-width:2px,color:#c9d1d9;
    classDef external fill:#161b22,stroke:#484f58,stroke-width:1px,stroke-dasharray: 5 5,color:#8b949e;

    class Core,GH,Tracker,Notification service;
    class RMQ broker;
    class GHAPI,SMTP,Client external;
```

---

## Component-Level Service Architecture

### 1. Core Subscription Service

Exposes the public REST API, orchestrates multi-service subscription lifecycles using the Saga pattern, and processes incoming system events via decoupled consumers.

```mermaid
graph TD
    subgraph Presentation["Presentation"]
        Controller[HTTP Controller]
        Consumers[RabbitMQ Consumers]
    end

    subgraph Application["Application"]
        SubService[Subscription Service]
        Saga[Saga Orchestrator]
    end

    subgraph Infrastructure["Infrastructure"]
        PrismaRepo[Prisma Repositories]
        SagaRepo[Saga State Repository]
        Producers[RabbitMQ Producers]
    end

    DB[(PostgreSQL)]

    Controller --> SubService
    Consumers -->|Release / Repo Events| SubService
    Consumers -->|Saga Replies| Saga

    SubService --> PrismaRepo
    SubService --> Producers
    Saga --> SagaRepo
    Saga --> SubService
    Saga --> Producers

    PrismaRepo --> DB
    SagaRepo --> DB

    classDef component fill:#21262d,stroke:#30363d,stroke-width:1px,color:#c9d1d9;
    classDef database fill:#161b22,stroke:#484f58,stroke-width:1px,color:#8b949e;

    class Controller,Consumers,SubService,Saga,PrismaRepo,SagaRepo,Producers component;
    class DB database;

    style Presentation fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Application fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Infrastructure fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
```

### 2. Tracker Service

An autonomous tracking module triggered by background cron schedules to scan repository updates, validate against the GitHub adapter, and broadcast discovered mutations.

```mermaid
graph TD
    subgraph Presentation["Presentation"]
        Cron[Cron Jobs Scheduler]
        Consumer[RabbitMQ Consumer]
    end

    subgraph Application["Application"]
        Scanner[Scanner Service]
        RepoService[Repository Service]
    end

    subgraph Infrastructure["Infrastructure"]
        GHClient[GitHub gRPC Client]
        Producers[RabbitMQ Producers]
        RepoRepo[Repository Repository]
    end

        DB[(PostgreSQL)]


    Cron --> Scanner
    Consumer -->|Repository commands| RepoService

    Scanner --> GHClient
    Scanner --> Producers
    Scanner --> RepoService

    RepoService --> RepoRepo
    RepoService --> Producers
    RepoService --> GHClient

    RepoRepo --> DB

    classDef component fill:#21262d,stroke:#30363d,stroke-width:1px,color:#c9d1d9;
    classDef database fill:#161b22,stroke:#484f58,stroke-width:1px,color:#8b949e;

    class Cron,Consumer,Scanner,RepoService,GHClient,Producers,RepoRepo component;
    class DB database;

    style Presentation fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Application fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Infrastructure fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
```

### 3. GitHub Service

Acts as a stateless, synchronous proxy isolation layer that abstracts the rate-limited external GitHub API endpoints away from internal callers.

```mermaid
graph TD
    subgraph Presentation["Presentation"]
        gRPC[gRPC Handler]
        HTTP[HTTP Controller]
    end

    subgraph Application["Application"]
        Service[GitHub Service]
    end

    subgraph Infrastructure["Infrastructure"]
        Client[HTTP Client & Rate Limiter]
    end

    ExtAPI((GitHub API))

    gRPC --> Service
    HTTP --> Service
    Service --> Client
    Client --> ExtAPI

    classDef component fill:#21262d,stroke:#30363d,stroke-width:1px,color:#c9d1d9;
    classDef external fill:#161b22,stroke:#484f58,stroke-width:1px,stroke-dasharray: 5 5,color:#8b949e;

    class gRPC,HTTP,Service,Client component;
    class ExtAPI external;

    style Presentation fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Application fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Infrastructure fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
```

### 4. Notification Service

An asynchronous worker designed exclusively for template rendering and reliable end-user email distribution without side effects or persistence layers.

```mermaid
graph TD
    subgraph Presentation["Presentation"]
        Consumer[RabbitMQ Consumer]
    end

    subgraph Application["Application"]
        EmailService[Email Service]
        Templates[Templates]
    end

    subgraph Infrastructure["Infrastructure"]
        Provider[Email Provider]
    end

    SMTP((SMTP Host))


    Consumer --> EmailService
    EmailService --> Templates
    EmailService --> Provider
    Provider --> SMTP

    classDef component fill:#21262d,stroke:#30363d,stroke-width:1px,color:#c9d1d9;
    classDef external fill:#161b22,stroke:#484f58,stroke-width:1px,stroke-dasharray: 5 5,color:#8b949e;

    class Consumer,EmailService,Templates,Provider component;
    class SMTP external;

    style Presentation fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Application fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
    style Infrastructure fill:transparent,stroke:#484f58,stroke-width:1px,color:#c9d1d9,stroke-dasharray: 5 5
```
