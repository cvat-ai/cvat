// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';
    let taskId;

    function login(credential, password) {
        cy.get('[placeholder="Email or Username"]').clear().type(credential);
        cy.get('[placeholder="Password"]').clear().type(password);
        cy.get('[type="submit"]').click();
    }

    before(() => {
        cy.visit('auth/login');
    });

    function loginWithoutCredentials(userName, password) {
        const locators = {
            submitButton: '[type="submit"]',
            userField: '[placeholder="Email or Username"]',
            passwordField: '[placeholder="Password"]',
            notification : {
                message: '.ant-notification-notice-content',
                close: '.ant-notification-notice-close-x',
            }
        }
        const userMessage = 'Please specify a email or username';
        const passwordMessage = 'Please specify a password';
        if (userName) {
            cy.get(locators.userField).type(userName);
            cy.get(locators.submitButton).click();
            cy.contains(passwordMessage).should('exist');
        }
        else if (password) {
            cy.get(locators.passwordField).type(password);
            cy.get(locators.submitButton).click();
            cy.contains(userMessage).should('exist');
        }
        else {
            cy.get(locators.userField).clear();
            cy.get(locators.passwordField).clear();
            cy.get(locators.submitButton).click();
            cy.contains(userMessage).should('exist');
            cy.contains(passwordMessage).should('exist');
        }
        cy.get(locators.userField).clear();
        cy.get(locators.passwordField).clear();
    }

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

        it('Empty user and empty password', () => {
            loginWithoutCredentials(false, false);
        });

        it('Correct user and empty password', () => {
            loginWithoutCredentials(Cypress.env('user'), false);
        });

        it('Empty user and correct password', () => {
            loginWithoutCredentials(false, Cypress.env('password'));
        });

        it('Incorrect user and empty password', () => {
            loginWithoutCredentials('randomUser123', false);
        });

        it('Empty user and incorrect password', () => {
            loginWithoutCredentials(false, 'randomPassword123');
        });
    });
});
