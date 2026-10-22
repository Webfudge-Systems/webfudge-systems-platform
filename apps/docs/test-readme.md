---
title: Payment Gateway integration
---

# Payment Gateway Setup

This is the payment gateway integration guide.

## System Topology

The payment gateway communicates with several external APIs.

```mermaid
flowchart TD
    A[Client] --> B[API Gateway]
    B --> C[Payment Service]
    C --> D[Bank API]
```

> [!WARNING]
> Do not expose your private keys.
