// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';
    let taskId;

    function login(credential, password) {
        cy.get('#credential').clear();
        cy.get('#credential').type(credential);
        cy.get('#password').clear();
        cy.get('#password').type(password);
        cy.get('[type="submit"]').click();
    }

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Login', () => {
            cy.login();
        });

        it('Logout', () => {
            cy.logout();
        });

        it('Login and open task', () => {
            cy.login();
            cy.openTask(taskName);
            // get id task
            cy.url().then((url) => {
                const [link] = url.split('?');
                taskId = Number(link.split('/').slice(-1)[0]);
            });
        });

        it('Logout and login to task via GUI', () => {
            // logout from task
            cy.get('.cvat-right-header').within(() => {
                cy.get('.cvat-header-menu-user-dropdown')
                    .should('have.text', Cypress.env('user'))
                    .click();
            });
            cy.get('span[aria-label="logout"]').click();
            cy.url().should('include', `/auth/login?next=/tasks/${taskId}`);
            // login to task
            login(Cypress.env('user'), Cypress.env('password'));
            cy.url().should('include', `/tasks/${taskId}`).and('not.include', '/auth/login');
            cy.contains('.cvat-task-details-task-name', `${taskName}`).should('be.visible');
        });

        it('Login via email', () => {
            cy.logout();
            login(Cypress.env('email'), Cypress.env('password'));
            cy.url().should('contain', '/tasks');
        });

        it('Incorrect user and correct password', () => {
            cy.logout();
            login('randomUser123', Cypress.env('password'));
            cy.url().should('include', '/auth/login');
            cy.closeNotification('.cvat-notification-notice-login-failed');
        });

        it('Correct user and incorrect password', () => {
            login(Cypress.env('user'), 'randomPassword123');
            cy.url().should('include', '/auth/login');
            cy.closeNotification('.cvat-notification-notice-login-failed');
        });

        it('Incorrect user and incorrect password', () => {
            login('randomUser123', 'randomPassword123');
            cy.url().should('include', '/auth/login');
            cy.closeNotification('.cvat-notification-notice-login-failed');
        });
    });
});
