# Docker Hooks MCP

A demo project showcasing a complete CI/CD workflow with GitLab, Jenkins, Docker, and automated testing.

## What is this?

A simple REST API for managing a todo list featuring:
- Automated CI/CD pipeline in GitLab and Jenkins
- Docker containerization with multi-stage builds
- E2E tests (JavaScript/Jest) with JUnit reporting
- Unit tests (Python/pytest)
- Image publishing to GitLab Container Registry

## Tech Stack

| Component | Technology |
|-----------|------------|
| API | Node.js + Express |
| Database | PostgreSQL 15 |
| E2E Tests | Jest + Supertest |
| Unit Tests | Python + pytest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitLab CI/CD + Jenkins |

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

---

## Jenkins CI/CD

This project includes a complete Jenkins pipeline for automated builds and testing.

### Jenkins Stack Setup

Start Jenkins with Docker-in-Docker support:

```bash
# Start Jenkins stack
docker-compose -f jenkins-stack.yml up -d

# Get initial admin password
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword

# Open Jenkins UI
open http://localhost:8080
```

### Required Jenkins Plugins

Install these plugins via Jenkins UI or CLI:

```bash
docker exec jenkins jenkins-plugin-cli --plugins \
  docker-workflow \
  docker-commons \
  git \
  junit \
  workflow-aggregator \
  pipeline-utility-steps
```

### Jenkins Credentials Setup

1. Go to **Manage Jenkins** → **Credentials**
2. Add new credential:
   - **Kind**: Username with password
   - **Username**: Your GitLab username
   - **Password**: GitLab Personal Access Token (scope: `read_repository`)
   - **ID**: `gitlab-git`

### Jenkins Pipeline Stages

```
┌──────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
│ Checkout │ → │ Validate │ → │  Build  │ → │ Test:E2E │
└──────────┘   └──────────┘   └─────────┘   └──────────┘
                                                  │
                                                  ▼
┌──────────┐   ┌──────────┐   ┌─────────────────────────┐
│ Cleanup  │ ← │  Report  │ ← │ Publish Test Results    │
└──────────┘   └──────────┘   └─────────────────────────┘
```

| Stage | Description |
|-------|-------------|
| **Checkout** | Clone repository from GitLab using credentials |
| **Validate** | Validate docker-compose.yml syntax |
| **Build** | Build Docker images with docker-compose |
| **Test: E2E** | Start stack, run Jest tests, generate JUnit report |
| **Publish Test Results** | Archive JUnit XML for Jenkins test trends |
| **Report** | Display build summary (images, containers) |
| **Cleanup** | Stop containers and remove volumes |

### Viewing Test Reports in Jenkins

After running the pipeline:

1. Go to job page: `http://localhost:8080/job/docker-hooks-mcp/`
2. Click on a specific build (e.g., #24)
3. Click **"Test Result"** in the left menu
4. View detailed test results and history trends

### Jenkins Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    jenkins-stack.yml                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │    Jenkins      │   TLS   │    Docker-in-Docker     │   │
│  │   Controller    │ ◄─────► │        (dind)           │   │
│  │   :8080         │         │        :2376            │   │
│  └─────────────────┘         └─────────────────────────┘   │
│           │                              │                  │
│           │                              ▼                  │
│           │                   ┌─────────────────────────┐  │
│           │                   │   Build Containers      │  │
│           │                   │   - API                 │  │
│           │                   │   - PostgreSQL          │  │
│           │                   │   - Test runner         │  │
│           ▼                   └─────────────────────────┘  │
│  ┌─────────────────┐                                       │
│  │ Jenkins Volumes │                                       │
│  │ - jenkins_home  │                                       │
│  │ - docker_certs  │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### How Docker-in-Docker Works

Jenkins runs inside a Docker container and builds application containers inside a **nested Docker daemon**. This is called **Docker-in-Docker (DinD)**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST (Your computer)                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Docker Engine (host)                           │ │
│  │                                                             │ │
│  │  ┌─────────────────┐      ┌─────────────────────────────┐  │ │
│  │  │    Jenkins      │      │    Docker-in-Docker (dind)  │  │ │
│  │  │   Container     │ TLS  │        Container            │  │ │
│  │  │                 │◄────►│                             │  │ │
│  │  │  "build image"  │      │  ┌───────────────────────┐  │  │ │
│  │  │                 │      │  │  Docker Engine (nested)│  │  │ │
│  │  │                 │      │  │                       │  │  │ │
│  │  │                 │      │  │  ┌─────────────────┐  │  │  │ │
│  │  │                 │      │  │  │   API Container │  │  │  │ │
│  │  │                 │      │  │  │   (being built) │  │  │  │ │
│  │  │                 │      │  │  └─────────────────┘  │  │  │ │
│  │  │                 │      │  │                       │  │  │ │
│  │  │                 │      │  │  ┌─────────────────┐  │  │  │ │
│  │  │                 │      │  │  │   PostgreSQL    │  │  │  │ │
│  │  │                 │      │  │  │   Container     │  │  │  │ │
│  │  │                 │      │  │  └─────────────────┘  │  │  │ │
│  │  │                 │      │  └───────────────────────┘  │  │ │
│  │  └─────────────────┘      └─────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Build Flow

```
1. Jenkins (container) receives command "docker-compose build"
                    │
                    ▼
2. Jenkins sends command to Docker-in-Docker via TLS (port 2376)
                    │
                    ▼
3. DinD (container) runs its own Docker daemon
                    │
                    ▼
4. Nested Docker daemon builds the API image
                    │
                    ▼
5. Nested Docker daemon starts containers (API + PostgreSQL)
                    │
                    ▼
6. Tests are executed against these containers
```

#### Docker Layers

| Layer | What it is | Where it runs |
|-------|------------|---------------|
| **Host Docker** | Docker on your computer | macOS/Linux |
| **Jenkins Container** | CI/CD server | Inside Host Docker |
| **DinD Container** | Nested Docker daemon | Inside Host Docker |
| **API Container** | Node.js application | Inside DinD Docker |
| **PostgreSQL Container** | Database | Inside DinD Docker |

#### Why Docker-in-Docker?

**Isolation and security:**

```
Option 1: Mounting host socket (less secure)
┌──────────────┐
│   Jenkins    │──► /var/run/docker.sock ──► Host Docker
└──────────────┘
⚠️ Jenkins has full access to host!

Option 2: Docker-in-Docker (more secure) ✓
┌──────────────┐      ┌──────────────┐
│   Jenkins    │─────►│     DinD     │──► Isolated Docker
└──────────────┘ TLS  └──────────────┘
✓ Builds are isolated from the host
```

#### Summary

```
Your computer
    └── Docker (host)
            ├── jenkins (container) ─── runs the pipeline
            └── jenkins-docker (container) ─── DinD
                    └── Docker daemon (nested)
                            ├── api (container) ─── application
                            └── postgres (container) ─── database
```

**Docker inside Docker inside Docker** - this is standard practice in CI/CD for build isolation.

---

## GitLab CI/CD Pipeline

The GitLab pipeline consists of 5 stages:

```
validate → test:unit → test:e2e → docker:build → report
```

### GitLab Stages

| Stage | Job | Description |
|-------|-----|-------------|
| validate | validate:docker-compose | Validate docker-compose.yml |
| validate | validate:mcp-json | Validate mcp.json |
| test:unit | test:unit:python | Run pytest tests |
| test:e2e | test:e2e | Run Jest tests with Docker Compose |
| docker:build | docker:build:api | Build and push image to registry |
| report | report:summary | Test results summary |
| report | report:pages | Publish coverage to GitLab Pages |

---

## Project Structure

```
docker-hooks-mcp/
├── app/
│   └── api/
│       ├── Dockerfile          # Multi-stage Docker build
│       ├── server.js           # Express server
│       ├── package.json
│       └── package-lock.json
├── tests/
│   ├── api.test.js             # E2E tests (Jest)
│   ├── test_api.py             # Unit tests (pytest)
│   └── package.json            # Test dependencies + jest-junit
├── docker-compose.yml          # Local development environment
├── jenkins-stack.yml           # Jenkins + Docker-in-Docker
├── Jenkinsfile                 # Jenkins pipeline definition
├── mcp.json                    # MCP configuration
├── .gitlab-ci.yml              # GitLab CI/CD pipeline
└── requirements.txt            # Python dependencies
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CI/CD Options                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Option 1: GitLab CI/CD          Option 2: Jenkins          │
│  ┌─────────────────────┐         ┌─────────────────────┐   │
│  │   .gitlab-ci.yml    │         │    Jenkinsfile      │   │
│  │   GitLab Runners    │         │    Jenkins Server   │   │
│  └─────────────────────┘         └─────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  GitLab Container Registry │
              │  registry.gitlab.com/...   │
              └───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                           │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │   PostgreSQL    │ ◄────── │      Node.js API        │   │
│  │   :5432         │         │      :3000              │   │
│  └─────────────────┘         └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgres://test:testpass@localhost:5432/testdb | PostgreSQL connection string |
| PORT | 3000 | API port |
| API_URL | http://localhost:3000 | API URL for tests |

## Troubleshooting

### Jenkins: "isUnix" or "withEnv" not found

This indicates missing pipeline plugins. Install with:

```bash
docker exec jenkins jenkins-plugin-cli --plugins workflow-basic-steps workflow-durable-task-step
docker restart jenkins
```

### Jenkins: Docker commands not found

Install Docker CLI in Jenkins container:

```bash
docker exec -u root jenkins apt-get update
docker exec -u root jenkins apt-get install -y docker.io
```

### Jenkins: docker-compose not found

Install docker-compose standalone:

```bash
docker exec -u root jenkins bash -c "curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
```

### GitLab: Access denied when cloning

Create a Personal Access Token with `read_repository` scope and configure it in Jenkins credentials.

## License

MIT
