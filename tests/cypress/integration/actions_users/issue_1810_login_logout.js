// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';
    let taskId;

    function login(userName, password) {
        cy.get('[placeholder="Username"]').clear().type(userName);
        cy.get('[placeholder="Password"]').clear().type(password);
        cy.get('[type="submit"]').click();
    }

    before(() => {
        cy.visit('auth/login');
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Login', () => {
            cy.closeModalUnsupportedPlatform();
            cy.login();
        });

        it('Logout', () => {
            cy.logout();
        });

        it('Login and open task', () => {
            cy.login();
            cy.openTask(taskName);
            // get id task
            cy.url().then((link) => {
                taskId = Number(link.split('/').slice(-1)[0]);
            });
        });

        it('Logout and login to task via GUI', () => {
            // logout from task
            cy.get('.cvat-right-header').within(() => {
                cy.get('.cvat-header-menu-user-dropdown')
                    .should('have.text', Cypress.env('user'))
                    .trigger('mouseover', { which: 1 });
            });
            cy.get('span[aria-label="logout"]').click();
            cy.url().should('include', `/auth/login/?next=/tasks/${taskId}`);
            // login to task
            login(Cypress.env('user'), Cypress.env('password'));
            cy.url().should('include', `/tasks/${taskId}`).and('not.include', '/auth/login');
            cy.contains('.cvat-task-details-task-name', `${taskName}`).should('be.visible');
        });

        it('Logout and login to task via token', () => {
            cy.logout();
            // get token and login to task
            cy.request({
                method: 'POST',
                url: '/api/auth/login',
                body: {
                    username: Cypress.env('user'),
                    email: Cypress.env('email'),
                    password: Cypress.env('password'),
                },
            }).then(async (response) => {
                const cookies = await response.headers['set-cookie'];
                const csrfToken = cookies[0].match(/csrftoken=\w+/)[0].replace('csrftoken=', '');
                const sessionId = cookies[1].match(/sessionid=\w+/)[0].replace('sessionid=', '');
                cy.visit(`/login-with-token/${sessionId}/${csrfToken}?next=/tasks/${taskId}`);
                cy.contains('.cvat-task-details-task-name', `${taskName}`).should('be.visible');
            });
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
