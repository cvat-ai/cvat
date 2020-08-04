/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Issue 1599 (Polish alphabet).', () => {
  before(() => {
      cy.visit('auth/register')
      cy.url().should('include', '/auth/register')
  })

  describe('User registration using the Polish alphabet.', () => {
      it('Filling in the plaseholder "First name"', () => {
        cy.get('[placeholder="First name"]').type('Świętobor')
        cy.contains('Please specify a first name').should('not.exist')
      })

      it('Filling in the plaseholder "Last name"', () => {
            cy.get('[placeholder="Last name"]').type('Сzcić')
            cy.contains('Please specify a last name').should('not.exist')
      })

      it('Filling in the plaseholder "Username"', () => {
            cy.get('[placeholder="Username"]').type('Testuser_pl')
      })

      it('Filling in the plaseholder "Email address"', () => {
            cy.get('[placeholder="Email address"]').type('Testuser_pl@local.local')
      })

      it('Filling in the plaseholder "Password"', () => {
            cy.get('[placeholder="Password"]').type('Qwerty123!')
      })

      it('Filling in the plaseholder "Confirm password"', () => {
            cy.get('[placeholder="Confirm password"]').type('Qwerty123!')
      })

      it('Click to "Submit" button', () => {
            cy.get('[type="submit"]').click()
      })

      it('Successful registration', () => {
            cy.url().should('include', 'task')
      })
  })
})
