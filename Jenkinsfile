pipeline {
    agent {
        docker {
            image 'docker:24-cli'
            args '-v /var/run/docker.sock:/var/run/docker.sock --user root'
        }
    }

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
