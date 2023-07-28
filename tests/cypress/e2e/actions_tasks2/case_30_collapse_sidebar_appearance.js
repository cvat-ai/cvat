// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    function checkEqualBackground() {
        cy.get('.cvat-canvas-grid-root')
            .then((el) => {
                expect(el[0].getBoundingClientRect().left)
                    .to.be.eq(defaultValueLeftBackground);
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);

        // get default left value from background
        cy.get('.cvat-canvas-grid-root')
            .then((el) => {
                defaultValueLeftBackground = el[0].getBoundingClientRect().left;
            });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Collapse sidebar. Cheeck issue 3250.', () => {
            // hide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('not.be.visible');

            // unhide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('be.visible');
            checkEqualBackground();

            // Before the issue fix the sidebar item did not appear accordingly
            // it was not possible to activate the shape through the sidebar item
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
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
