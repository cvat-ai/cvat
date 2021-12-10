// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings. "Smooth image" option.', () => {
    const caseId = '110';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check "Smooth image" option.', () => {
            cy.get('#cvat_canvas_background').should('not.have.class', 'cvat_canvas_pixelized');
            cy.openSettings();
            cy.get('.cvat-player-settings-smooth-image-checkbox')
                .find('[type="checkbox"]')
                .should('be.checked')
                .click()
                .should('not.be.checked');
            cy.get('#cvat_canvas_background').should('have.class', 'cvat_canvas_pixelized');
        });
    });
});
