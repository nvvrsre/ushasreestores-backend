pipeline {
    agent any

    environment {
        CI = 'true'
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo 'Installing dependencies for all backend services'
                sh 'chmod +x install-backend-deps.sh'
                sh './install-backend-deps.sh'
            }
        }

        stage('Lint (Backend Services)') {
            steps {
                echo 'Running ESLint for all backend services'
                sh 'chmod +x eslint.sh'
                sh './eslint.sh'
            }
        }

        stage('Test (Backend Services)') {
            steps {
                echo 'Running backend tests'
                sh 'chmod +x test-backend-services.sh'
                sh './test-backend-services.sh'
            }
        }
    }
}
