// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Creating a label with an empty name.', () => {
    const caseId = '118';

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Should display an error message if label name is empty', () => {
            // Attempt to create a label with an empty name
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('button[type="submit"]').click();

            cy.contains('[role="alert"]', 'Please specify a name')
                .should('exist')
                .and('be.visible');
        });
    });
});
