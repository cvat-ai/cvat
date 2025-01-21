// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create a task with files from remote sources.', () => {
    const caseId = '46';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const wrongUrl =
        'https://raw.githubusercontent.com/cvat-ai/cvat/v1.2.0/cvat/apps/documentation/static/documentation/images/cvatt.jpg';
    const correctUrl = wrongUrl.replace('cvatt.jpg', 'cvat.jpg');

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').click();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Try to create a task with wrong remote file. The task is not created.', () => {
            cy.get('[id="name"]').type(taskName);
            cy.addNewLabel({ name: labelName });
            cy.contains('Remote sources').click();
            cy.get('.cvat-file-selector-remote').type(wrongUrl);
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.cvat-notification-notice-create-task-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-create-task-failed');
        });

        it('Set correct URL to remote file. The task is created.', () => {
            cy.get('.cvat-file-selector-remote').clear();
            cy.get('.cvat-file-selector-remote').type(correctUrl);
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.cvat-notification-create-task-success').should('exist');
            cy.goToTaskList();
            cy.contains('.cvat-item-task-name', taskName).should('exist');
        });
    });
});
