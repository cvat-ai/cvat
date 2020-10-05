/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

import './commands'

before(() => {
    if (Cypress.browser.name === 'firefox') {
        cy.visit('/')
        cy.get('.ant-modal-body').within(() => {
            cy.get('.ant-modal-confirm-title')
            .should('contain', 'Unsupported platform detected')
            cy.get('.ant-modal-confirm-btns')
            .contains('OK')
            .click()
        })
    }
})

afterEach(() => {
    if (Cypress.browser.name === 'chrome') {
        cy.window().then(win => {
            if (win.__coverage__) {
                cy.task('combineCoverage', win.__coverage__)
            }
        })
    }
})

after(() => {
    if (Cypress.browser.name === 'chrome') {
        cy.task('coverageReportPrepare')
    }
})
