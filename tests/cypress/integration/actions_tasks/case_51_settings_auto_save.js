// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings. "Auto save" option.', () => {
    const caseId = '51';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check "Enable auto save". Change the interval.', () => {
            cy.openSettings();
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-auto-save').within(() => {
                cy.get('[type="checkbox"]').check().should('be.checked');
                cy.get('[type="checkbox"]').uncheck().should('not.be.checked');
            });
            cy.get('.cvat-workspace-settings-auto-save-interval').within(() => {
                // The absence of a value takes a minimum value
                cy.get('[role="spinbutton"]').focus().clear().should('have.value', 1);
                // Interval should`t be less then 1
                cy.get('[role="spinbutton"]').focus().clear().type(0).blur().should('have.value', 1);
                cy.get('[role="spinbutton"]').focus().clear().type(5).blur().should('have.value', 5);
            });
        });
    });
});
