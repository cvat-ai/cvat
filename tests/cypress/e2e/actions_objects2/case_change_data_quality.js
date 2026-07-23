// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Change data quality switch.', () => {
    const labelName = 'Change data quality test';
    const imageTaskName = `New annotation task for ${labelName}`;
    const videoTaskName = `${labelName} video task`;
    const localVideoPath = 'mounted_file_share/videos/video_1.mp4';
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = `image_${labelName.replace(/ /g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = {
        chunkSize: 1,
    };

    function checkQualitySwitchRequests() {
        cy.openSettings();
        cy.get('.cvat-player-settings-data-quality-checkbox').within(() => {
            cy.get('[type="checkbox"]').should('not.be.checked').check();
        });
        cy.closeSettings();
        cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
        cy.goToNextFrame(1);
        cy.wait('@chunkGet');
        cy.goToNextFrame(2);
        cy.wait('@chunkGet').then((req) => {
            expect(req.request.url).to.include('quality=original');
        });

        cy.openSettings();
        cy.get('.cvat-player-settings-data-quality-checkbox').within(() => {
            cy.get('[type="checkbox"]').should('be.checked').uncheck();
        });
        cy.closeSettings();
        cy.intercept('GET', '/api/jobs/**/data**').as('chunkGetCompressed');
        cy.goToPreviousFrame(1);
        cy.wait('@chunkGetCompressed');
        cy.goToPreviousFrame(0);
        cy.wait('@chunkGetCompressed').then((req) => {
            expect(req.request.url).to.include('quality=compressed');
        });
    }

    before(() => {
        cy.visit('/');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist');
        cy.document().then((doc) => {
            const tasks = Array.from(doc.querySelectorAll('.cvat-item-task-name')).map((el) => el.innerText);
            if (!tasks.includes(imageTaskName)) {
                cy.task('log', 'Task does not exist. Creating.');
                cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
                cy.createZipArchive(directoryToArchive, archivePath);
                cy.createAnnotationTask(
                    imageTaskName, labelName, attrName, textDefaultValue, archiveName,
                    null, advancedConfigurationParams,
                );
            } else {
                cy.task('log', 'Task already exists. Skipping creation.');
            }
        });
        cy.openTaskJob(imageTaskName);
    });

    describe('Tests feature to switch between downloading original and compressed chunks (images).', () => {
        it('Checks quality switch requests for image chunks.', () => {
            checkQualitySwitchRequests();
        });
    });

    describe('Tests feature to switch between downloading original and compressed chunks (video).', () => {
        before(() => {
            cy.visit('/tasks');
            cy.get('.cvat-tasks-page').should('exist');
            cy.document().then((doc) => {
                const tasks = Array.from(doc.querySelectorAll('.cvat-item-task-name')).map((el) => el.innerText);
                if (!tasks.includes(videoTaskName)) {
                    cy.task('log', 'Video task does not exist. Creating.');
                    cy.get('.cvat-create-task-dropdown').click();
                    cy.get('.cvat-create-task-button').click({ force: true });
                    cy.url().should('include', '/tasks/create');

                    cy.get('[id="name"]').type(videoTaskName);
                    cy.get('.cvat-constructor-viewer-new-item').click();
                    cy.get('[placeholder="Label name"]').type(labelName);
                    cy.get('.cvat-new-attribute-button').click();
                    cy.get('[placeholder="Name"]').type(attrName);
                    cy.get('.cvat-attribute-type-input').click();
                    cy.get('.cvat-attribute-type-input-text').click();
                    cy.get('[placeholder="Default value"]').type(textDefaultValue);
                    cy.contains('button', 'Continue').click();

                    cy.get('input[type="file"]').selectFile(localVideoPath, {
                        action: 'drag-drop',
                        force: true,
                    });
                    cy.advancedConfiguration(advancedConfigurationParams);
                    cy.get('.cvat-submit-continue-task-button').scrollIntoView();
                    cy.get('.cvat-submit-continue-task-button').click();
                    cy.get('.cvat-notification-create-task-success').should('exist')
                        .find('[data-icon="close"]').click();
                    cy.goToTaskList();
                } else {
                    cy.task('log', 'Video task already exists. Skipping creation.');
                }
            });

            cy.openTaskJob(videoTaskName);
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.cvat-canvas-container').should('exist');
        });

        it('Checks quality switch requests for video chunks.', () => {
            checkQualitySwitchRequests();
        });
    });
});
