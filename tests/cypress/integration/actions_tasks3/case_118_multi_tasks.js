// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create mutli tasks.', () => {
    const caseId = '118';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const filePartOfTemplateTaskName = '{{file_name}}';
    const imageNamePattern = `image_case_${caseId}_*.png`;
    const videoNamePattern = `video_case_${caseId}_*.mp4`;
    const sharePath = '~/share';
    const fixturesPath = 'cypress/fixtures';

    const imagesCount = 5;
    const videoCount = 2;
    const imageFileName = `image_${taskName.replace(' ', '_').toLowerCase()}`;
    const videoFileName = `video_${taskName.replace(' ', '_').toLowerCase()}`;
    // const videoExtention = 'mp4';
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const imagesFolder = `${fixturesPath}/${imageFileName}`;
    // const videoFolder = `${fixturesPath}`; // fluent-ffmpeg not work with ${fixturesPath}/...
    const imageListToAttach = [];
    const imageListToVideo = [];
    const videoFilesToAttach = [];
    const videoTasksName = [`${videoFileName}_1.mp4`, `${videoFileName}_2.mp4`];
    for (let i = 1; i <= imagesCount; i++) {
        imageListToAttach.push(`${imageFileName}/${imageFileName}_${i}.png`);
        imageListToVideo.push(`${imagesFolder}/${imageFileName}_${i}.png`);
    }
    // for (let i = 1; i <= videoCount; i++) {
    //     videoFilesToAttach.push(`${fixturesPath}/${videoFileName}_${i}.${videoExtention}`);
    // }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        // cy.videoGenerator(imageListToVideo, {
        //     directory: videoFolder,
        //     fileName: videoFileName,
        //     count: videoCount,
        //     extension: videoExtention,
        // });
    });

    beforeEach(() => {
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-multi-tasks-button').should('be.visible').click();
        cy.addNewLabel(labelName);
    });

    afterEach(() => {
        cy.goToTaskList();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Default form should fill default name.', () => {
            cy.get('#name').should('have.attr', 'value', filePartOfTemplateTaskName);
        });

        describe('Try to create tasks with images. The error information should appear, button should be disabled.', () => {
            it('With attached images', () => {
                cy.get('input[type="file"]').attachFile(imageListToAttach, { subjectType: 'drag-n-drop' });
                cy.get('.cvat-create-task-content-alert').should('be.visible');
                cy.get('[type="submit"]').should('be.disabled');
            });

            it('With image from "Connected file share"', () => {
                cy.contains('[role="tab"]', 'Connected file share').click();
                cy.exec(`docker exec -i cvat_server /bin/bash -c \
                            "find ${sharePath} -name ${imageNamePattern} -type f"`)
                    .then((command) => {
                        const stdoutToList = command.stdout.split('\n').map((filePath) => filePath.split('/').pop());
                        cy.get('.cvat-share-tree')
                            .should('be.visible')
                            .within(() => {
                                cy.get('[aria-label="plus-square"]').click();
                                cy.get(`[title^=image_case_${caseId}]`).should('have.length', stdoutToList.length);
                                stdoutToList.forEach((el) => {
                                    cy.get(`[title="${el}"]`).should('exist');
                                    cy.get(`[title="${el}"]`).prev().should('exist');
                                    cy.get(`[title="${el}"]`).prev().click().should('have.attr', 'class').and('contain', 'checked');
                                });
                            });

                        cy.get('.cvat-create-task-content-alert').should('be.visible');
                        cy.get('[type="submit"]').should('be.disabled');
                    });
            });

            it('With image from "Remote source".', () => {
                const imageUrls =
                    'https://raw.githubusercontent.com/cvat-ai/cvat/v1.2.0/cvat/apps/documentation/static/documentation/images/cvatt.jpg';

                cy.contains('[role="tab"]', 'Remote sources').click();
                cy.get('.cvat-file-selector-remote').clear().type(imageUrls);

                cy.get('.cvat-create-task-content-alert').should('be.visible');
                cy.get('[type="submit"]').should('be.disabled');
            });
        });

        describe('Try to create tasks with vidoes. Should be success creating.', () => {
            it.skip('With attached videos', () => {
                cy.get('input[type="file"]')
                    // selectFile not work with no visible elements
                    .invoke('attr', 'style', 'display: inline')
                    // attachFile not work with video
                    .selectFile(videoFilesToAttach, { subjectType: 'drag-n-drop' });
                cy.get('.cvat-create-task-content-alert').should('not.be.exist');
                cy.get('.cvat-create-task-content-footer [type="submit"]')
                    .should('not.be.disabled')
                    .contains(`Submit ${videoCount} tasks`)
                    .click();
                cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
                    .contains(`Total: ${videoCount}`);
                cy.contains('button', 'Cancel');
                cy.get('.cvat-create-multi-tasks-state').should('be.exist')
                    .contains('Finished');
                cy.contains('button', 'Retry failed tasks').should('be.disabled');
                cy.contains('button', 'Ok').click();

                videoTasksName.forEach((videoTaskName) => {
                    cy.contains('strong', videoTaskName).should('be.exist');
                    cy.deleteTask(videoTaskName);
                });
            });

            it('With videos from "Connected file share"', () => {
                let stdoutToList = [];

                cy.contains('[role="tab"]', 'Connected file share').click();
                cy.exec(`docker exec -i cvat_server /bin/bash -c \
                    "find ${sharePath} -name ${videoNamePattern} -type f"`)
                    .then((command) => {
                        stdoutToList = command.stdout.split('\n').map((filePath) => filePath.split('/').pop());
                        cy.get('.cvat-share-tree')
                            .should('be.visible')
                            .within(() => {
                                cy.get('[aria-label="plus-square"]').click();
                                // maybe not work if no visibled
                                cy.get(`[title^=video_case_${caseId}]`).should('have.length', stdoutToList.length);
                                stdoutToList.forEach((el) => {
                                    cy.get(`[title="${el}"]`).should('exist');
                                    cy.get(`[title="${el}"]`).prev().click().should('have.attr', 'class').and('contain', 'checked');
                                });
                            });

                        cy.get('.cvat-create-task-content-alert').should('not.be.exist');
                        cy.get('.cvat-create-task-content-footer [type="submit"]')
                            .should('not.be.disabled')
                            .contains(`Submit ${stdoutToList.length} tasks`)
                            .click();

                        cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
                            .contains(`Total: ${stdoutToList.length}`);
                        cy.contains('button', 'Cancel');
                        cy.get('.cvat-create-multi-tasks-state').should('be.exist')
                            .contains('Finished');
                        cy.contains('button', 'Retry failed tasks').should('be.disabled');
                        cy.contains('button', 'Ok').click();

                        stdoutToList.forEach((it) => {
                            cy.contains('strong', it).should('be.exist');
                            cy.deleteTask(it);
                        });
                    });
            });

            it('With video from "Remote source".', () => {
                const baseUrl = 'https://raw.githubusercontent.com/cvat-ai/cvat';
                const branch = 'aa/creating-multiple-tasks-uploading-videos/tests';
                const folder = 'tests/mounted_file_share';
                const videoUrls = `${baseUrl}/${branch}/${folder}/video_case_118_1.mp4
${baseUrl}/${branch}/${folder}/video_case_118_2.mp4`;

                cy.contains('[role="tab"]', 'Remote sources').click();
                cy.get('.cvat-file-selector-remote').clear().type(videoUrls);

                cy.get('.cvat-create-task-content-alert').should('not.be.exist');
                cy.get('.cvat-create-task-content-footer [type="submit"]')
                    .should('not.be.disabled')
                    .contains('Submit 2 tasks')
                    .click();
                cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
                    .contains('Total: 2');
                cy.contains('button', 'Cancel');
                cy.get('.cvat-create-multi-tasks-state').should('be.exist')
                    .contains('Finished');
                cy.contains('button', 'Retry failed tasks').should('be.disabled');
                cy.contains('button', 'Ok').click();

                videoTasksName.forEach((it) => {
                    cy.contains('strong', it).should('be.exist');
                    cy.deleteTask(it);
                });
            });
        });
    });
});
