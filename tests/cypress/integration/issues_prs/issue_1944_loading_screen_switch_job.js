// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, advancedConfigurationParams } from '../../support/const';

context(
    'Being able to return to the job list for a task and start a new job without an infinite loading screen.',
    () => {
        const issueId = '1944';

        before(() => {
            cy.openTaskJob(taskName);
        });

        describe(`Testing issue "${issueId}"`, () => {
            it('The first job opened', () => {
                cy.get('input[role="spinbutton"]').should('have.value', '0');
            });
            it('Return to tasks page', () => {
                cy.get('[value="tasks"]').click();
                cy.url().should('include', '/tasks').and('not.contain', '/jobs');
            });
            it('Open the task. Open second job', () => {
                cy.openTaskJob(taskName, 1);
                cy.get('.cvat-annotation-header').should('exist');
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize);
            });
        });
    },
);
