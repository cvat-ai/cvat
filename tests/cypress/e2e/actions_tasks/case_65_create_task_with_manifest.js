// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create an annotation task with manifest.', () => {
    const caseId = '65';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const pathToFiles = `${__dirname}/assets/case_65_manifest`;
    // Specify paths relative to the fixtures folder to the file names
    // for the plugin "cypress-file-upload" to work correctly
    const filesToAttach = [
        `../../${pathToFiles}/demo_manifest.jsonl`,
        `../../${pathToFiles}/image_case_65_1.png`,
        `../../${pathToFiles}/image_case_65_2.png`,
    ];

    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Task created successfully.', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, filesToAttach);
            cy.get('.cvat-notification-create-task-fail').should('not.exist');
        });

        it('The task and a job opened successfully.', () => {
            cy.openTaskJob(taskName);
        });

        it('Moving through frames works correctly.', () => {
            cy.checkFrameNum(0);
            cy.get('.cvat-player-filename-wrapper').should('have.text', 'image_case_65_1.png');
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-canvas-container').should('exist');
            cy.checkFrameNum(1);
            cy.get('.cvat-player-filename-wrapper').should('have.text', 'image_case_65_2.png');
        });
    });
});
