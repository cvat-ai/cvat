// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Make a copy.', () => {
    const caseId = '81';

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.get('.cvat-draw-cuboid-control').trigger('mouseover');
        cy.get('.cvat-draw-cuboid-popover-visible').find('[type="search"]').click({force: true});
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').find(`[title="${labelName}"]`).click();
        cy.get('.cvat-draw-cuboid-popover-visible').find('button').click();
        cy.get('.cvat-canvas3d-perspective').dblclick();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Cuboid propagate.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('[aria-label="more"]')
                .click();
            cy.get('.ant-dropdown-menu').not('.ant-dropdown-menu-hidden').find('[aria-label="block"]').click();
            cy.get('.cvat-propagate-confirm-object-on-frames').should('exist');
            cy.contains('button', 'Yes').click();
        });

        it('On a other frames the cuboid should exist.', () => {
            cy.get('.cvat-player-next-button').click();
            cy.get('#cvat-objects-sidebar-state-item-2').should('exist');
            cy.get('.cvat-player-next-button').click();
            cy.get('#cvat-objects-sidebar-state-item-3').should('exist');
        });
    });
});
