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

        stage('Debug Workspace Structure') {
            steps {
                echo 'Workspace root contents:'
                sh 'pwd && ls -la'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo 'Installing dependencies for all backend services'
                sh '''
                  chmod +x install-backend-deps.sh
                  ./install-backend-deps.sh
                '''
            }
        }

        stage('Lint (Backend Services)') {
            steps {
                echo 'Running ESLint for all backend services'
                sh '''
                  chmod +x eslint.sh
                  ./eslint.sh
                '''
            }
        }

        stage('SonarQube Scan (All Backend Services)') {
            steps {
                echo 'Running SonarQube analysis for all backend services'
                withSonarQubeEnv('sonarqube') {
                    sh '''
                      set -e

                      SERVICES="
                        api-gateway
                        auth-service
                        cart-service
                        catalog-service
                        order-service
                        payment-service
                        product-service
                        promo-service
                        notification-service
                      "

                      for svc in $SERVICES; do
                        echo "======================================"
                        echo "🔍 SonarQube scan for: $svc"
                        echo "======================================"

                        if [ ! -d "$svc" ]; then
                          echo "❌ Directory $svc not found"
                          exit 1
                        fi

                        cd $svc

                        if [ ! -f sonar-project.properties ]; then
                          echo "❌ sonar-project.properties missing in $svc"
                          exit 1
                        fi

                        sonar-scanner

                        cd -
                      done
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Backend CI pipeline completed'
        }
        success {
            echo 'Backend CI pipeline SUCCEEDED'
        }
        failure {
            echo 'Backend CI pipeline FAILED'
        }
    }
}
