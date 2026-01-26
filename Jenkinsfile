// =============================================================================
// JENKINS PIPELINE FOR DOCKER-HOOKS-MCP
// =============================================================================
// Stages:
//   1. Checkout      - Clone repository
//   2. Validate      - Validate docker-compose.yml
//   3. Build         - Build Docker images
//   4. Test: E2E     - Run E2E tests with full stack
//   5. Report        - Generate summary

pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://gitlab.com/docker-hooks-mcp-claude/docker-hooks-mcp.git', credentialsId: 'gitlab-git'
                sh 'ls -la'
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    echo "=== Validating docker-compose.yml ==="
                    docker-compose config > /dev/null
                    echo "docker-compose.yml is valid"
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    echo "=== Building Docker images ==="
                    docker-compose build --no-cache
                    echo "Build completed"
                '''
            }
        }

        stage('Test: E2E') {
            steps {
                sh '''
                    echo "=== Starting test stack ==="
                    docker-compose up -d

                    echo "=== Waiting for services to be healthy ==="
                    sleep 15

                    echo "=== Checking service status ==="
                    docker-compose ps

                    echo "=== Testing API health ==="
                    curl -f http://localhost:3000/todos || echo "API check failed"

                    echo "=== Running E2E tests ==="
                    docker run --rm \
                        --network docker-hooks-mcp_test-network \
                        -e API_URL=http://api:3000 \
                        -v "$(pwd)/tests:/tests" \
                        -w /tests \
                        node:20-alpine sh -c "npm ci && npm test -- --forceExit"

                    echo "=== E2E tests completed ==="
                '''
            }
        }

        stage('Report') {
            steps {
                sh '''
                    echo "=========================================="
                    echo "           BUILD SUMMARY"
                    echo "=========================================="
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Docker images:"
                    docker images | grep -E "docker-hooks-mcp|api" || echo "No project images found"
                    echo ""
                    echo "Running containers:"
                    docker-compose ps
                    echo "=========================================="
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    echo "=== Cleanup: stopping containers ==="
                    docker-compose down -v || true
                    echo "Cleanup completed"
                '''
            }
        }
    }
}
