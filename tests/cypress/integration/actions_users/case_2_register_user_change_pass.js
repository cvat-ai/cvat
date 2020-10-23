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

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    describe(`Testing "Case ${caseId}"`, () => {
        it('Register user, change password', () => {
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            cy.url().should('include', '/tasks');
            cy.get('.cvat-right-header')
                .find('.cvat-header-menu-dropdown')
                .should('have.text', userName)
                .trigger('mouseover');
            cy.get('.anticon-edit').click();
            cy.get('.ant-modal-body').within(() => {
                cy.get('#oldPassword').type(password);
                cy.get('#newPassword1').type(newPassword);
                cy.get('#newPassword2').type(newPassword);
                cy.get('.change-password-form-button').click();
            });
            cy.contains('New password has been saved.').should('exist');
        });
        it('Logout', () => {
            cy.logout(userName);
            cy.url().should('include', '/auth/login');
        });
        it('Login with the new password', () => {
            cy.login(userName, newPassword);
            cy.url().should('include', '/tasks');
        });
    });
});
