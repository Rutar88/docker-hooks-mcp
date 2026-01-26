pipeline {
    agent any

    environment {
        DOCKER_HOST = 'tcp://docker:2376'
        DOCKER_TLS_VERIFY = '1'
        DOCKER_CERT_PATH = '/certs/client'
    }

    stages {
        stage('Test') {
            steps {
                sh 'echo "Hello from Jenkins"'
                sh 'ls -la'
            }
        }
    }
}
