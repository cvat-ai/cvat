// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { toSnakeCase } from '../../../support/utils';
import { ClipboardCtx } from '../../../support/const';

context('User page, password change, token handling', () => { // TODO: rename this context
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
                // Token defaults
                const defaultName = 'New token';
                const todayDate = new Date();
                const defaultExpiresDate = new Date(
                    new Date(todayDate.getTime())
                        .setFullYear(todayDate.getFullYear() + 1),
                );
                const defaultCreated = todayDate.toLocaleDateString();
                const defaultExpires = defaultExpiresDate.toLocaleDateString();
                const defaultPermissions = 'Read/Write';
                const defaultLastUsed = 'Never';

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

                it('Add a token. It is sent to backend. Modal appears, token can be copied', () => {
                    cy.intercept('POST', '/api/auth/access_tokens**').as('postToken');
                    cy.intercept('GET', '/api/auth/access_tokens**').as('getToken');

                    cy.get('.cvat-create-api-token-button').should('exist').and('be.visible').click();
                    cy.get('.cvat-api-token-form-name').should('exist').and('be.visible');
                    cy.get('.cvat-api-token-form-expiration-date').should('exist').and('be.visible');
                    cy.get('.cvat-api-token-form-submit').should('exist').and('be.visible').click();

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
                            cy.contains('I have securely saved my token')
                                .should('exist').and('be.visible')
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
                        const Name = defaultName;
                        const Permissions = defaultPermissions;
                        const Created = defaultCreated;
                        const Expires = defaultExpires;
                        const LastUsed = defaultLastUsed;
                        const expectedRowValues = Object.entries({
                            Name,
                            Permissions,
                            Created,
                            Expires,
                            LastUsed,
                        });

                        // Check all table data
                        cy.get('.cvat-api-tokens-table').find('td').not(':has(button)').each(($item, index) => {
                            expect($item.text()).to.equal(expectedRowValues[index][1], $item.text());
                            // FIXME: table might be subject to change
                            // a more robust solution would include data-* attributes
                        });
                    });
                });
            });
        });
    });

        // eslint-disable-next-line max-len
        // TODO: check tokens' state by sending http requests with headers (with cy.request)
        // TODO: introduce linting errors to this file (there's suspicion that this folder is not covered by eslint)
        // if it doesn't work, goto Maxim
    });
});
