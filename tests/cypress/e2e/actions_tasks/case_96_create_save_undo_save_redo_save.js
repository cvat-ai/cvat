// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Create an object, save, undo, save, redo, save.', () => {
    const caseId = '96';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create an object, save, undo, save, redo, save. There should be no error notification.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.saveJob('PATCH', 200, 'saveJobUndoRedo');
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.saveJob('PATCH', 200, 'saveJobUndoRedo');
            cy.contains('.cvat-annotation-header-button', 'Redo').click();
            cy.saveJob('PATCH', 200, 'saveJobUndoRedo');
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');
        });
    });
});
