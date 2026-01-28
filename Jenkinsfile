pipeline {
    agent any

    environment {
        CI = 'true'
        API_GATEWAY_DIR = 'Backend/api-gateway'   // adjust ONLY if needed
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
                  ls -la
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

        stage('Test (Backend Services)') {
            steps {
                echo 'Starting API Gateway for integration smoke tests'
                sh '''
                  set +e

                  echo "Checking API Gateway directory..."
                  ls -la Backend || true
                  ls -la $API_GATEWAY_DIR || exit 1

                  echo "Starting API Gateway..."
                  cd $API_GATEWAY_DIR

                  npm start &
                  API_GATEWAY_PID=$!
                  echo "API Gateway PID: $API_GATEWAY_PID"

                  echo "Waiting for API Gateway to be ready..."
                  for i in {1..10}; do
                    if curl -s http://localhost:3000 >/dev/null; then
                      echo "API Gateway is up"
                      break
                    fi
                    sleep 1
                  done

                  cd -

                  echo "Running backend tests..."
                  chmod +x test-backend-services.sh
                  ./test-backend-services.sh
                  TEST_STATUS=$?

                  echo "Stopping API Gateway"
                  kill $API_GATEWAY_PID || true

                  exit $TEST_STATUS
                '''
            }
        }
    }

    post {
        always {
            echo 'Backend CI pipeline completed'
        }
        failure {
            echo 'Backend CI pipeline FAILED'
        }
        success {
            echo 'Backend CI pipeline SUCCEEDED'
        }
    }
}
