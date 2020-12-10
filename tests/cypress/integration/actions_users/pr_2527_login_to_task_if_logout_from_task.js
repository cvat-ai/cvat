// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Login to task if logout from task', () => {
    const prId = '2527';
    let idTask;

    function loginToTask(username = Cypress.env('user'), password = Cypress.env('password')) {
        cy.get('[placeholder="Username"]').type(username);
        cy.get('[placeholder="Password"]').type(password);
        cy.get('[type="submit"]').click();
        cy.url()
            .should('include', `/tasks/${idTask}`)
            .and('not.include', '/auth/login/');
    }

    function logoutFromTask(username = Cypress.env('user')) {
        cy.get('.cvat-right-header').within(() => {
            cy.get('.cvat-header-menu-dropdown').should('have.text', username).trigger('mouseover', { which: 1 });
        });
        cy.get('span[aria-label="logout"]').click();
        cy.url().should('include', `/auth/login/?next=/tasks/${idTask}`);
    }

    before(() => {
        cy.openTask(taskName);

        // get id task
        cy.url().then((link) => {
            idTask = Number(link.split('/').slice(-1)[0]);
        });
    });

    describe(`Testing pr "${prId}"`, () => {
        it('Logout and login', () => {
            logoutFromTask();
            loginToTask();
            cy.contains('.cvat-task-details-task-name', `${taskName}`).should('exist');
        });
    });
});
