// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';
    let taskId;

    function login(credential, password) {
        cy.get('#credential').clear().type(credential);
        cy.get('#password').clear().type(password);
        cy.get('[type="submit"]').click();
    }

    before(() => {
        cy.visit('auth/login');
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
            cy.url().should('include', `/auth/login?next=/tasks/${taskId}`);
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
                const token = response.body.key;
                cy.visit(`/auth/login-with-token/${token}?next=/tasks/${taskId}`);
                cy.contains('.cvat-task-details-task-name', `${taskName}`).should('be.visible');
            });
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

        it('Login with Google and GitHub. Logout', () => {
            let socialAuthMethods;
            cy.request({
                method: 'GET',
                url: '/api/auth/social/methods/',
            }).then((response) => {
                socialAuthMethods = Object.keys(response.body).filter((item) => response.body[item].is_enabled);
                expect(socialAuthMethods).length.gt(0);
                cy.visit('auth/login');

                cy.get('.cvat-social-authentication-icon').should('have.length', socialAuthMethods.length).within((items) => {
                    for (const item of items) {
                        expect(item.children.length).to.be.equal(1); // check that icon was received from the server
                    }
                });

                for (const provider of socialAuthMethods) {
                    let username = '';
                    cy.get(`.cvat-social-authentication-${provider}`).should('be.visible').click();
                    // eslint-disable-next-line cypress/no-unnecessary-waiting
                    cy.get('.cvat-right-header').should('exist').and('be.visible').within(() => {
                        cy.get('.cvat-header-menu-user-dropdown-user').should(($div) => {
                            username = $div.text();
                        });
                    }).then(() => {
                        cy.logout(username);
                    });
                }
            });
        });
    });
});
