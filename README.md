# CSV Intelligence Layer

> **⚠️ Beta Status**: This project is currently in beta. Features and APIs may change.

A production-grade data ingestion and normalization service that treats CSVs as hostile input and processes them through a deterministic, multi-stage pipeline.

## 🚀 Live Demo

[![Try Live Demo](https://img.shields.io/badge/Try%20Live%20Demo-4285F4?style=for-the-badge&logo=vercel&logoColor=white)](https://csv-intelligence.vercel.app/)
[![Watch Demo Video](https://img.shields.io/badge/Watch%20Demo%20Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/YmJzh_EW9fU)

- **Frontend**: [https://csv-intelligence.vercel.app/](https://csv-intelligence.vercel.app/)
- **Backend API**: [https://csv-intelligence-layer-production.up.railway.app](https://csv-intelligence-layer-production.up.railway.app)

## Overview

This service functions like a **compiler for data** — inferring schema, reconciling with user-defined expectations, normalizing types, validating constraints, and producing explainable outputs.

### Key Features

- **Safe Streaming Parser**: Handles malformed CSVs, detects encoding/delimiters
- **Type Inference**: Automatically detects column types with confidence scores
- **Schema Reconciliation**: Maps source columns to canonical schema using heuristics
- **Human-in-the-Loop**: Pauses pipeline on ambiguity, exposes decisions via API
- **Decision Persistence**: Reuses mapping decisions for future ingestions
- **Explainability**: Full audit trail of every decision made

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    PARSE    │ ──▶ │    INFER    │ ──▶ │     MAP     │ ──▶ │  VALIDATE   │ ──▶ │   OUTPUT    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  HUMAN REVIEW   │
                                    │   (if needed)   │
                                    └─────────────────┘
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20+, TypeScript
- **API**: Fastify with Zod validation & Swagger/OpenAPI docs
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL + Drizzle ORM
- **Storage**: Local filesystem (dev) / S3-ready (production)
- **AI**: OpenAI integration for ambiguous column mapping

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui components
- **State**: Zustand for history management
- **API Client**: Native fetch with type-safe interfaces
- **Deployment**: Vercel with Analytics

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Setup

```bash
# Clone and install
git clone <repo-url>
cd csv-intelligence-layer
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure (Postgres, Redis)
pnpm docker:up

# Generate database migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server (in separate terminals)
pnpm dev          # API server
pnpm worker:dev   # Background workers
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Copy environment file and configure API URL
cp .env.example .env
# Edit .env and set VITE_API_URL to your backend URL

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The frontend will be available at `http://localhost:5173` and includes:
- Interactive CSV upload playground
- Schema management interface
- Real-time pipeline status tracking
- Decision review panel for ambiguous mappings
- Ingestion history viewer

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/schemas` | Create a canonical schema |
| `GET` | `/schemas` | List all schemas |
| `GET` | `/schemas/:id` | Get schema by ID |
| `POST` | `/ingestions?schemaId={uuid}` | Upload CSV and start pipeline |
| `GET` | `/ingestions/:id` | Get ingestion status and results |
| `GET` | `/ingestions/:id/review` | Get pending decisions (awaiting_review status) |
| `POST` | `/ingestions/:id/resolve` | Submit human decisions to resume pipeline |
| `GET` | `/ingestions/:id/output?format=csv\|json` | Download cleaned data (CSV or JSON) |
| `GET` | `/ingestions/:id/decisions` | Get decision audit log |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive Swagger API documentation |

### Example Usage

```bash
# 1. Create a canonical schema
curl -X POST http://localhost:3000/schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customers",
    "version": "1.0.0",
    "columns": [
      {"name": "email", "type": "email", "required": true},
      {"name": "name", "type": "string", "required": true},
      {"name": "signup_date", "type": "date"}
    ]
  }'

# 2. Upload a CSV for ingestion
curl -X POST "http://localhost:3000/ingestions?schemaId=<schema-id>" \
  -F "file=@customers.csv"

# 3. Check status
curl http://localhost:3000/ingestions/<ingestion-id>

# 4. If awaiting_review, resolve ambiguities
curl -X POST http://localhost:3000/ingestions/<id>/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "decisions": [
      {"sourceColumn": "user_email", "targetColumn": "email"}
    ]
  }'

# 5. Download cleaned output
curl -O http://localhost:3000/ingestions/<id>/output
```

## Development

### Project Structure

```
.
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # UI components (schema, pipeline, upload)
│   │   ├── pages/        # Route pages (Home, Playground, Docs, About)
│   │   ├── lib/          # API client, config, utilities
│   │   ├── hooks/        # React hooks for data fetching
│   │   ├── stores/       # Zustand state management
│   │   └── types/        # TypeScript type definitions
│   └── vercel.json       # Vercel deployment config
│
├── src/                   # Backend application
│   ├── api/              # Fastify route handlers
│   │   ├── health.ts
│   │   ├── ingestions.ts
│   │   └── schemas.ts
│   ├── db/               # Database schema and connection
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── services/         # Business logic
│   │   ├── column-mapping.ts    # AI-powered column mapping
│   │   ├── csv-parser.ts        # Streaming CSV parser
│   │   ├── storage.ts           # Storage abstraction layer
│   │   └── type-inference.ts    # Column type detection
│   ├── workers/          # BullMQ job processors
│   │   ├── index.ts             # Worker orchestration
│   │   ├── parse.worker.ts      # CSV parsing stage
│   │   ├── infer.worker.ts      # Type inference stage
│   │   ├── map.worker.ts        # Column mapping stage
│   │   ├── validate.worker.ts   # Data validation stage
│   │   ├── output.worker.ts     # Output generation stage
│   │   └── queues.ts            # Queue definitions
│   ├── types/            # TypeScript types and Zod schemas
│   ├── utils/            # Utilities (logger, waitForDeps)
│   ├── config.ts         # Environment configuration
│   ├── index.ts          # API server entry point
│   ├── prod-entry.ts     # Production entry point
│   └── server.ts         # Fastify server setup
│
└── docker-compose.yml    # Local dev infrastructure
```

### Running Tests

```bash
pnpm test           # Watch mode
pnpm test:run       # Single run
pnpm test:coverage  # With coverage
```

### Database

```bash
pnpm db:generate    # Generate migrations from schema
pnpm db:migrate     # Apply migrations
pnpm db:studio      # Open Drizzle Studio (visual editor)
```

## Roadmap

### ✅ Completed
- [x] Full 5-stage pipeline (parse → infer → map → validate → output)
- [x] All worker implementations (BullMQ-based)
- [x] OpenAI integration for intelligent column mapping
- [x] Human-in-the-loop review system
- [x] Decision audit logging
- [x] Interactive web UI (React + TailwindCSS)
- [x] Swagger/OpenAPI documentation
- [x] Multi-format output (CSV, JSON)
- [x] Production deployment (Railway + Vercel)
- [X] Complete S3 storage implementation for production scale

### 🚧 In Progress / Planned
- [ ] Webhook notifications for pipeline completion
- [ ] Comprehensive test suite (unit + integration)
- [ ] Advanced validation rules engine
- [ ] Batch ingestion support
- [ ] Rate limiting and API key authentication
- [ ] Data quality scoring and reports

## License

MIT
