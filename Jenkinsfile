pipeline {
    agent any

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies (Auth Service)') {
            steps {
                echo 'Installing Node dependencies for auth-service'
                dir('auth-service') {
                    sh 'npm ci'
                }
            }
        }
    }
}
