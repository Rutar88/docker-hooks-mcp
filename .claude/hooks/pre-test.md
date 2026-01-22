---
name: docker-start
event: pytest-start
priority: high
script: |
  echo "🚀 Docker up..."
  docker-compose up -d
  sleep 10
  curl -s http://localhost:3000/health || echo "API starting..."
  echo "✅ Ready!"
---
