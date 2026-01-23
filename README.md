# Docker Hooks MCP

Demo projekt pokazujący pełny workflow CI/CD z GitLab, Docker i testami automatycznymi.

## Co to jest?

Prosty REST API do zarządzania listą zadań (todos) z:
- Automatycznym pipeline CI/CD w GitLab
- Konteneryzacją Docker
- Testami jednostkowymi (Python/pytest) i E2E (JavaScript/Jest)
- Publikacją obrazu do GitLab Container Registry

## Tech Stack

| Komponent | Technologia |
|-----------|-------------|
| API | Node.js + Express |
| Baza danych | PostgreSQL 15 |
| Testy E2E | Jest + Supertest |
| Testy jednostkowe | Python + pytest |
| Konteneryzacja | Docker + Docker Compose |
| CI/CD | GitLab CI/CD |

## API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/todos` | Pobierz wszystkie zadania |
| POST | `/todos` | Utwórz nowe zadanie |
| DELETE | `/todos/:id` | Usuń zadanie |

## Uruchomienie lokalne

### Docker Compose (zalecane)

```bash
# Uruchom API + PostgreSQL
docker compose up -d

# Test
curl http://localhost:3000/todos

# Zatrzymaj
docker compose down -v
```

### Z obrazu GitLab Registry

```bash
# Utwórz sieć
docker network create test-net

# Uruchom PostgreSQL
docker run -d --name postgres-test --network test-net \
  -e POSTGRES_DB=testdb \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=testpass \
  postgres:15-alpine

# Uruchom API z GitLab Registry
docker run -d --name api-test --network test-net \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://test:testpass@postgres-test:5432/testdb \
  registry.gitlab.com/docker-hooks-mcp-claude/docker-hooks-mcp/api:latest

# Test
curl http://localhost:3000/todos
```

## Uruchomienie testów

```bash
# Upewnij się, że API działa (docker compose up -d)

# Testy E2E (JavaScript)
cd tests && API_URL=http://localhost:3000 npm test

# Testy jednostkowe (Python)
pip install -r requirements.txt
pytest tests/test_api.py -v
```

## CI/CD Pipeline

Pipeline GitLab składa się z 5 etapów:

```
validate → test:unit → test:e2e → docker:build → report
```

### Etapy

| Stage | Job | Opis |
|-------|-----|------|
| validate | validate:docker-compose | Walidacja docker-compose.yml |
| validate | validate:mcp-json | Walidacja mcp.json |
| test:unit | test:unit:python | Testy pytest |
| test:e2e | test:e2e | Testy Jest z Docker Compose |
| docker:build | docker:build:api | Build i push obrazu do registry |
| report | report:summary | Podsumowanie wyników |
| report | report:pages | Publikacja coverage na GitLab Pages |

## Struktura projektu

```
docker-hooks-mcp/
├── app/
│   └── api/
│       ├── Dockerfile        # Obraz API
│       ├── server.js         # Serwer Express
│       └── package.json
├── tests/
│   ├── api.test.js          # Testy E2E (Jest)
│   ├── test_api.py          # Testy jednostkowe (pytest)
│   └── package.json
├── docker-compose.yml        # Konfiguracja lokalnego środowiska
├── mcp.json                  # Konfiguracja MCP
├── .gitlab-ci.yml           # Pipeline CI/CD
└── requirements.txt          # Zależności Python
```

## Architektura

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

## Zmienne środowiskowe

| Zmienna | Domyślna | Opis |
|---------|----------|------|
| DATABASE_URL | postgres://test:testpass@localhost:5432/testdb | Connection string do PostgreSQL |
| PORT | 3000 | Port API |
| API_URL | http://localhost:3000 | URL API dla testów |

## Licencja

MIT
