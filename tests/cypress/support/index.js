// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

require('./commands');
require('@cypress/code-coverage/support');

before(() => {
    if (Cypress.browser.name === 'firefox') {
        cy.visit('/');
        cy.get('.ant-modal-body').within(() => {
            cy.get('.ant-modal-confirm-title').should('contain', 'Unsupported platform detected');
            cy.get('.ant-modal-confirm-btns').contains('OK').click();
        });
    }
});
