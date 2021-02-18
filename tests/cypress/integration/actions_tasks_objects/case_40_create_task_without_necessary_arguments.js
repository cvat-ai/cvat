// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Try to create a task without necessary arguments.', () => {
    const caseId = '40';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
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

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.get('#cvat-create-task-button').click();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Try to create a task without any fields. A task is not created.', () => {
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-create-task-fail').should('exist');
            cy.closeNotification('.cvat-notification-create-task-fail');
        });

        it('Input a task name. A task is not created.', () => {
            cy.get('[id="name"]').type(taskName);
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-create-task-fail').should('exist');
            cy.closeNotification('.cvat-notification-create-task-fail');
        });

        it('Input task labels. A task is not created.', () => {
            cy.addNewLabel(labelName);
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-create-task-fail').should('exist');
            cy.closeNotification('.cvat-notification-create-task-fail');
        });

        it('Add some files. A task created.', () => {
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.get('.cvat-create-task-submit-section').click();
            cy.get('.cvat-notification-create-task-fail').should('not.exist');
            cy.get('.cvat-notification-create-task-success').should('exist');
            // Check that the interface is prepared for creating the next task.
            cy.get('[id="name"]').should('have.value', '');
            cy.get('.cvat-constructor-viewer-item').should('not.exist');
        });
    });
});
