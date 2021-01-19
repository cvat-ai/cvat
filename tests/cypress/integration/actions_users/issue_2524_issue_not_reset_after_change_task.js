// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context("Some parts of the Redux state (issues) isn't reset after chaning a task.", () => {
    const issueId = '2524';
    const labelName = `Case ${issueId}`;
    const taskName = {
        firstTaskName: 'First task issue 2524',
        secondTaskName: 'Second task issue 2524',
    };
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
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

    const createIssueRectangle = {
        type: 'rectangle',
        description: 'rectangle issue',
        firstX: 550,
        firstY: 100,
        secondX: 650,
        secondY: 200,
    };

    before(() => {
        cy.clearLocalStorageSnapshot();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('/');
        cy.login();
        cy.createAnnotationTask(taskName.firstTaskName, labelName, attrName, textDefaultValue, archiveName);
        cy.goToTaskList();
        cy.createAnnotationTask(taskName.secondTaskName, labelName, attrName, textDefaultValue, archiveName);
    });

    beforeEach(() => {
        cy.restoreLocalStorage();
    });

    afterEach(() => {
        cy.saveLocalStorage();
    });

    after(() => {
        cy.goToTaskList();
        cy.getTaskID(taskName.firstTaskName).then(($taskID) => {
            cy.deleteTask(taskName.firstTaskName, $taskID);
        });
        cy.reload();
        cy.closeModalUnsupportedPlatform();
        cy.getTaskID(taskName.secondTaskName).then(($taskID) => {
            cy.deleteTask(taskName.secondTaskName, $taskID);
        });
    });

    describe(`Testing "${labelName}"`, () => {
        it('Open first task and request to review.', () => {
            cy.openTaskJob(taskName.firstTaskName);
            cy.interactMenu('Request a review');
            cy.get('.cvat-request-review-dialog')
                .should('exist')
                .within(() => {
                    cy.get('.cvat-user-search-field').click();
                });
            cy.get('.ant-select-dropdown').within(() => {
                cy.contains(new RegExp(`^${Cypress.env('user')}`)).click();
            });
            cy.contains('.cvat-request-review-dialog', 'Reviewer:').within(() => {
                cy.contains('[type="button"]', 'Submit').click();
            });
            cy.url().should('include', '/tasks');
        });

        it('Open job again and create an issue', () => {
            cy.openJob();
            cy.createIssueFromControlButton(createIssueRectangle);
        });

        it('Open the second task. Open job. Issue not exist.', () => {
            cy.goToTaskList();
            cy.openTaskJob(taskName.secondTaskName);
            cy.get('.cvat-hidden-issue-label').should('not.exist');
        });
    });
});
