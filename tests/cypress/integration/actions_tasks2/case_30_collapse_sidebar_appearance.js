// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Collapse sidebar/appearance. Check issue 3250 (empty sidebar after resizing window).', () => {
    const caseId = '30';
    let defaultValueLeftBackground;

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    function checkEqualBackground() {
        cy.get('#cvat_canvas_background')
            .should('have.css', 'left')
            .and((currentValueLeftBackground) => {
                currentValueLeftBackground = Number(currentValueLeftBackground.match(/\d+/));
                expect(currentValueLeftBackground).to.be.eq(defaultValueLeftBackground);
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);

        // get default left value from background
        cy.get('#cvat_canvas_background')
            .should('have.css', 'left')
            .then((currentValueLeftBackground) => {
                defaultValueLeftBackground = Number(currentValueLeftBackground.match(/\d+/));
            });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Collapse sidebar. Cheeck issue 3250.', () => {
            // hide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('not.be.visible');
            cy.get('#cvat_canvas_background')
                .should('have.css', 'left')
                .and((currentValueLeftBackground) => {
                    currentValueLeftBackground = Number(currentValueLeftBackground.match(/\d+/));
                    expect(currentValueLeftBackground).to.be.greaterThan(defaultValueLeftBackground);
                });

            // Check issue 3250
            cy.get('#cvat_canvas_content').invoke('attr', 'style').then((canvasContainerStyle) => {
                cy.viewport(2999, 2999); // Resize window
                cy.get('#cvat_canvas_content').should('have.attr', 'style').and('not.equal', canvasContainerStyle);
                cy.viewport(Cypress.config('viewportWidth'), Cypress.config('viewportHeight')); // Return to the original size
                cy.get('#cvat_canvas_content').should('have.attr', 'style').and('equal', canvasContainerStyle);
            });

            // unhide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('be.visible');
            checkEqualBackground();

            // Before the issue fix the sidebar item did not appear accordingly it was not possible to activate the shape through the sidebar item
            cy.get(`#cvat-objects-sidebar-state-item-1`).trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });

        it('Collapse appearance', () => {
            // hide
            cy.get('.cvat-objects-appearance-collapse-header').click();
            cy.get('.cvat-objects-appearance-content').should('not.be.visible');
            checkEqualBackground();

            // unhide
            cy.get('.cvat-objects-appearance-collapse-header').click();
            cy.get('.cvat-objects-appearance-content').should('be.visible');
            checkEqualBackground();
        });
    });
});
