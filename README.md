# CSV Intelligence Layer

A production-grade data ingestion and normalization service that treats CSVs as hostile input and processes them through a deterministic, multi-stage pipeline.

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

- **Runtime**: Node.js 20+, TypeScript
- **API**: Fastify with Zod validation
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL + Drizzle ORM
- **Storage**: Local filesystem (dev) / S3 (production)

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

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/schemas` | Create a canonical schema |
| `GET` | `/schemas` | List all schemas |
| `GET` | `/schemas/:id` | Get schema by ID |
| `POST` | `/ingestions` | Upload CSV and start pipeline |
| `GET` | `/ingestions/:id` | Get ingestion status |
| `GET` | `/ingestions/:id/review` | Get pending decisions |
| `POST` | `/ingestions/:id/resolve` | Submit human decisions |
| `GET` | `/ingestions/:id/output` | Download cleaned CSV |
| `GET` | `/ingestions/:id/decisions` | Get decision audit log |
| `GET` | `/health` | Health check |

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
src/
├── api/              # Fastify route handlers
│   ├── health.ts
│   ├── ingestions.ts
│   └── schemas.ts
├── db/               # Database schema and connection
│   ├── index.ts
│   └── schema.ts
├── services/         # Business logic
│   ├── column-mapping.ts
│   ├── csv-parser.ts
│   ├── storage.ts
│   └── type-inference.ts
├── workers/          # BullMQ job processors
│   ├── index.ts
│   ├── parse.worker.ts
│   └── queues.ts
├── types/            # TypeScript types and Zod schemas
│   └── index.ts
├── utils/            # Utilities
│   └── logger.ts
├── config.ts         # Environment configuration
├── index.ts          # Entry point
└── server.ts         # Fastify server setup
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

## TODO

- [ ] Implement infer worker
- [ ] Implement map worker (with AI fallback)
- [ ] Implement validate worker
- [ ] Implement output worker
- [ ] Add S3 storage support
- [ ] Add OpenAI integration for ambiguous mappings
- [ ] Add webhook notifications
- [ ] Add comprehensive test suite

## License

MIT
