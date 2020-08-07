/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

require('cypress-file-upload')
require('../plugins/imageGenerator/imageGeneratorCommand')

Cypress.Commands.add('login', (username='admin', password='12qwaszx') => {
    cy.get('[placeholder="Username"]').type(username)
    cy.get('[placeholder="Password"]').type(password)
})
