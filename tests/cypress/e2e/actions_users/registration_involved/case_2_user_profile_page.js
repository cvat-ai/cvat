// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    toSnakeCase, aMonthFrom, aYearFrom, parseDatetime, format, prettify,
} from '../../../support/utils';
import { ClipboardCtx } from '../../../support/const';
import { projectSpec } from '../../../support/const_project';

Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setLocaleOverride',
    params: {
        locale: 'en-GB',
    },
});

context('User page, password change, token handling', () => {
    function changePassword(myPassword, myNewPassword) {
        cy.get('.cvat-security-password-card').should('exist').and('be.visible');
        cy.get('.cvat-security-password-change-button').should('exist').and('be.visible').click();
        cy.get('.cvat-change-password-form').should('exist').and('be.visible');
        cy.get('.cvat-change-password-form').within(() => {
            cy.get('#oldPassword').type(myPassword);
            cy.get('#newPassword1').type(myNewPassword);
            cy.get('#newPassword2').type(myNewPassword);
            cy.get('.cvat-change-password-form-button').click();
        });
    }

    /**
     * Open a tab on profile page
     * @param {('Security' | 'Profile')} tab
     */
    function openProfileTab(tab) {
        cy.get('.cvat-profile-page-navigation-menu')
            .should('exist')
            .and('be.visible')
            .find('[role="menuitem"]')
            .filter(`:contains("${Cypress._.capitalize(tab)}")`)
            .click();
    }

    /**
     * Perform a token action after clicking on token action menu
     * @param {('Revoke' | 'Edit')} action
     */
    function tokenAction(action) {
        cy.get('.cvat-api-token-actions-menu').should('exist').and('be.visible').click();
        cy.get('.ant-dropdown').not('.ant-dropdown-hidden').should('be.visible').within(() => {
            cy.contains('[role="menuitem"]', Cypress._.capitalize(action))
                .should('exist').and('be.visible').click();
        });
    }
    function revokeFirstToken() {
        cy.intercept('DELETE', 'api/auth/access_tokens/**').as('deleteToken');
        cy.intercept('GET', 'api/auth/access_tokens**').as('getToken');
        tokenAction('Revoke');
        cy.get('.cvat-modal-confirm-revoke-token')
            .should('exist').and('be.visible').within(() => {
                cy.get('.cvat-api-token-revoke-button')
                    .should('exist').and('be.visible')
                    .click();
            });
        cy.wait('@deleteToken');
        cy.wait('@getToken');
    }
    function createToken({ name = null, readOnly = false }) {
        cy.get('.cvat-create-api-token-button').should('exist').and('be.visible').click();
        cy.contains('.cvat-api-token-form', 'Create API Token').should('be.visible').within(() => {
            cy.get('.cvat-api-token-form-name').should('exist').and('be.visible');
            if (name) {
                cy.get('.cvat-api-token-form-name').find('.ant-input-clear-icon[role="button"]').click();
                cy.get('.cvat-api-token-form-name').find('input').type(name);
            }
            if (readOnly) {
                cy.get('.cvat-api-token-form-read-only').find('input').click();
                cy.get('.ant-checkbox-checked').should('exist');
            } else {
                cy.get('.ant-checkbox-checked').should('not.exist'); // read-only by default
            }
            cy.get('.cvat-api-token-form-expiration-date').should('exist').and('be.visible');
            cy.get('.cvat-api-token-form-submit').should('exist').and('be.visible').click();
        });
    }

    /**
     * Expected token representation in UI table view
     * @param {Object} expectedRowView
     * @param {string} expectedRowView.name - token name
     * @param {('Read Only' | 'Read/Write')} expectedRowView.permissions - token permissions
     * @param {string} expectedRowView.created - token created date in MM/DD/YYYY
     * @param {string} expectedRowView.expires - "Never" or token expiry date in MM/DD/YYYY
     * @param {string} expectedRowView.lastUsed - "Never" or token last used date in MM/DD/YYYY
     */
    function checkTokenTableView(expectedRowView) {
        const {
            name, permissions, created, expires, lastUsed,
        } = expectedRowView;
        cy.get('td.cvat-api-token-name').invoke('text').should('eq', name);
        cy.get('td.cvat-api-token-permissions').invoke('text').should('eq', permissions);
        cy.get('td.cvat-api-token-created-date').invoke('text').should('eq', created);
        cy.get('td.cvat-api-token-expire-date').invoke('text').should('eq', expires);
        cy.get('td.cvat-api-token-last-used').invoke('text').should('eq', lastUsed);
    }

    const caseId = '2';
    const firstName = 'SecuserfmCaseTwo';
    const lastName = 'SecuserlmCaseTwo';
    const username = 'SecuserCase2';
    const emailAddr = `${username}@local.local`;
    const password = 'GDrb41RguF!';
    // TODO: check update email and username if/when feature is available
    const firstNameNew = 'Jane';
    const lastNameNew = 'Doe';
    const incorrectCurrentPassword = 'gDrb41RguF!';
    const newPassword = 'bYdOk8#eEd';
    const secondNewPassword = 'ndTh48@yVY';
    const userSpec = {
        firstName, lastName, email: emailAddr, password, username,
    };
    const tokenName1 = 'test1';
    const tokenName2 = 'test2';
    const tokenName3 = 'test3';
    const tokenName4 = 'test4';
    const tokenName5 = 'test5';

    // Test resource to update
    const projectName = 'Token project';
    const projectNameUpdate = `Updated ${projectName}`;
    let projectId;

    const NOW = new Date();

    before(() => {
        cy.visit('auth/login');
        cy.headlessCreateUser(userSpec);
        cy.headlessLogin({ ...userSpec, nextURL: '/tasks' });
        cy.headlessCreateProject({ ...projectSpec, name: projectName }).then(({ projectID }) => {
            projectId = projectID;
        });
    });

    after(() => {
        cy.headlessLogin();
        cy.headlessDeleteUserByUsername(username); // deleting self can be flaky, only admin should delete users
        cy.headlessDeleteProject(projectId);
        cy.headlessLogout();
    });

    context('User page', () => {
        before(() => {
            cy.openProfile();
        });
        context('Profile tab', () => {
            it("Open user's profile page. Profile is selected, username is greeted", () => {
                cy.url().should('include', '/profile#profile');
                cy.get('.ant-menu-item-selected').within(() => {
                    cy.get('.cvat-profile-page-menu-item-profile').should('have.text', 'Profile');
                });
                cy.get('.cvat-profile-page-welcome').invoke('text').should('include', `Welcome, ${username}`);
            });

            it("Change user's personal info. Update is handled correctly", () => {
                cy.intercept('PATCH', '/api/users/**', (req) => {
                    const expectedFields = toSnakeCase({ firstName: firstNameNew, lastName: lastNameNew });
                    assert(
                        Cypress._.isEqual(req.body, expectedFields),
                        'Unexpected request fields:\n' +
                        `${prettify(req.body)} !== ${prettify(expectedFields)}`,
                    );
                    req.continue((res) => {
                        const resFields = Cypress._.pick(res.body, ['first_name', 'last_name']);
                        assert(
                            Cypress._.isEqual(expectedFields, resFields),
                            'Unexpected response fields:\n' +
                            `${prettify(resFields)} !== ${prettify(expectedFields)}`,
                        );
                    });
                }).as('updateFirstLastName');

                cy.get('input[id="firstName"]').clear();
                cy.get('input[id="firstName"]').type(firstNameNew);
                cy.get('input[id="lastName"]').clear();
                cy.get('input[id="lastName"]').type(lastNameNew);

                cy.contains('button', 'Save changes').click();
                cy.wait('@updateFirstLastName');
            });
        });

        context('Security tab', () => {
            before('Open security tab', () => {
                cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');
                openProfileTab('Security');
                cy.get('@getToken').its('response.body.results').should('be.empty');
            });
            describe(`Testing "Case ${caseId}"`, () => {
                it('Change password successful, can login with new credentials', () => {
                    changePassword(password, newPassword);
                    cy.get('.cvat-notification-notice-change-password-success')
                        .should('exist')
                        .and('be.visible')
                        .invoke('text').should('include', 'New password has been saved');
                    cy.closeNotification('.cvat-notification-notice-change-password-success');
                    cy.logout();
                    cy.login(username, newPassword);
                    cy.openProfile();
                    openProfileTab('Security');
                });

                it('Change password unsuccessful, error notification appears. Cancel button works', () => {
                    changePassword(incorrectCurrentPassword, secondNewPassword);
                    cy.get('.cvat-notification-notice-change-password-failed').should('exist');
                    cy.closeNotification('.cvat-notification-notice-change-password-failed');
                    cy.contains('button', 'Cancel').should('exist').and('be.visible').click();
                    cy.contains('button', 'Change password').should('exist').and('be.visible');
                });
            });

            describe('Token manipulation', () => {
                // Token defaults
                const todayDate = new Date();
                const nextMonthDate = aMonthFrom(todayDate);
                const nextYearDate = aYearFrom(todayDate);
                const defaultToken = {
                    name: 'New token',
                    expires: format(nextYearDate),
                    created: format(todayDate),
                    permissions: 'Read/Write',
                    lastUsed: 'Never',
                };

                // Clipboard context
                const clipboard = new ClipboardCtx('.cvat-api-token-copy-button');

                before('Token related UI is visible, no tokens are present', () => {
                    cy.get('.cvat-security-api-tokens-card').should('exist').and('be.visible');
                    cy.get('.cvat-api-tokens-table').should('exist').and('be.visible').within(() => {
                        cy.contains('No data').should('exist').and('be.visible');
                    });
                });

                beforeEach(() => {
                    clipboard.init();
                    // get reset every test:
                    // https://docs.cypress.io/app/core-concepts/variables-and-aliases
                });

                afterEach(() => {
                    // clear the table to work only with one token at the time
                    revokeFirstToken();
                    cy.contains('No data').should('exist').and('be.visible');
                });

                it('Add a token. It is sent to backend. Modal appears, token can be copied', () => {
                    cy.intercept('POST', '/api/auth/access_tokens**').as('postToken');
                    cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');

                    const newToken = { ...defaultToken, name: tokenName1 };

                    createToken({ name: newToken.name });

                    // Correct token is sent, the modal shows it for the user to save
                    cy.wait('@postToken').then(({
                        response: { statusCode, statusMessage, body: { value } },
                    }) => {
                        const token = value;
                        expect(statusCode).to.equal(201, statusMessage);
                        cy.get('.cvat-api-token-created-modal').should('exist').and('be.visible').within(() => {
                            cy.get('.cvat-api-token-copy-button').should('exist').and('be.visible');
                            clipboard.copy().should('equal', token);
                        });
                    });

                    // Get request is successful and reloads the table view
                    cy.wait('@getToken').then(({ response: { statusCode, statusMessage } }) => {
                        expect(statusCode).to.equal(200, statusMessage);
                        cy.contains(
                            '.cvat-api-token-created-modal-confirm-saved-button',
                            'I have securely saved my token',
                        ).should('exist').and('be.visible')
                            .click();
                        cy.get('.cvat-api-token-created-modal').should('not.exist');
                        cy.get('.cvat-spinner').should('not.exist');
                        checkTokenTableView(newToken);
                    });
                });

                it('Create and update a token. Update is handled correctly', () => {
                    const tokenAfterUpdate = {
                        name: tokenName3,
                        permissions: 'Read Only',
                        created: defaultToken.created,
                        expires: format(nextMonthDate),
                        lastUsed: defaultToken.lastUsed,
                    };

                    createToken({ name: tokenName2 });
                    cy.get('.cvat-api-token-created-modal-confirm-saved-button').click();

                    // Edit the token
                    cy.intercept('PATCH', '/api/auth/access_tokens/**').as('patchToken');
                    cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');
                    tokenAction('Edit');
                    cy.contains('.cvat-api-token-form', 'Edit API Token').should('be.visible').within(() => {
                        cy.get('.cvat-api-token-form-name').find('input').clear();
                        cy.get('.cvat-api-token-form-name').find('input').type(tokenAfterUpdate.name);
                        cy.get('.cvat-api-token-form-expiration-date')
                            .find('.anticon-close-circle') // cy.clearing doesn't work
                            .click();
                        cy.get('.cvat-api-token-form-expiration-date')
                            .find('input')
                            .type(`${tokenAfterUpdate.expires}{enter}`);
                        cy.get('.ant-picker-date-panel')
                            .should('not.exist'); // correct date should discard the calendar
                        cy.get('.cvat-api-token-form-read-only').find('input').click();
                        cy.get('.ant-checkbox-checked').should('exist');
                        cy.contains('button', 'Update').click();
                    });
                    cy.wait('@patchToken').then(({ request: { body } }) => {
                        expect(body.name).to.equal(tokenAfterUpdate.name);
                        expect(format(parseDatetime(body.expiry_date))).to.equal(tokenAfterUpdate.expires);
                        expect(body.read_only).to.equal(
                            tokenAfterUpdate.permissions === 'Read Only',
                        );
                    });
                    cy.wait('@getToken');
                    checkTokenTableView(tokenAfterUpdate);
                });

                function testTokenWithApiRequest(params) {
                    // Prod REST API with attempt to write to user's last name
                    const {
                        name, expectedLastUsed, expectedStatus, expectedPermissions,
                        failOnStatusCode,
                    } = params;

                    const newToken = {
                        ...defaultToken,
                        name,
                        permissions: expectedPermissions,
                    };
                    const tokenAfterUpdate = {
                        ...newToken,
                        lastUsed: format(expectedLastUsed),
                    };
                    createToken({ name: newToken.name, readOnly: expectedPermissions === 'Read Only' });
                    cy.get('.cvat-api-token-created-modal').should('exist').and('be.visible');
                    cy.get(clipboard.button).should('exist').and('be.visible');
                    clipboard.copy().then((token) => {
                        cy.get('.cvat-api-token-created-modal-confirm-saved-button')
                            .should('exist').and('be.visible').click();

                        checkTokenTableView(newToken);

                        // Use read/write token to update a resource
                        cy.request({
                            method: 'PATCH',
                            url: `/api/projects/${projectId}`,
                            failOnStatusCode,
                            body: { name: projectNameUpdate },
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }).its('status').then((status) => {
                            expect(status).to.equal(expectedStatus, status);
                        });

                        // Switch tabs to update token meta without heavy page reload
                        openProfileTab('Profile');
                        openProfileTab('Security');
                        checkTokenTableView(tokenAfterUpdate);
                    });
                }

                it("Try REST API token with correct permissions. Token's 'Last Used' is updated", () => {
                    testTokenWithApiRequest({
                        name: tokenName4,
                        expectedStatus: 200,
                        expectedLastUsed: NOW,
                        expectedPermissions: 'Read/Write',
                        failOnStatusCode: true,
                    });
                });

                it("Try REST API token with incorrect permissions. Token's 'Last Used' is updated", () => {
                    testTokenWithApiRequest({
                        name: tokenName5,
                        expectedStatus: 403,
                        expectedLastUsed: NOW,
                        expectedPermissions: 'Read Only',
                        failOnStatusCode: false,
                    });
                });
            });
        });
    });
});
