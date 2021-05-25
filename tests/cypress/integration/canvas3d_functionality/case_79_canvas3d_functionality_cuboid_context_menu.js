// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Cuboid context menu.', () => {
    const caseId = '79';

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
        it('Right click on the cuboid. Context menu should exist.', () => {
            cy.get('.cvat-canvas3d-perspective').rightclick();
            cy.get('.cvat-canvas-context-menu').should('exist');
        });

        it('Right click outside the cuboid. Context menu should not exist.', () => {
            cy.get('.cvat-canvas3d-perspective').click(100, 100);
            cy.get('.cvat-canvas-context-menu').should('not.exist');
        });
    });
});
