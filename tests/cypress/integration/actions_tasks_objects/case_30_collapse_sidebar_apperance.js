// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Collapse sidebar/apperance', () => {
    const caseId = '30';
    let defaultValueLeftInBackground;
    let currnetValueLeftBackground;

    function checkEqualBackground() {
        cy.get('#cvat_canvas_background')
            .should('have.css', 'left')
            .and((valueLeft) => {
                currnetValueLeftBackground = Number(valueLeft.match(/\d+/));
                expect(currnetValueLeftBackground).to.be.eq(defaultValueLeftInBackground);
            });
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Get default value left in background', () => {
            cy.get('#cvat_canvas_background')
                .should('have.css', 'left')
                .then((valueLeft) => {
                    defaultValueLeftInBackground = Number(valueLeft.match(/\d+/));
                });
        });

        it('Collapse sidebar', () => {
            // hide
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('not.be.visible');
            cy.get('#cvat_canvas_background')
                .should('have.css', 'left')
                .and((valueLeft) => {
                    currnetValueLeftBackground = Number(valueLeft.match(/\d+/));
                    expect(currnetValueLeftBackground).to.be.greaterThan(defaultValueLeftInBackground);
                });

            // wait when background will move to full window
            cy.wait(1000);

            // unhide
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('be.visible');
            checkEqualBackground();
        });

        it('Collapse apperance', () => {
            // hide
            cy.get('.cvat-objects-appearance-collapse').within(() => {
                cy.contains('Appearance').click();
            });
            cy.get('.cvat-objects-appearance-content').should('not.be.visible');
            checkEqualBackground();

            // unhide
            cy.get('.cvat-objects-appearance-collapse').within(() => {
                cy.contains('Appearance').click();
            });
            cy.get('.cvat-objects-appearance-content').should('be.visible');
            checkEqualBackground();
        });
    });
});
