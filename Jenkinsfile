pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'echo "Hello from Jenkins"'
                sh 'docker --version'
                sh 'docker ps'
            }
        }

        stage('Docker Build Test') {
            steps {
                sh 'docker pull alpine:latest'
                sh 'docker run --rm alpine echo "Hello from Alpine container"'
            }
        }
    }
}
