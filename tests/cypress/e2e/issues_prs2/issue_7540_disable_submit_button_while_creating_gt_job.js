// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check GT button should be disabled while waiting for GT job creation', () => {
    const issueId = '7540';

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open create GT job form', () => {
            cy.get('.cvat-create-job').click({ force: true });
            cy.url().should('include', '/jobs/create');
        });

        it('Fill fields', () => {
            cy.get('.cvat-select-job-type').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .first()
                .within(() => {
                    cy.get('.ant-select-item-option[title="Ground truth"]').click();
                });

            cy.get('.cvat-input-frame-count').clear();
            cy.get('.cvat-input-frame-count').type(1);
        });

        it('Check submit button is disable while creating job', () => {
            cy.intercept('POST', '/api/jobs**', (req) => new Promise((resolve) => {
                setTimeout(() => resolve(req.continue()), 2000);
            })).as('delayedRequest');

            cy.contains('button', 'Submit').click({ force: true });
            cy.contains('button', 'Submit').should('be.disabled');
            cy.wait('@delayedRequest');
        });

        it('GT job created', () => {
            cy.get('.cvat-spinner').should('not.exist');
            cy.url().should('match', /\/tasks\/\d+\/jobs\/\d+/);
        });
    });
});
