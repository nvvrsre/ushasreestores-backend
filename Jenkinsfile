pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipStagesAfterUnstable(false)
    }

    environment {
        CI = 'true'

        DOCKERHUB_NAMESPACE = 'nvvrsre'
        IMAGE_TAG = "v30.01.26"

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
           PREP
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
                  java -version
                  node -v
                  npm -v
                  docker --version
                  trivy --version
                '''
            }
        }

        /* =========================
           DEPENDENCIES
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

        /* =========================
           TESTS (NON-BLOCKING)
        ========================== */

        stage('Unit Tests (Non Blocking)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'SUCCESS') {
                    sh '''
                      for svc in $SERVICES; do
                        echo "🧪 Running tests for $svc"
                        cd $svc
                        npm test || true
                        cd -
                      done
                    '''
                }
            }
        }

        /* =========================
           SONARQUBE (NON-BLOCKING)
        ========================== */

        stage('SonarQube Scan (Non Blocking)') {
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
                            }
                        }
                    }
                }
            }
        }

        stage('SonarQube Quality Gate (Reported, Not Enforced)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'SUCCESS') {
                    timeout(time: 5, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: false
                    }
                }
            }
        }

        /* =========================
           DOCKER PIPELINE
        ========================== */

        stage('Build Docker Images') {
            steps {
                sh '''
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
                catchError(buildResult: 'UNSTABLE', stageResult: 'SUCCESS') {
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
       POST
    ========================== */

    post {
        success {
            echo '✅ Pipeline completed successfully'
        }
        unstable {
            echo '⚠️ Pipeline completed with warnings (tests / quality / security)'
        }
        failure {
            echo '❌ Pipeline failed (infra or script error)'
        }
        always {
            cleanWs()
        }
    }
}
