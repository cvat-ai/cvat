// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create a task with set an issue tracker.', () => {
    const caseId = '61';
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
    const dummyBugTrackerUrl = 'http://somebugtracker.info/task12';
    const incorrectBugTrackerUrl = 'somebugtracker.info/task12';

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').click();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Creating a task with incorrect issue tracker URL. The error notification is shown.', () => {
            cy.get('[id="name"]').type(taskName);
            cy.addNewLabel({ name: labelName });
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.contains('Advanced configuration').click();
            cy.get('#bugTracker').type(incorrectBugTrackerUrl);
            cy.contains('URL is not a valid URL').should('exist');
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.cvat-notification-create-task-fail').should('exist').and('be.visible');
            cy.closeNotification('.cvat-notification-create-task-fail');
        });

        it('Set correct issue tracker URL. The task created.', () => {
            cy.get('#bugTracker').clear();
            cy.get('#bugTracker').type(dummyBugTrackerUrl);
            cy.contains('URL is not a valid URL').should('not.exist');
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.cvat-notification-create-task-fail').should('not.exist');
            cy.get('.cvat-notification-create-task-success').should('exist').and('be.visible');
        });

        it('Open the task. Change issue tracker URL to incorrect. The error notification is shown.', () => {
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.get('.cvat-issue-tracker-value').should('have.text', dummyBugTrackerUrl);
            cy.contains('button', 'Open the issue').should('exist').and('be.visible');
            cy.get('.cvat-issue-tracker').find('[aria-label="Edit"]').click();
            cy.get('.cvat-issue-tracker-value').find('textarea').clear();
            cy.get('.cvat-issue-tracker-value').find('textarea').type(`${incorrectBugTrackerUrl}{Enter}`);
            cy.get('.cvat-modal-issue-tracker-update-task-fail')
                .should('exist')
                .and('be.visible')
                .find('button')
                .click(); // Close modal window
        });

        it('Remove issue trasker URL.', () => {
            cy.get('.cvat-issue-tracker-value').should('have.text', dummyBugTrackerUrl);
            cy.get('.cvat-issue-tracker').find('[aria-label="Edit"]').click();
            cy.get('.cvat-issue-tracker-value').find('textarea').clear();
            cy.get('.cvat-issue-tracker-value').find('textarea').type('{Enter}');
            cy.get('.cvat-open-bug-tracker-button').should('not.exist'); // Not specified
            cy.contains('button', 'Open the issue').should('not.exist');
        });
    });
});
