pipeline {
    agent any

    environment {
        CI = 'true'
        NODE_ENV = 'test'

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
                  node -v || true
                  npm -v || true
                  docker --version || true
                  trivy --version || true
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      chmod +x install-backend-deps.sh
                      ./install-backend-deps.sh || true
                    '''
                }
            }
        }

        stage('Unit Tests') {
            options {
                timeout(time: 5, unit: 'MINUTES')
            }
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        echo "🧪 Running tests for $svc (learning mode)"
                        cd $svc
                        CI=true NODE_ENV=test \
                        npm test --runInBand --detectOpenHandles || true
                        cd -
                      done
                    '''
                }
            }
        }

        stage('Linting') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      chmod +x eslint.sh
                      ./eslint.sh || true
                    '''
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    withSonarQubeEnv('sonarqube') {
                        script {
                            def scannerHome = tool 'SonarQube Scanner'
                            for (svc in SERVICES.split()) {
                                echo "🔍 Sonar scan for $svc (learning mode)"
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
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        echo "🐳 Building image: $svc"
                        docker build \
                          -t $DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG \
                          -t $DOCKERHUB_NAMESPACE/$svc:latest \
                          $svc || true
                      done
                    '''
                }
            }
        }

        stage('Container Security Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        IMAGE=$DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG
                        echo "🔐 Trivy scan for $IMAGE"
                        trivy image $IMAGE || true
                      done
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh '''
                          echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin || true
                          for svc in $SERVICES; do
                            docker push $DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG || true
                            docker push $DOCKERHUB_NAMESPACE/$svc:latest || true
                          done
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            echo '✅ CI pipeline completed'
        }
    }
}
