// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Annotation filter help dialog window.', () => {
    const issueId = '2690';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open annotation filters help dialog window. The window is visible.', () => {
            cy.get('.cvat-annotations-filters-input').within(() => {
                // class="ant-select-selection-placeholder" has CSS pointer-events: none
                cy.get('.ant-select-selection-placeholder').invoke('css', 'pointer-events', 'auto'); // Replace CSS "pointer-events" to auto
                cy.get('[aria-label="filter"]').click();
            });
            cy.get('.cvat-annotations-filters-help-modal-window').should('exist').and('be.visible');
        });

        it('Close annotation filters help dialog window. The window is closed.', () => {
            cy.get('.cvat-annotations-filters-help-modal-window').within(() => {
                cy.contains('button', 'OK').click();
            });
            cy.get('.cvat-annotations-filters-help-modal-window').should('not.exist');
        });
    });
});
