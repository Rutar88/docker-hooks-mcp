// =============================================================================
// JENKINS PIPELINE FOR DOCKER-HOOKS-MCP
// =============================================================================
// This declarative pipeline automates the CI/CD workflow for the Todo API.
// It validates configuration, builds Docker images, runs E2E tests, and
// publishes test reports to Jenkins.
//
// Prerequisites:
//   - Jenkins with Docker CLI and docker-compose installed
//   - GitLab credentials configured as 'gitlab-git'
//   - JUnit plugin for test reporting
//
// Pipeline Stages:
//   1. Checkout           - Clone repository from GitLab
//   2. Validate           - Validate docker-compose.yml syntax
//   3. Build              - Build Docker images using docker-compose
//   4. Test: E2E          - Run end-to-end tests against live stack
//   5. Publish Test Results - Archive JUnit XML reports
//   6. Report             - Display build summary
//   7. Cleanup            - Remove containers and volumes
// =============================================================================

pipeline {
    // Use any available Jenkins agent
    // The agent must have Docker CLI and docker-compose installed
    agent any

    stages {
        // =====================================================================
        // STAGE 1: CHECKOUT
        // =====================================================================
        // Clones the repository from GitLab using stored credentials.
        // The 'gitlab-git' credential should contain username + access token.
        stage('Checkout') {
            steps {
                // Clone the main branch from GitLab
                // credentialsId references Jenkins credentials store
                git branch: 'main', url: 'https://gitlab.com/docker-hooks-mcp-claude/docker-hooks-mcp.git', credentialsId: 'gitlab-git'

                // List files to verify checkout was successful
                sh 'ls -la'
            }
        }

        // =====================================================================
        // STAGE 2: VALIDATE
        // =====================================================================
        // Validates the docker-compose.yml file syntax before proceeding.
        // This catches configuration errors early in the pipeline.
        stage('Validate') {
            steps {
                sh '''
                    echo "=== Validating docker-compose.yml ==="

                    # docker-compose config parses and validates the file
                    # Output is redirected to /dev/null; only errors are shown
                    docker-compose config > /dev/null

                    echo "docker-compose.yml is valid"
                '''
            }
        }

        // =====================================================================
        // STAGE 3: BUILD
        // =====================================================================
        // Builds Docker images defined in docker-compose.yml.
        // Uses --no-cache to ensure fresh builds every time.
        stage('Build') {
            steps {
                sh '''
                    echo "=== Building Docker images ==="

                    # Build all services defined in docker-compose.yml
                    # --no-cache: Don't use cached layers (ensures reproducible builds)
                    docker-compose build --no-cache

                    echo "Build completed"
                '''
            }
        }

        // =====================================================================
        // STAGE 4: TEST (E2E)
        // =====================================================================
        // Runs end-to-end tests against the full application stack.
        //
        // Process:
        //   1. Start all services (API + PostgreSQL) in detached mode
        //   2. Wait for services to become healthy
        //   3. Run Jest tests in a separate container connected to the network
        //   4. Tests connect to API using Docker network DNS (http://api:3000)
        stage('Test: E2E') {
            steps {
                sh '''
                    echo "=== Starting test stack ==="

                    # Start services in detached mode (-d)
                    # This starts PostgreSQL first, waits for healthcheck,
                    # then starts the API service
                    docker-compose up -d

                    echo "=== Waiting for services to be healthy ==="

                    # Allow time for services to fully initialize
                    # PostgreSQL needs time to accept connections
                    # API needs time to connect to database
                    sleep 15

                    echo "=== Checking service status ==="

                    # Display running containers and their health status
                    docker-compose ps

                    echo "=== Testing API health ==="

                    # Quick health check from Jenkins host
                    # Note: This may fail because Jenkins container is not on
                    # the same Docker network - this is expected behavior
                    curl -f http://localhost:3000/todos || echo "API check failed"

                    echo "=== Running E2E tests ==="

                    # Run tests in a Node.js container connected to the app network
                    # --rm: Remove container after tests complete
                    # --network: Connect to the application's Docker network
                    # -e API_URL: Tell tests where to find the API
                    # -v: Mount test files into the container
                    # -w: Set working directory
                    docker run --rm \
                        --network docker-hooks-mcp_test-network \
                        -e API_URL=http://api:3000 \
                        -v "$(pwd)/tests:/tests" \
                        -w /tests \
                        node:20-alpine sh -c "npm ci && npm run test:ci"

                    echo "=== E2E tests completed ==="
                '''
            }
        }

        // =====================================================================
        // STAGE 5: PUBLISH TEST RESULTS
        // =====================================================================
        // Archives JUnit XML test reports for Jenkins to display.
        // This enables the "Test Results" view and trend graphs in Jenkins UI.
        stage('Publish Test Results') {
            steps {
                // junit step reads XML files and creates test result pages
                // The file is generated by jest-junit reporter
                junit 'tests/junit.xml'
            }
        }

        // =====================================================================
        // STAGE 6: REPORT
        // =====================================================================
        // Displays a summary of the build including:
        //   - Build number
        //   - Docker images created
        //   - Running containers
        stage('Report') {
            steps {
                sh '''
                    echo "=========================================="
                    echo "           BUILD SUMMARY"
                    echo "=========================================="
                    echo "Build Number: ${BUILD_NUMBER}"

                    echo "Docker images:"
                    # List images matching our project name
                    docker images | grep -E "docker-hooks-mcp|api" || echo "No project images found"

                    echo ""
                    echo "Running containers:"
                    # Show status of all services
                    docker-compose ps

                    echo "=========================================="
                '''
            }
        }

        // =====================================================================
        // STAGE 7: CLEANUP
        // =====================================================================
        // Removes all containers, networks, and volumes created during the build.
        // This ensures a clean state for the next build.
        stage('Cleanup') {
            steps {
                sh '''
                    echo "=== Cleanup: stopping containers ==="

                    # Stop and remove all services
                    # -v: Also remove named volumes (postgres_data)
                    # || true: Don't fail if containers don't exist
                    docker-compose down -v || true

                    echo "Cleanup completed"
                '''
            }
        }
    }
}
