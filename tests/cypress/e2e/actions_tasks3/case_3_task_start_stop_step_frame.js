// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Check if parameters "startFrame", "stopFrame", "frameStep" works as expected', () => {
    const caseId = '3';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
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
        multiJobs: false,
        sssFrame: true,
        startFrame: 2,
        stopFrame: 8,
        frameStep: 2,
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Create a task. Open the task.', () => {
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                advancedConfigurationParams,
            );
            cy.openTaskJob(taskName);
        });
        it('Parameters "startFrame", "stopFrame", "frameStep" works as expected ', () => {
            cy.get('.cvat-player-filename-wrapper').should(
                'contain',
                `${imageFileName}_${advancedConfigurationParams.startFrame}.png`,
            );
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', '0');
            });
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-player-filename-wrapper').should(
                'contain',
                `${imageFileName}_${
                    advancedConfigurationParams.startFrame + advancedConfigurationParams.frameStep
                }.png`,
            );
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', '1');
            });
            cy.get('.cvat-player-last-button').click();
            cy.get('.cvat-player-filename-wrapper').should(
                'contain',
                `${imageFileName}_${advancedConfigurationParams.stopFrame}.png`,
            );
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', '3');
            });
        });
    });
});
