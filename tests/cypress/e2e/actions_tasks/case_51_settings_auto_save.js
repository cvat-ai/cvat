// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
                cy.get('[type="checkbox"]').check();
                cy.get('[type="checkbox"]').should('be.checked');
                cy.get('[type="checkbox"]').uncheck();
                cy.get('[type="checkbox"]').should('not.be.checked');
            });
            cy.get('.cvat-workspace-settings-auto-save-interval').within(() => {
                // The absence of a value takes a minimum value
                cy.get('[role="spinbutton"]').focus();
                cy.get('[role="spinbutton"]').clear();
                cy.get('[role="spinbutton"]').should('have.value', 1);

                // Interval should`t be less then 1
                cy.get('[role="spinbutton"]').focus();
                cy.get('[role="spinbutton"]').clear();
                cy.get('[role="spinbutton"]').type(0);
                cy.get('[role="spinbutton"]').blur();
                cy.get('[role="spinbutton"]').should('have.value', 1);

                cy.get('[role="spinbutton"]').focus();
                cy.get('[role="spinbutton"]').clear();
                cy.get('[role="spinbutton"]').type(5);
                cy.get('[role="spinbutton"]').blur();
                cy.get('[role="spinbutton"]').should('have.value', 5);
            });
        });
    });
});
