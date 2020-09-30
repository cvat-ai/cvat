/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Register user, change password, login with new password', () => {
    const caseId = '2'
    const firstName = 'First name'
    const lastName = 'Last name'
    const userName = 'Username'
    const emailAddr = `${userName}@local.local`
    const password = 'UfdU21!dds'
    const newPassword = 'dKl3j49sd@jjk'

    before(() => {
        cy.visit('auth/register')
        cy.url().should('include', '/auth/register')
    })

    describe(`Testing "Case ${caseId}"`, () => {
        it('Register user, change password', () => {
            cy.userRegistration(firstName, lastName, userName, emailAddr, password)
            cy.url().should('include', '/tasks')
            cy.get('.cvat-right-header')
            .find('.cvat-header-menu-dropdown')
            .should('have.text', userName)
            .trigger('mouseover')
            cy.get('.anticon-edit')
            .click()
            cy.get('.ant-modal-body').within(() => {
                cy.get('#oldPassword').type(password)
                cy.get('#newPassword1').type(newPassword)
                cy.get('#newPassword2').type(newPassword)
                cy.get('.change-password-form-button').click()
            })
            cy.contains('New password has been saved.')
            .should('exist')
        })
        it('Logout', () => {
            cy.logout(userName)
            cy.url().should('include', '/auth/login')
        })
        it('Login with the new password', () => {
            cy.login(userName, newPassword)
            cy.url().should('include', '/tasks')
        })
    })
})
