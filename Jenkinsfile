pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipStagesAfterUnstable()
    }

    environment {
        CI = 'true'

        DOCKERHUB_NAMESPACE = 'nvvrsre'
        IMAGE_TAG = "v${new Date().format('dd.MM.yy')}"

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

        /* =========================
           PREP & SANITY
        ========================== */

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
                  set -e
                  java -version
                  node -v
                  npm -v
                  docker --version
                  trivy --version
                '''
            }
        }

        /* =========================
           DEPENDENCIES & QUALITY
        ========================== */

        stage('Install Backend Dependencies') {
            steps {
                sh '''
                  set -e
                  chmod +x install-backend-deps.sh
                  ./install-backend-deps.sh
                '''
            }
        }

        stage('Unit Tests (Backend)') {
            steps {
                sh '''
                  set -e
                  for svc in $SERVICES; do
                    echo "🧪 Running tests for $svc"
                    cd $svc
                    npm test
                    cd -
                  done
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

        /* =========================
           SONARQUBE — HARD ISOLATION
        ========================== */

        stage('SonarQube Scan + Quality Gate (Per Service)') {
            steps {
                script {
                    def scannerHome = tool 'SonarQube Scanner'

                    SERVICES.split().each { svc ->
                        echo "🔍 SonarQube scan for ${svc}"

                        ws("${env.WORKSPACE}@sonar-${svc}") {

                            checkout scm

                            withSonarQubeEnv('sonarqube') {
                                dir(svc) {
                                    sh "${scannerHome}/bin/sonar-scanner"
                                }

                                timeout(time: 5, unit: 'MINUTES') {
                                    waitForQualityGate abortPipeline: true
                                }
                            }
                        }
                    }
                }
            }
        }

        /* =========================
           CONTAINER PIPELINE
        ========================== */

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

        stage('Container Security Scan (Trivy)') {
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

    /* =========================
       POST ACTIONS
    ========================== */

    post {
        success {
            echo '✅ Backend CI pipeline SUCCEEDED'
        }
        failure {
            echo '❌ Backend CI pipeline FAILED'
        }
        always {
            cleanWs()
            echo '🧹 Workspace cleaned'
        }
    }
}
