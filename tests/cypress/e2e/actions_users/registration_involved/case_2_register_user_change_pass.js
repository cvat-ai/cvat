// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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

    function changePassword(myPassword, myNewPassword) {
        cy.openProfile();
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

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [userName]);
        });
    });

    describe(`Testing "Case ${caseId}"`, () => {
        it('Register user, change password', () => {
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            changePassword(password, newPassword);
            cy.contains('New password has been saved.').should('exist');
            cy.logout();

            cy.login(userName, newPassword);

            changePassword(incorrectCurrentPassword, secondNewPassword);
            cy.get('.cvat-notification-notice-change-password-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-change-password-failed');
        });
    });
});
