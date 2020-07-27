/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

describe('Check server availability', () => {
  it('Server web interface is available', () => {
    cy.visit('http://localhost:8080')
  })

  it('"/auth/login" contains in the URL', () => {
    cy.url().should('include', '/auth/login')
  })

  it('"Sign in" buttun is exists', () => {
    cy.get('[type="submit"]')
  })

  it('Check plaseholder "Username"', () => {
    cy.get('input').invoke('attr', 'placeholder').should('contain', 'Username')
  })

  it('Check plaseholder "Password"', () => {
    cy.get('[type="password"]')
  })

  it('Click to "Sign in" buttun', () => {
    cy.get('[type="submit"]').click()
  })
})
