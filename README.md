# Docker Hooks MCP

A demo project showcasing a complete CI/CD workflow with GitLab, Docker, and automated testing.

## What is this?

A simple REST API for managing a todo list featuring:
- Automated CI/CD pipeline in GitLab
- Docker containerization
- Unit tests (Python/pytest) and E2E tests (JavaScript/Jest)
- Image publishing to GitLab Container Registry

## Tech Stack

| Component | Technology |
|-----------|------------|
| API | Node.js + Express |
| Database | PostgreSQL 15 |
| E2E Tests | Jest + Supertest |
| Unit Tests | Python + pytest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitLab CI/CD |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/todos` | Get all todos |
| POST | `/todos` | Create a new todo |
| DELETE | `/todos/:id` | Delete a todo |

## Running Locally

### Docker Compose (recommended)

```bash
# Start API + PostgreSQL
docker compose up -d

# Test
curl http://localhost:3000/todos

# Stop
docker compose down -v
```

### From GitLab Registry

```bash
# Create network
docker network create test-net

# Start PostgreSQL
docker run -d --name postgres-test --network test-net \
  -e POSTGRES_DB=testdb \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=testpass \
  postgres:15-alpine

# Start API from GitLab Registry
docker run -d --name api-test --network test-net \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://test:testpass@postgres-test:5432/testdb \
  registry.gitlab.com/docker-hooks-mcp-claude/docker-hooks-mcp/api:latest

# Test
curl http://localhost:3000/todos
```

## Running Tests

```bash
# Make sure API is running (docker compose up -d)

# E2E tests (JavaScript)
cd tests && API_URL=http://localhost:3000 npm test

# Unit tests (Python)
pip install -r requirements.txt
pytest tests/test_api.py -v
```

## CI/CD Pipeline

The GitLab pipeline consists of 5 stages:

```
validate → test:unit → test:e2e → docker:build → report
```

### Stages

| Stage | Job | Description |
|-------|-----|-------------|
| validate | validate:docker-compose | Validate docker-compose.yml |
| validate | validate:mcp-json | Validate mcp.json |
| test:unit | test:unit:python | Run pytest tests |
| test:e2e | test:e2e | Run Jest tests with Docker Compose |
| docker:build | docker:build:api | Build and push image to registry |
| report | report:summary | Test results summary |
| report | report:pages | Publish coverage to GitLab Pages |

## Project Structure

```
docker-hooks-mcp/
├── app/
│   └── api/
│       ├── Dockerfile        # API image
│       ├── server.js         # Express server
│       └── package.json
├── tests/
│   ├── api.test.js          # E2E tests (Jest)
│   ├── test_api.py          # Unit tests (pytest)
│   └── package.json
├── docker-compose.yml        # Local environment config
├── mcp.json                  # MCP configuration
├── .gitlab-ci.yml           # CI/CD pipeline
└── requirements.txt          # Python dependencies
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitLab CI/CD                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  │
│  │validate │→ │test:unit│→ │test:e2e │→ │docker:build│  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │  GitLab Container Registry │
                              │  registry.gitlab.com/...   │
                              └───────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Docker Network                         │
│  ┌─────────────────┐       ┌─────────────────────────┐  │
│  │   PostgreSQL    │◄──────│      Node.js API        │  │
│  │   :5432         │       │      :3000              │  │
│  └─────────────────┘       └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgres://test:testpass@localhost:5432/testdb | PostgreSQL connection string |
| PORT | 3000 | API port |
| API_URL | http://localhost:3000 | API URL for tests |

## License

MIT
