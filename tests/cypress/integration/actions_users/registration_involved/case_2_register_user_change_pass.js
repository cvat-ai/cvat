// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Register user, change password, login with new password', () => {
    const caseId = '2';
    const firstName = 'SecuserfmCaseTwo';
    const lastName = 'SecuserlmCaseTwo';
    const userName = 'SecuserCase2';
    const emailAddr = `${userName}@local.local`;
    const password = 'GDrb41RguF!';
    const incorrectCurrentPassword = 'gDrb41RguF!';
    const newPassword = 'bYdOk8#eEd';
    const secondNewPassword = 'ndTh48@yVY';

    function changePassword(myUserName, myPassword, myNewPassword) {
        cy.get('.cvat-right-header')
            .find('.cvat-header-menu-user-dropdown')
            .should('have.text', myUserName)
            .trigger('mouseover');
        cy.get('.cvat-header-menu-change-password').click();
        cy.get('.cvat-modal-change-password').within(() => {
            cy.get('#oldPassword').type(myPassword);
            cy.get('#newPassword1').type(myNewPassword);
            cy.get('#newPassword2').type(myNewPassword);
            cy.get('.change-password-form-button').click();
        });
    }

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    after(() => {
        cy.get('.cvat-modal-change-password').find('[aria-label="Close"]').click();
        cy.logout(userName);
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [userName]);
        });
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
            changePassword(userName, incorrectCurrentPassword, secondNewPassword);
            cy.get('.cvat-notification-notice-change-password-failed').should('exist');
        });
    });
});
