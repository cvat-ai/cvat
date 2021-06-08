// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../../support/const';

// cypress-real-events API works only in Chrome browser
context('Collapse sidebar. Fullscreen', { browser: '!firefox' }, () => {
    const caseId = '97';

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.saveJob('PATCH', 200, 'saveJobCreatedRectangle');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Collapse sidebar and activate fullscreen. "objects-sidebar-state-item" should be visible.', () => {
            cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');
            cy.window().then(window => {
                // get iframe, set the allowfullscreen to true
                window.parent.document
                    .getElementsByClassName('aut-iframe')[0] // Cypress iframe class name
                    .setAttribute('allowFullScreen', 'true');
            });
            cy.reload();
            // make sure fullscreen is now enabled
            cy.document().its('fullscreenEnabled').should('be.true');

            // hide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('not.be.visible');


            cy.contains('.cvat-annotation-header-button', 'Fullscreen').realClick(); // Enable fullscreen
            cy.contains('.cvat-annotation-header-button', 'Fullscreen').realClick();  // Disable fullscreen

            // unhide sidebar
            cy.get('.cvat-objects-sidebar-sider').click();
            cy.get('.cvat-objects-sidebar').should('be.visible');

            // Before the fix the sidebar item did not appear accordingly it was not possible to activate the shape through the sidebar item
            cy.get(`#cvat-objects-sidebar-state-item-1`).trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });
    });
});
