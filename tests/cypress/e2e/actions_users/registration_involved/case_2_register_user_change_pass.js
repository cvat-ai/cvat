// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { toSnakeCase } from '../../../support/utils';

context('Register user, change password, login with new password', () => {
    function changePassword(myPassword, myNewPassword) {
        cy.get('.cvat-profile-page-navigation-menu')
            .should('exist')
            .and('be.visible')
            .find('[role="menuitem"]')
            .filter(':contains("Security")')
            .click();
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
        cy.headlessDeleteSelf();
        cy.headlessLogout();
    });

    context('User page', () => {
        describe('Profile', () => {
            it("Open user's profile page. Profile is selected, username is greeted", () => {
                cy.openProfile();
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
                        assert(Cypress._.isEqual(res.body, resFields));
                    });
                }).as('updateFirstLastName');

                cy.get('input[id="firstName"]').type(firstNameNew);
                cy.get('input[id="lastName"]').type(lastNameNew);

                cy.contains('button', 'Save changes').click();
                cy.wait('@updateFirstLastName');
            });
        });
        describe(`Testing "Case ${caseId}"`, () => {
            it('Register user, change password', () => {
                changePassword(password, newPassword);
                cy.contains('New password has been saved.').should('exist');
                cy.logout();

                cy.login(username, newPassword);

                changePassword(incorrectCurrentPassword, secondNewPassword);
                cy.get('.cvat-notification-notice-change-password-failed').should('exist');
                cy.closeNotification('.cvat-notification-notice-change-password-failed');
            });
        });
    });
});
