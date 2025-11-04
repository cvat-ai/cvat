// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { toSnakeCase } from '../../../support/utils';
import { ClipboardCtx } from '../../../support/const';

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
    function openSecurityTab() {
        cy.get('.cvat-profile-page-navigation-menu')
            .should('exist')
            .and('be.visible')
            .find('[role="menuitem"]')
            .filter(':contains("Security")')
            .click();
    }
    function tokenAction(action) {
        cy.get('.ant-dropdown').not('.ant-dropdown-hidden').should('be.visible').within(() => {
            cy.contains('[role="menuitem"]', Cypress._.capitalize(action))
                .should('exist').and('be.visible').click();
        });
    }

    /**
     * Token table row
     * @param {object} expectedRowView
     * @param {string} expectedRowView.Name
     * @param {("Read Only" | "Read/Write")} expectedRowView.Permissions
     * @param {string} expectedRowView.Created - DD/MM/YYYY
     * @param {string} expectedRowView.Expires - DD/MM/YYYY or "Never"
     * @param {string} expectedRowView.LastUsed - DD/MM/YYYY or "Never"
     */
    function checkTokenTableView(expectedRowView) {
        cy.get('td.cvat-api-token-name').invoke('text').should('eq', expectedRowView.Name);
        cy.get('td.cvat-api-token-permissions').invoke('text').should('eq', expectedRowView.Permissions);
        cy.get('td.cvat-api-token-created').invoke('text').should('eq', expectedRowView.Created);
        cy.get('td.cvat-api-token-expires').invoke('text').should('eq', expectedRowView.Expires);
        cy.get('td.cvat-api-token-last-used').invoke('text').should('eq', expectedRowView.LastUsed);
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

    before(() => {
        cy.visit('auth/login');
        cy.headlessCreateUser(userSpec);
        cy.headlessLogin({ ...userSpec, nextURL: '/tasks' });
    });

    after(() => {
        cy.headlessLogin();
        cy.headlessDeleteUserByUsername(username); // deleting self can work incorrectly, only admin should delete users
        cy.headlessLogout();
    });

    context('User page', () => {
        before(() => {
            cy.openProfile();
        });
        context.skip('Profile tab', () => {
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
                    assert(Cypress._.isEqual(req.body, expectedFields));
                    req.continue((res) => {
                        const resFields = Cypress._.pick(res.body, ['first_name', 'last_name']);
                        assert(
                            Cypress._.isEqual(expectedFields, resFields),
                            `Unexpected response fields: ${resFields} !== ${expectedFields}`,
                        );
                    });
                }).as('updateFirstLastName');

                cy.get('input[id="firstName"]').type(firstNameNew);
                cy.get('input[id="lastName"]').type(lastNameNew);

                cy.contains('button', 'Save changes').click();
                cy.wait('@updateFirstLastName');
            });
        });

        context('Security tab', () => {
            before(() => {
                cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');
                openSecurityTab();
                cy.get('@getToken').its('response.body.results').should('be.empty');
            });
            describe.skip(`Testing "Case ${caseId}"`, () => {
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
                    openSecurityTab();
                });

                it('Change password unsuccessful, error notif appears. Cancel button works', () => {
                    changePassword(incorrectCurrentPassword, secondNewPassword);
                    cy.get('.cvat-notification-notice-change-password-failed').should('exist');
                    cy.closeNotification('.cvat-notification-notice-change-password-failed');
                    cy.contains('button', 'Cancel').should('exist').and('be.visible').click();
                    cy.contains('button', 'Change password').should('exist').and('be.visible');
                });
            });

            describe('Token manipulation', () => {
                const aYearFrom = (date) => new Date(
                    new Date(date.getTime())
                        .setFullYear(date.getFullYear() + 1),
                );
                const aMonthFrom = (date) => new Date(
                    new Date(date.getTime())
                        .setMonth((date.getMonth() + 1) % 12),
                );

                /** @param {Date} date */
                function format(date) {
                    // converts Date object to DD/MM/YYYY
                    const [yyyy, mm, dd] = [
                        date.getFullYear(),
                        date.getMonth() + 1,
                        date.getDate(),
                    ].map((n) => String(n).padStart(2, '0'));
                    return `${dd}/${mm}/${yyyy}`;
                }
                const parseDatetime = (s) => new Date(Date.parse(s));

                // Token defaults
                // TODO: use mock clocks to avoid ironic date bugs
                const todayDate = new Date();
                const nextMonthDate = aMonthFrom(todayDate);
                const nextYearDate = aYearFrom(todayDate);
                const defaultToken = {
                    Name: 'New token',
                    Expires: format(nextYearDate),
                    Created: format(todayDate),
                    Permissions: 'Read/Write',
                    LastUsed: 'Never',
                };

                // Clipboard context
                const clipboard = new ClipboardCtx('.cvat-api-token-copy-button');

                beforeEach(() => {
                    clipboard.init();
                    // gets reset every test:
                    // https://docs.cypress.io/app/core-concepts/variables-and-aliases
                });
                it('Token related UI is visible, no tokens are present', () => {
                    cy.get('.cvat-security-api-tokens-card').should('exist').and('be.visible');
                    cy.get('.cvat-api-tokens-table').should('exist').and('be.visible').within(() => {
                        cy.contains('No data').should('exist').and('be.visible');
                    });
                });

                it.skip('Add a token. It is sent to backend. Modal appears, token can be copied', () => {
                    cy.intercept('POST', '/api/auth/access_tokens**').as('postToken');
                    cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');

                    cy.get('.cvat-create-api-token-button').should('exist').and('be.visible').click();
                    cy.contains('.cvat-api-token-form', 'Create API Token').should('be.visible').within(() => {
                        cy.get('.cvat-api-token-form-name').should('exist').and('be.visible');
                        cy.get('.cvat-api-token-form-expiration-date').should('exist').and('be.visible');
                        cy.get('.cvat-api-token-form-submit').should('exist').and('be.visible').click();
                        cy.get('.ant-checkbox-checked').should('not.exist'); // read-only by default
                    });

                    // Correct token is sent, the modal shows it for the user to save
                    cy.wait('@postToken').then(({
                        response: {
                            statusCode,
                            statusMessage,
                            body: { value },
                        },
                    }) => {
                        const token = value;
                        expect(statusCode).to.equal(201, statusMessage);
                        cy.get('.cvat-api-token-created-modal').should('exist').and('be.visible').within(() => {
                            cy.get('.cvat-api-token-copy-button').should('exist').and('be.visible');
                            clipboard.copy().should('equal', token);
                            cy.contains(
                                '.cvat-api-token-created-modal-confirm-saved-button',
                                'I have securely saved my token',
                            ).should('exist').and('be.visible')
                                .click();
                            cy.get('.cvat-api-token-created-modal').should('not.exist');
                        });
                    });

                    // Get request is successful and updates the table view
                    cy.wait('@getToken').then(({
                        response: {
                            statusCode,
                            statusMessage,
                        },
                    }) => {
                        expect(statusCode).to.equal(200, statusMessage);
                        checkTokenTableView(defaultToken);
                    });
                });

                it('Create and update a token, update is handled correctly', () => {
                    const tokenAfterUpdate = {
                        Name: tokenName2,
                        Permissions: 'Read Only',
                        Created: defaultToken.Created,
                        Expires: format(nextMonthDate),
                        LastUsed: defaultToken.LastUsed,
                    };

                    // Create new test token
                    cy.get('.cvat-create-api-token-button').click();
                    cy.contains('.cvat-api-token-form', 'Create API Token').within(() => {
                        cy.get('.cvat-api-token-form-name').find('.ant-input-clear-icon[role="button"]').click();
                        cy.get('.cvat-api-token-form-name').find('input').type(tokenName1);
                        cy.get('.cvat-api-token-form-submit').click();
                    });
                    cy.get('.cvat-api-token-created-modal-confirm-saved-button').should('be.visible').click();

                    // Edit the token
                    cy.intercept('PATCH', '/api/auth/access_tokens/**').as('patchToken');
                    cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');
                    cy.get('.cvat-api-token-action-menu').should('exist').and('be.visible').click();
                    tokenAction('Edit');
                    cy.contains('.cvat-api-token-form', 'Edit API Token').should('be.visible').within(() => {
                        cy.get('.cvat-api-token-form-name').find('input').clear();
                        cy.get('.cvat-api-token-form-name').find('input').type(tokenAfterUpdate.Name);
                        cy.get('.cvat-api-token-form-expiration-date')
                            .find('.anticon-close-circle') // cy.clearing doesn't work
                            .click();
                        cy.get('.cvat-api-token-form-expiration-date')
                            .find('input')
                            .type(`${tokenAfterUpdate.Expires}{enter}`);
                        cy.get('.ant-picker-date-panel')
                            .should('not.exist'); // correct date should discard the calendar
                        cy.get('.cvat-api-token-form-read-only').find('input').click();
                        cy.get('.ant-checkbox-checked').should('exist');
                        cy.contains('button', 'Update').click();
                    });
                    cy.wait('@patchToken').then(({ request: { body } }) => {
                        expect(body.name).to.equal(tokenAfterUpdate.Name);
                        expect(format(parseDatetime(body.expiry_date))).to.equal(tokenAfterUpdate.Expires);
                        expect(body.read_only).to.equal(
                            tokenAfterUpdate.Permissions === 'Read Only',
                        );
                    });
                    cy.wait('@getToken');
                    checkTokenTableView(tokenAfterUpdate);
                });

                it.skip('Token can be used with REST API, its "Last Used" is updated', () => {
                    // TODO: use cy.clock to travel in time
                });
            });
        });

        // eslint-disable-next-line max-len
        // TODO: check tokens' state by sending http requests with headers (with cy.request)
        // TODO: introduce linting errors to this file (there's suspicion that this folder is not covered by eslint)
        // if it doesn't work, goto Maxim
    });
});
