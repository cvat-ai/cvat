// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task status change.', () => {
    const caseId = '119';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 15;
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
        multiJobs: true,
        segmentSize: 5,
    };

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('auth/login');
        cy.login();
        cy.createAnnotationTask(
            taskName,
            labelName,
            attrName,
            textDefaultValue,
            archiveName,
            false,
            advancedConfigurationParams,
        );
        cy.openTask(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    function checkTaskStatus(status) {
        cy.get('.cvat-tasks-list-item')
            .within(() => {
                cy.get('div').eq(3).should('contain.text', status);
            });
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Change task status to "In progress".', () => {
            cy.setJobStage(0, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('In Progress');
        });

        it('Not vhanged task status "In progress".', () => {
            cy.openTask(taskName);
            cy.setJobStage(1, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('In Progress');
        });

        it('Change task status to "Completed".', () => {
            cy.openTask(taskName);
            cy.setJobStage(2, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('Completed');
        });
    });
});
