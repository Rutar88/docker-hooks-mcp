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
| CI/CD | GitLab CI/CD, Jenkins, AWS CodeBuild |

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

### Creating a Jenkins Pipeline Job

After setting up Jenkins and credentials, create a new pipeline job:

1. **Create New Job**
   - Go to Jenkins Dashboard: `http://localhost:8080`
   - Click **"New Item"** in the left menu
   - Enter job name: `docker-hooks-mcp`
   - Select **"Pipeline"** as the job type
   - Click **"OK"**

2. **Configure Pipeline Source**
   - Scroll down to the **"Pipeline"** section
   - Change **"Definition"** from "Pipeline script" to **"Pipeline script from SCM"**
   - Select **"Git"** as SCM
   - Enter Repository URL: `https://gitlab.com/docker-hooks-mcp-claude/docker-hooks-mcp.git`
   - Under **"Credentials"**, select `gitlab-git`
   - Change **"Branch Specifier"** to `*/main`
   - Ensure **"Script Path"** is set to `Jenkinsfile`
   - Click **"Save"**

3. **Run the Pipeline**
   - Click **"Build Now"** in the left menu
   - Click on the build number (e.g., #1) to see progress
   - Click **"Console Output"** to view live logs

```
┌─────────────────────────────────────────────────────────────┐
│                    Jenkins Job Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. New Item → "docker-hooks-mcp" → Pipeline                │
│                                                              │
│  2. Pipeline Configuration:                                  │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ Definition: Pipeline script from SCM                 │ │
│     │ SCM: Git                                             │ │
│     │ Repository URL: https://gitlab.com/.../...git        │ │
│     │ Credentials: gitlab-git                              │ │
│     │ Branch: */main                                       │ │
│     │ Script Path: Jenkinsfile                             │ │
│     └─────────────────────────────────────────────────────┘ │
│                                                              │
│  3. Save → Build Now                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

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

## AWS CodeBuild

This project supports AWS CodeBuild for cloud-based CI/CD within the AWS Free Tier.

### AWS Free Tier Limits

| Service | Free Tier | Our Usage |
|---------|-----------|-----------|
| CodeBuild | 100 minutes/month | ~1 min/build |
| CloudWatch Logs | 5 GB/month | minimal |
| S3 (artifacts) | 5 GB/month | optional |

**Result: ~100 free builds per month**

### Quick Setup (5 minutes)

1. **Open AWS CodeBuild Console**
   - Go to: https://console.aws.amazon.com/codebuild/home
   - Click **"Create project"**

2. **Project Configuration**
   | Setting | Value |
   |---------|-------|
   | Project name | `docker-hooks-mcp` |
   | Description | `Todo API CI/CD pipeline` |

3. **Source Configuration**
   | Setting | Value |
   |---------|-------|
   | Source provider | GitHub |
   | Repository | Connect to GitHub → select your repo |
   | Source version | `main` |

4. **Environment Configuration** (Important!)
   | Setting | Value |
   |---------|-------|
   | Environment image | Managed image |
   | Compute | EC2 |
   | Operating system | Ubuntu |
   | Runtime | Standard |
   | Image | `aws/codebuild/standard:7.0` |
   | Image version | Always use the latest |
   | **Privileged** | **YES** (required for Docker!) |
   | Service role | New service role |

5. **Buildspec**
   | Setting | Value |
   |---------|-------|
   | Build specifications | Use a buildspec file |
   | Buildspec name | `buildspec.yml` (default) |

6. **Logs**
   | Setting | Value |
   |---------|-------|
   | CloudWatch logs | YES |
   | Group name | `/codebuild/docker-hooks-mcp` |

7. Click **"Create build project"**

### Running a Build

1. Go to your CodeBuild project
2. Click **"Start build"**
3. Leave defaults and click **"Start build"**
4. Watch logs in real-time

### Build Pipeline Stages

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌────────────┐
│ INSTALL │ → │ PRE_BUILD │ → │  BUILD  │ → │ POST_BUILD │
└─────────┘   └───────────┘   └─────────┘   └────────────┘
     │              │              │               │
     ▼              ▼              ▼               ▼
  Install       Validate       Build &         Cleanup
  docker-      docker-compose   run E2E       containers
  compose        config         tests
```

| Phase | Description | Duration |
|-------|-------------|----------|
| INSTALL | Install docker-compose | ~2s |
| PRE_BUILD | Validate configuration | ~1s |
| BUILD | Build images, start stack, run tests | ~40s |
| POST_BUILD | Stop containers, cleanup | ~10s |

### Viewing Test Reports

After a successful build:

1. Go to **CodeBuild** → **Report groups** (left menu)
2. Click on `docker-hooks-mcp-e2e-test-reports`
3. View:
   - Test pass/fail status
   - Test duration trends
   - Code coverage percentage

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS CodeBuild                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Build Container (Ubuntu)                │    │
│  │                                                      │    │
│  │  ┌────────────────┐    ┌────────────────────────┐   │    │
│  │  │ docker-compose │    │   Docker Engine        │   │    │
│  │  │     CLI        │───►│   (privileged mode)    │   │    │
│  │  └────────────────┘    └────────────────────────┘   │    │
│  │                                  │                   │    │
│  │                                  ▼                   │    │
│  │                        ┌─────────────────┐          │    │
│  │                        │  API Container  │          │    │
│  │                        │  (Node.js)      │          │    │
│  │                        └─────────────────┘          │    │
│  │                                  │                   │    │
│  │                                  ▼                   │    │
│  │                        ┌─────────────────┐          │    │
│  │                        │   PostgreSQL    │          │    │
│  │                        │   Container     │          │    │
│  │                        └─────────────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Reports:                                                    │
│  ├── JUnit XML (test results)                               │
│  └── Clover XML (code coverage)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Buildspec Reference

The `buildspec.yml` file defines the build process:

```yaml
version: 0.2
phases:
  install:    # Install docker-compose
  pre_build:  # Validate configuration
  build:      # Build images, run tests
  post_build: # Cleanup
reports:
  e2e-test-reports:     # JUnit test results
  coverage-reports:     # Code coverage
```

See `buildspec.yml` for the full configuration with comments.

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
├── buildspec.yml               # AWS CodeBuild pipeline
├── mcp.json                    # MCP configuration
├── .gitlab-ci.yml              # GitLab CI/CD pipeline
└── requirements.txt            # Python dependencies
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Options                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Option 1: GitLab     Option 2: Jenkins      Option 3: AWS CodeBuild   │
│  ┌─────────────────┐  ┌─────────────────┐    ┌─────────────────┐       │
│  │ .gitlab-ci.yml  │  │   Jenkinsfile   │    │  buildspec.yml  │       │
│  │ GitLab Runners  │  │ Jenkins Server  │    │  AWS Managed    │       │
│  └─────────────────┘  └─────────────────┘    └─────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
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
