pipeline {
    agent {
        docker {
            image 'docker:24-cli'
            args '-v /var/run/docker.sock:/var/run/docker.sock -e DOCKER_HOST=tcp://docker:2376 -e DOCKER_TLS_VERIFY=1 -e DOCKER_CERT_PATH=/certs/client -v jenkins_docker_certs:/certs/client:ro --network jenkins-network --user root'
        }
    }

    stages {
        stage('Test') {
            steps {
                sh 'echo "Hello from Jenkins"'
                sh 'docker --version'
                sh 'docker ps'
            }
        }
    }
}
