#!/usr/bin/groovy

// function to remove built images
def docker_clean() {
    def dangling_images = sh(
		returnStdout: true,
		script: "docker images -f 'dangling=true' -q"
	)
    if (dangling_images) {
        sh(script: "docker rmi --force $dangling_images")
    }
}


pipeline {
    agent {
        label 'docker'
    }
    environment {
        // Remove .git from the GIT_URL link
        THIS_REPO = "${env.GIT_URL.endsWith(".git") ? env.GIT_URL[0..-5] : env.GIT_URL}"
        DEFAULT_BRANCH = "v2.7.3-AI4OS"
        METADATA_VERSION = "2.0.0"
        AI4OS_REGISTRY_CREDENTIALS = credentials('AIOS-registry-credentials')
    }
    stages {
        stage("Variable initialization") {
            steps {
                script {
                    checkout scm
                    withFolderProperties{
                        env.DOCKER_REGISTRY = env.AI4OS_REGISTRY
                        env.DOCKER_REGISTRY_ORG = env.AI4OS_REGISTRY_REPOSITORY
                        env.DOCKER_REGISTRY_CREDENTIALS = env.AI4OS_REGISTRY_CREDENTIALS
                    }
                    // define tag based on branch
                    env.IMAGE_TAG = "${env.BRANCH_NAME == 'main' ? 'latest' : env.BRANCH_NAME}"
                }
            }
        }

        stage('AI4OS Hub metadata V2 validation (YAML)') {
            when {
                // Check if ai4-metadata.yml is present in the repository
                expression {fileExists("ai4-metadata.yml")}
            }
            agent {
                docker {
                    image 'ai4oshub/ci-images:python3.12'
                }
            }
            steps {
                script {
                    if (!fileExists("ai4-metadata.yml")) {
                        error("ai4-metadata.yml file not found in the repository")
                    }
                    if (fileExists("ai4-metadata.json")) {
                        error("Both ai4-metadata.json and ai4-metadata.yml files found in the repository")
                    }
                }
                script {
                    sh "ai4-metadata validate --metadata-version ${env.METADATA_VERSION} ai4-metadata.yml"
                }
            }
        }
        stage("License validation") {
            steps {
                script {
                    // Check if LICENSE file is present in the repository
                    if (!fileExists("LICENSE")) {
                        error("LICENSE file not found in the repository")
                    }
                }
            }
        }

        stage("Check if only metadata files have changed") {
            steps {
                script {
                    // Check if only metadata files have been changed
                    // See https://github.com/ai4os/ai4os-hub-qa/issues/16
                    if (env.GIT_PREVIOUS_SUCCESSFUL_COMMIT) {
                        changed_files = sh (returnStdout: true, script: "git diff --name-only HEAD ${env.GIT_PREVIOUS_SUCCESSFUL_COMMIT}").trim()
                    } else {
                        changed_files = sh (returnStdout: true, script: "git diff --name-only HEAD^ HEAD").trim()
                    }
                    need_build = true

                    // Check if metadata files are present in the list of changed files
                    if (changed_files.contains("ai4-metadata.yml")) {
                        // Convert to an array and pop items
                        changed_files = changed_files.tokenize()
                        changed_files.removeAll(["metadata.json", "ai4-metadata.json", "ai4-metadata.yml"])
                        // now check if the list is empty
                        if (changed_files.size() == 0) {
                            need_build = false
                        }
                    }
                }
            }
        }

        stage("Docker build and push (Server)") {
            when {
                anyOf {
                    branch 'main'
                    branch env.DEFAULT_BRANCH
                    branch 'release/*'
                    buildingTag()
                }
                anyOf {
                    expression {need_build}
                    triggeredBy 'UserIdCause'
                }
            }
            steps {
                script {
                    checkout scm
                    dockerfile = "Dockerfile"
                    docker_repo = (env.DOCKER_REGISTRY_ORG + "/" + "ai4-cvat-server:" + env.IMAGE_TAG).toLowerCase()
                    println ("[DEBUG] Config for the Docker image build: ${docker_repo}, push to $env.DOCKER_REGISTRY")
                    docker.withRegistry(env.DOCKER_REGISTRY, env.DOCKER_REGISTRY_CREDENTIALS){
                         def app_image = docker.build(docker_repo,
                                                      "--no-cache --force-rm -f ${dockerfile} .")
                         app_image.push()
                    }
                }
            }
            post {
                failure {
                    docker_clean()
                }
            }
        }

        stage("Docker build and push (UI)") {
            when {
                anyOf {
                    branch 'main'
                    branch env.DEFAULT_BRANCH
                    branch 'release/*'
                    buildingTag()
                }
                anyOf {
                    expression {need_build}
                    triggeredBy 'UserIdCause'
                }
            }
            steps {
                script {
                    checkout scm
                    dockerfile = "Dockerfile.ui"
                    docker_repo = (env.DOCKER_REGISTRY_ORG + "/" + "ai4-cvat-ui:" + env.IMAGE_TAG).toLowerCase()
                    println ("[DEBUG] Config for the Docker image build: ${docker_repo}, push to $env.DOCKER_REGISTRY")
                    docker.withRegistry(env.DOCKER_REGISTRY, env.DOCKER_REGISTRY_CREDENTIALS){
                         def app_image = docker.build(docker_repo,
                                                      "--no-cache --force-rm -f ${dockerfile} .")
                         app_image.push()
                    }
                }
            }
            post {
                failure {
                    docker_clean()
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}