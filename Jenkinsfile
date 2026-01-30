pipeline {
    agent any

    environment {
        CI = 'true'

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

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Debug Workspace Structure') {
            steps {
                sh 'pwd && ls -la'
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

        stage('Lint (Backend Services)') {
            steps {
                sh '''
                  set -e
                  chmod +x eslint.sh
                  ./eslint.sh
                '''
            }
        }

        stage('SonarQube Scan + Quality Gate (Per Service)') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    script {
                        def scannerHome = tool 'SonarQube Scanner'
                        sh "export PATH=\$PATH:${scannerHome}/bin"

                        SERVICES.split().each { svc ->
                            echo "🔍 SonarQube scan for ${svc}"

                            dir(svc) {
                                sh 'sonar-scanner'
                            }

                            timeout(time: 5, unit: 'MINUTES') {
                                waitForQualityGate abortPipeline: true
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

        stage('Scan Docker Images (Trivy)') {
            steps {
                sh '''
                  set -e
                  for svc in $SERVICES; do
                    IMAGE=$DOCKERHUB_NAMESPACE/$svc:$IMAGE_TAG
                    echo "🔐 Trivy scan for $IMAGE"

                    trivy image --exit-code 1 --severity HIGH,CRITICAL $IMAGE
                  done
                '''
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
