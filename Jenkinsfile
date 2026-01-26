// =============================================================================
// JENKINS PIPELINE FOR DOCKER-HOOKS-MCP
// =============================================================================
// This pipeline validates, tests, builds, and reports on the todo API project.
// Designed to run on Jenkins with Docker agent support.
//
// Stages:
//   1. validate     - Validate docker-compose.yml and mcp.json configuration
//   2. test:unit    - Run Python pytest unit tests with coverage
//   3. test:e2e     - Run E2E tests with full Docker Compose stack
//   4. docker:build - Build multi-stage Docker image and push to registry
//   5. report       - Generate coverage and test summary reports

pipeline {
    // Use Docker agent for containerized builds
    // Works with both direct Docker socket and Docker-in-Docker (dind)
    agent {
        docker {
            image 'docker:24-cli'
            args '''
                -v /var/run/docker.sock:/var/run/docker.sock
                -v /var/jenkins_home/workspace:/var/jenkins_home/workspace
                --network jenkins-network
                --user root
            '''
        }
    }

    // Environment variables available to all stages
    environment {
        // Docker registry configuration (optional - comment out if not using registry)
        // DOCKER_REGISTRY = credentials('docker-registry-url')
        // DOCKER_CREDENTIALS = credentials('docker-registry-credentials')

        // Default registry for local development (override in Jenkins credentials)
        DOCKER_REGISTRY = 'localhost:5000'
        API_IMAGE = "docker-hooks-mcp/api"

        // PostgreSQL configuration (matches docker-compose.yml)
        POSTGRES_DB = 'testdb'
        POSTGRES_USER = 'test'
        POSTGRES_PASSWORD = 'testpass'

        // Test configuration - API runs in Docker network
        API_URL = 'http://api:3000'
        // For curl from host container
        API_HOST = 'localhost'
    }

    // Pipeline options
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Disable concurrent builds
        disableConcurrentBuilds()
    }

    stages {
        // =====================================================================
        // STAGE 1: VALIDATE
        // =====================================================================
        // Validates configuration files before proceeding with tests and builds.
        stage('validate') {
            parallel {
                // -----------------------------------------------------------------
                // Validate docker-compose.yml syntax
                // -----------------------------------------------------------------
                stage('docker-compose') {
                    steps {
                        script {
                            echo '=== Validating docker-compose.yml ==='
                            sh '''
                                docker compose config --quiet
                                echo "docker-compose.yml is valid"
                            '''
                        }
                    }
                }

                // -----------------------------------------------------------------
                // Validate mcp.json structure
                // -----------------------------------------------------------------
                stage('mcp.json') {
                    agent {
                        docker {
                            image 'python:3.12-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        script {
                            echo '=== Validating mcp.json ==='
                            sh '''
                                python -c "import json; json.load(open('mcp.json')); print('mcp.json is valid JSON')"
                                python -c "
import json
cfg = json.load(open('mcp.json'))
assert 'docker' in cfg, 'Missing docker config'
assert 'postgres' in cfg, 'Missing postgres config'
print('mcp.json structure validated')
"
                            '''
                        }
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 2: TEST:UNIT
        // =====================================================================
        // Runs Python pytest unit tests with coverage reporting.
        stage('test:unit') {
            agent {
                docker {
                    image 'python:3.12-slim'
                    reuseNode true
                }
            }
            steps {
                script {
                    echo '=== Running Python Unit Tests ==='
                    sh '''
                        pip install -r requirements.txt --quiet
                        mkdir -p reports

                        pytest tests/test_api.py \
                            --junitxml=reports/pytest-junit.xml \
                            --cov=tests \
                            --cov-report=xml:reports/coverage.xml \
                            --cov-report=html:reports/coverage-html \
                            -v || true
                    '''
                }
            }
            post {
                always {
                    // Publish JUnit test results
                    junit allowEmptyResults: true, testResults: 'reports/pytest-junit.xml'

                    // Archive coverage reports
                    archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
                }
            }
        }

        // =====================================================================
        // STAGE 3: TEST:E2E
        // =====================================================================
        // Runs end-to-end tests with the full application stack.
        stage('test:e2e') {
            steps {
                script {
                    echo '=== Starting Docker Compose Stack ==='

                    // Get API container IP for tests
                    def apiUrl = 'http://localhost:3000'

                    sh '''
                        # Install required packages
                        apk add --no-cache nodejs npm curl

                        # Install npm test dependencies
                        cd tests && npm ci && cd ..

                        # Start services with docker compose
                        # Use project name to avoid conflicts
                        docker compose -p jenkins-e2e up -d --build --wait

                        # Show running containers
                        docker compose -p jenkins-e2e ps

                        # Get API container IP for network access
                        API_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' jenkins-e2e-api-1 2>/dev/null || echo "localhost")
                        echo "API Container IP: $API_IP"

                        # Wait for API to be ready (try both localhost and container IP)
                        echo "Waiting for API to be ready..."
                        for i in $(seq 1 30); do
                            if curl -s http://${API_IP}:3000/todos > /dev/null 2>&1; then
                                echo "API is ready at ${API_IP}:3000!"
                                break
                            elif curl -s http://localhost:3000/todos > /dev/null 2>&1; then
                                echo "API is ready at localhost:3000!"
                                API_IP="localhost"
                                break
                            fi
                            echo "Attempt $i/30..."
                            sleep 2
                        done

                        # Export API IP for later use
                        echo "$API_IP" > /tmp/api_ip.txt

                        # Verify API responds
                        echo "=== API Health Check ==="
                        curl -s http://${API_IP}:3000/todos | head -c 200 || curl -s http://localhost:3000/todos | head -c 200
                        echo ""
                    '''

                    echo '=== Running E2E Tests ==='

                    // Get API IP from temp file
                    def apiIp = sh(script: 'cat /tmp/api_ip.txt 2>/dev/null || echo localhost', returnStdout: true).trim()
                    apiUrl = "http://${apiIp}:3000"

                    def e2eExitCode = sh(
                        script: """
                            cd tests
                            API_URL=${apiUrl} npm test -- --ci
                        """,
                        returnStatus: true
                    )

                    // Save logs before cleanup
                    sh '''
                        mkdir -p reports
                        docker compose -p jenkins-e2e logs api > reports/api-logs.txt 2>&1 || true
                        docker compose -p jenkins-e2e logs db > reports/db-logs.txt 2>&1 || true
                    '''

                    // Cleanup
                    sh 'docker compose -p jenkins-e2e down -v'

                    // Fail if tests failed
                    if (e2eExitCode != 0) {
                        error "E2E tests failed with exit code: ${e2eExitCode}"
                    }
                }
            }
            post {
                always {
                    // Publish Jest JUnit results
                    junit allowEmptyResults: true, testResults: 'tests/junit.xml'

                    // Archive logs
                    archiveArtifacts artifacts: 'reports/*.txt', allowEmptyArchive: true
                }
                failure {
                    // Ensure cleanup on failure
                    sh 'docker compose -p jenkins-e2e down -v || true'
                }
            }
        }

        // =====================================================================
        // STAGE 4: DOCKER:BUILD
        // =====================================================================
        // Builds multi-stage Docker image and pushes to registry.
        stage('docker:build') {
            steps {
                script {
                    echo '=== Building Docker Image (Multi-Stage) ==='

                    // Build with commit SHA and latest tags
                    def commitSha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    def imageTag = "${API_IMAGE}:${commitSha}"
                    def imageLatest = "${API_IMAGE}:latest"

                    sh """
                        # Build multi-stage image
                        docker build \
                            -t ${imageTag} \
                            -t ${imageLatest} \
                            --target production \
                            ./app/api

                        # Show image size
                        echo "=== Image Size ==="
                        docker images ${imageTag} --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
                    """

                    // Push to registry (only on main branch and if credentials exist)
                    def isMainBranch = (env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main')

                    if (isMainBranch) {
                        echo '=== Pushing to Registry ==='
                        try {
                            withCredentials([usernamePassword(
                                credentialsId: 'docker-registry-credentials',
                                usernameVariable: 'DOCKER_USER',
                                passwordVariable: 'DOCKER_PASS'
                            )]) {
                                sh """
                                    echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin ${DOCKER_REGISTRY}
                                    docker push ${imageTag}
                                    docker push ${imageLatest}
                                    docker logout ${DOCKER_REGISTRY} || true
                                """
                            }
                            echo "Image pushed successfully: ${imageTag}"
                        } catch (Exception e) {
                            echo "WARNING: Could not push to registry (credentials not configured or registry unavailable)"
                            echo "Image built locally: ${imageTag}"
                        }
                    } else {
                        echo "Skipping push - not on main branch (current: ${env.BRANCH_NAME ?: env.GIT_BRANCH})"
                        echo "Image available locally: ${imageTag}"
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 5: REPORT
        // =====================================================================
        // Generates coverage and test summary reports.
        stage('report') {
            agent {
                docker {
                    image 'python:3.12-alpine'
                    reuseNode true
                }
            }
            steps {
                script {
                    echo '========================================='
                    echo '         CI/CD PIPELINE SUMMARY         '
                    echo '========================================='

                    sh '''
                        echo "Commit: $(git rev-parse --short HEAD)"
                        echo "Branch: ${GIT_BRANCH:-unknown}"
                        echo "Build: ${BUILD_NUMBER:-unknown}"
                        echo ""
                    '''

                    // Parse pytest results
                    sh '''
                        if [ -f reports/pytest-junit.xml ]; then
                            echo "=== PYTEST RESULTS ==="
                            python -c "
import xml.etree.ElementTree as ET
try:
    tree = ET.parse('reports/pytest-junit.xml')
    root = tree.getroot()
    ts = root.find('testsuite')
    if ts is not None:
        print(f'Tests: {ts.get(\"tests\", 0)}')
        print(f'Failures: {ts.get(\"failures\", 0)}')
        print(f'Errors: {ts.get(\"errors\", 0)}')
        print(f'Time: {ts.get(\"time\", 0)}s')
except Exception as e:
    print(f'Could not parse pytest results: {e}')
"
                        fi
                    '''

                    // Parse Jest E2E results
                    sh '''
                        if [ -f tests/junit.xml ]; then
                            echo ""
                            echo "=== JEST E2E RESULTS ==="
                            python -c "
import xml.etree.ElementTree as ET
try:
    tree = ET.parse('tests/junit.xml')
    root = tree.getroot()
    for ts in root.findall('testsuite'):
        print(f'Suite: {ts.get(\"name\", \"unknown\")}')
        print(f'Tests: {ts.get(\"tests\", 0)}')
        print(f'Failures: {ts.get(\"failures\", 0)}')
        print(f'Time: {ts.get(\"time\", 0)}s')
except Exception as e:
    print(f'Could not parse Jest results: {e}')
"
                        fi
                    '''

                    // Parse coverage
                    sh '''
                        if [ -f reports/coverage.xml ]; then
                            echo ""
                            echo "=== COVERAGE ==="
                            python -c "
import xml.etree.ElementTree as ET
try:
    tree = ET.parse('reports/coverage.xml')
    root = tree.getroot()
    line_rate = float(root.get('line-rate', 0)) * 100
    print(f'Line coverage: {line_rate:.1f}%')
except Exception as e:
    print(f'Could not parse coverage: {e}')
"
                        fi

                        echo ""
                        echo "========================================="
                    '''
                }
            }
            post {
                always {
                    // Publish HTML coverage report
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'reports/coverage-html',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
    }

    // Post-pipeline actions
    post {
        always {
            // Cleanup workspace
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Check the logs above for details.'
            // Ensure Docker cleanup
            sh 'docker compose -p jenkins-e2e down -v || true'
        }
    }
}
