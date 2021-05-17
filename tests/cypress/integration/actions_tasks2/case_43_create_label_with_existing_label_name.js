// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Creating a label with existing label name.', () => {
    const caseId = '43';
    let firstLabelName = '';

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Try to create a label with existing name. Should not be successful.', () => {
            // Get the name of the first existing label.
            cy.get('.cvat-constructor-viewer-item')
                .first()
                .then((firstLabel) => {
                    firstLabelName = firstLabel.text();
                    // Try to create a label with existing label name
                    cy.get('.cvat-constructor-viewer-new-item').click();
                    cy.get('[placeholder="Label name"]').type(firstLabelName);
                    cy.contains('[role="alert"]', 'Label name must be unique for the task') // Checking alert visibility
                        .should('exist')
                        .and('be.visible');
                });
        });
    });
});
