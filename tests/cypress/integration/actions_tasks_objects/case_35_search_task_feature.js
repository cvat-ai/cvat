// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Search task feature.', () => {
    const caseId = '35';

    function searchTask(option, result) {
        cy.server().route('GET', '/api/v1/tasks**').as('searchTask');
        cy.get('.cvat-task-page-search-task').find('[placeholder="Search"]').clear().type(`${option}{Enter}`);
        cy.wait('@searchTask').its('status').should('equal', 200);
        cy.contains('.cvat-item-task-name', taskName).should(result);
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Type to task search some field and check result.', () => {
            searchTask(`${taskName.substring(0, 3)}`, 'exist');
            searchTask('121212', 'not.exist');
            searchTask(`owner: ${Cypress.env('user')}`, 'exist');
            searchTask('mode: annotation', 'exist');
            searchTask('status: annotation', 'exist');
            searchTask(`mode: interpolation AND owner: ${Cypress.env('user')}`, 'not.exist');
        });
    });
});
