// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';
    let taskId;
    const correctPassword =  Cypress.env('password');
    const correctUser =  Cypress.env('user');
    const correctEmail = Cypress.env('email');

    function login(credential, password) {
        cy.get('[placeholder="Email or Username"]').clear().type(credential);
        cy.get('[placeholder="Password"]').clear().type(password);
        cy.get('[type="submit"]').click();
    }

    before(() => {
        cy.visit('auth/login');
    });

    after(() => {
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskId}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
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
        } else if (password) {
            cy.get(locators.passwordField).type(password);
            cy.get(locators.submitButton).click();
            cy.contains(userMessage).should('exist');
        } else {
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
                    .should('have.text', correctUser)
                    .trigger('mouseover', { which: 1 });
            });
            cy.get('span[aria-label="logout"]').click();
            cy.url().should('include', `/auth/login/?next=/tasks/${taskId}`);
            // login to task
            login(correctUser, correctPassword);
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
                    username: correctUser,
                    email: correctEmail,
                    password: correctPassword,
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
            login(correctEmail, correctPassword);
            cy.url().should('contain', '/tasks');
        });

        it('Incorect one of the credentials', () => {
            cy.logout();

            const data = [
                {userName: 'randomUser123', password: correctPassword},
                {userName: correctUser, password: 'randomPassword123'},
                {userName: 'randomUser123', password: 'randomPassword123'}
            ];

            data.forEach((item) => {
                login(item.userName, item.password);
                cy.url().should('include', '/auth/login');
                cy.closeNotification('.cvat-notification-notice-login-failed');
            });
        });

        it('Empty one of the fields', () => {
            const data = [
                { userName: false, password: false},
                { userName: correctUser, password: false},
                { userName: false, password: correctPassword},
                { userName: 'randomUser123', password: false},
                { userName: false, password: 'randomPassword123'},
            ];

            data.forEach((item) => {
                loginWithoutCredentials(item.userName, item.password);
            });
        });
    });
});
