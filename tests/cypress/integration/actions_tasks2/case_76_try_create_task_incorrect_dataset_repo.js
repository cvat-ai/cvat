// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Try to create a task with an incorrect dataset repository.', () => {
    const caseId = '76';
    const labelName = `Case ${caseId}`;
    const taskName = labelName;
    const imagesCount = 1;
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
    const incorrectDatasetRepoUrl = 'dummyrepo.local';
    const incorrectDatasetRepoUrlHttps = 'https://dummyrepo.local';
    const repositoryWithMissingAccess = 'https://github.com/openvinotoolkit/cvat';

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.get('#cvat-create-task-button').click();
    });

    describe(`Testing "${labelName}"`, () => {
        it('Try create task with incorrect dataset repo URL.', () => {
            cy.get('[id="name"]').type(taskName);
            cy.addNewLabel(labelName);
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.contains('.cvat-title', 'Advanced configuration').click();
            cy.get('#repository').type(incorrectDatasetRepoUrl);
            cy.contains('[role="alert"]', 'URL is not a valid URL').should('exist');
            cy.get('#repository').clear();
        });

        it('Set dummy dataset repository.', () => {
            cy.get('#repository').type(incorrectDatasetRepoUrlHttps);
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-notice-create-task-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-create-task-failed');
            cy.get('#repository').clear();
        });

        it('Set repository with missing access.', () => {
            cy.get('#repository').type(repositoryWithMissingAccess);
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-notice-create-task-failed').should('exist');
            cy.get('.cvat-create-task-clone-repository-fail').should('exist');
        });
    });
});
