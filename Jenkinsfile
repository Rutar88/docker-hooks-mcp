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
                sh 'docker-compose config > /dev/null && echo "docker-compose.yml is valid"'
            }
        }

        stage('Test') {
            steps {
                sh 'echo "Running tests..."'
                sh 'docker --version'
                sh 'docker ps'
            }
        }

        stage('Build') {
            steps {
                sh 'echo "Build stage"'
            }
        }

        stage('Report') {
            steps {
                sh 'echo "Pipeline completed"'
            }
        }
    }
}
