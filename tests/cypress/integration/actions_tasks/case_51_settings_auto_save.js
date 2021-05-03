// Copyright (C) 2021 Intel Corporation
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
                cy.get('.ant-checkbox-checked').should('exist');
                cy.get('[type="checkbox"]').uncheck();
                cy.get('.ant-checkbox-checked').should('not.exist');
            });
            cy.get('.cvat-workspace-settings-auto-save-interval').within(() => {
                cy.get('[role="spinbutton"]').clear().type(0).tab();
                cy.get('[role="spinbutton"]').should('have.value', 1); // Interval should`t be less then 1
                cy.get('[role="spinbutton"]').clear().type(5).tab();
                cy.get('[role="spinbutton"]').should('have.value', 5);
            });
        });
    });
});
