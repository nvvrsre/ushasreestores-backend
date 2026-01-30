pipeline {
    agent any

    environment {
        CI = 'true'
        NODE_ENV = 'test'
        SKIP_DB = 'true'

        DOCKERHUB_NAMESPACE = 'nvvrsre'
        IMAGE_TAG = 'v30.01.26'

        SERVICES = '''
          api-gateway
          auth-service
          cart-service
          catalog-service
          order-service
          payment-service
          product-service
          promo-service
          notification-service
        '''
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Verify Build Tools') {
            steps {
                sh '''
                  node -v
                  npm -v
                  docker --version
                  trivy --version
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                sh '''
                  set -e
                  chmod +x install-backend-deps.sh
                  ./install-backend-deps.sh
                '''
            }
        }

        stage('Unit Tests (NON-BLOCKING)') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        echo "🧪 Running tests for $svc"
                        cd $svc
                        NODE_ENV=test CI=true npm test || true
                        cd -
                      done
                    '''
                }
            }
        }

        stage('Lint (NON-BLOCKING)') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      chmod +x eslint.sh
                      ./eslint.sh || true
                    '''
                }
            }
        }

        stage('SonarQube Scan (NON-BLOCKING)') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    withSonarQubeEnv('sonarqube') {
                        script {
                            def scannerHome = tool 'SonarQube Scanner'

                            for (svc in SERVICES.split()) {
                                echo "🔍 SonarQube scan for ${svc}"
                                dir(svc) {
                                    sh "${scannerHome}/bin/sonar-scanner || true"
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                  set -e
                  for svc in $SERVICES; do
                    echo "🐳 Building image: $svc"

                    docker build \
                      -t $DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG \
                      -t $DOCKERHUB_NAMESPACE/$svc:latest \
                      $svc
                  done
                '''
            }
        }

        stage('Container Security Scan (NON-BLOCKING)') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        IMAGE=$DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG
                        echo "🔐 Trivy scan for $IMAGE"
                        trivy image --severity HIGH,CRITICAL $IMAGE || true
                      done
                    '''
                }
            }
        }

        stage('Push Docker Images to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                      set -e
                      echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                      for svc in $SERVICES; do
                        echo "📦 Pushing image: $svc"
                        docker push $DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG
                        docker push $DOCKERHUB_NAMESPACE/$svc:latest
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
