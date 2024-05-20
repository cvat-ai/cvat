// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Regression tests', () => {
    const labelName = 'Invalid video';
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const pathToFile = `${__dirname}/assets`;
    const filesToAttach = [`../../${pathToFile}/video_without_valid_keyframes.ts`];

    before(() => {
        before(() => {
            cy.visit('auth/login');
            cy.login();
        });
    });

    describe('Regression tests', () => {
        it('Create and check task with a video file without valid keyframes', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, filesToAttach);
            cy.get('.cvat-notification-create-task-fail').should('not.exist');
            cy.openTaskJob(taskName);
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-canvas-container').should('exist');
        });
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });
});
