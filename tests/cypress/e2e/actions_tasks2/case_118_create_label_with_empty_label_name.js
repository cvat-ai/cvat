// Copyright (C) 2021-2023 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Creating a label with an empty label name.', () => {
    const caseId = '118';

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Should display an error message if label name is empty', () => {
            // Attempt to create a label with an empty name
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('button[type="submit"]').click();

            cy.contains('[role="alert"]', 'Label name cannot be empty')
                .should('exist')
                .and('be.visible');
        });
    });
});
