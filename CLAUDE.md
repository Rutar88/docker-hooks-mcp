# Docker Test App

**Środowisko**:
- API: localhost:3000/todos (CRUD)
- DB: localhost:5432/testdb

**Workflow**:
pytest → docker up → testy → git commit → docker down

Stwórz:
app/api/server.js (Node.js + Express + todos CRUD)
tests/*.test.js (supertest E2E)
