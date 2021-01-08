// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const randomString = (isPassword) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i <= 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return isPassword ? `${result}${Math.floor(Math.random() * 10)}` : result;
};

context('Register user, change password, login with new password', () => {
    const caseId = '2';
    const firstName = `${randomString()}`;
    const lastName = `${randomString()}`;
    const userName = `${randomString()}`;
    const emailAddr = `${userName}@local.local`;
    const password = `${randomString(true)}`;
    const newPassword = `${randomString(true)}`;

    function changePassword(userName, password, newPassword) {
        cy.get('.cvat-right-header')
            .find('.cvat-header-menu-dropdown')
            .should('have.text', userName)
            .trigger('mouseover');
        cy.get('.cvat-header-menu-change-password').click();
        cy.get('.cvat-modal-change-password').within(() => {
            cy.get('#oldPassword').type(password);
            cy.get('#newPassword1').type(newPassword);
            cy.get('#newPassword2').type(newPassword);
            cy.get('.change-password-form-button').click();
        });
    }

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    describe(`Testing "Case ${caseId}"`, () => {
        it('Register user, change password', () => {
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            changePassword(userName, password, newPassword);
            cy.contains('New password has been saved.').should('exist');
        });
        it('Logout', () => {
            cy.logout(userName);
        });
        it('Login with the new password', () => {
            cy.closeModalUnsupportedPlatform();
            cy.login(userName, newPassword);
        });
        it('Change password with incorrect current password', () => {
            changePassword(userName, `${randomString(true)}`, newPassword);
            cy.get('.cvat-notification-notice-change-password-failed').should('exist');
        });
    });
});
