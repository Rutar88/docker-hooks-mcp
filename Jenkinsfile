pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'echo "Hello from Jenkins"'
                sh 'docker --version'
                sh 'ls -la'
            }
        }
    }
}
