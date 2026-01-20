pipeline {
    agent any

    environment {
        CI = 'true'   // activates CI-aware ESLint rules
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
    }
}
