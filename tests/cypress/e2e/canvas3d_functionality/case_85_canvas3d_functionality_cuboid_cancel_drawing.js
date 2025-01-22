// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Cancel drawing.', () => {
    const caseId = '85';
    const screenshotsPath =
        'cypress/screenshots/canvas3d_functionality/case_85_canvas3d_functionality_cuboid_cancel_drawing.js';

    before(() => {
        cy.openTask(taskName);
        cy.openJob();

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000); // Waiting for the point cloud to display
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Cancel drawing.', () => {
            cy.interactControlButton('draw-cuboid');
            cy.get('.cvat-draw-cuboid-popover').find('.ant-select-selection-item').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.contains(new RegExp(`^${labelName}$`)).click();
                });
            cy.get('.cvat-draw-cuboid-popover').contains('Shape').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_drawning');
            cy.get('body').type('{Esc}');
            cy.get('.cvat-active-canvas-control').should('exist');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_cancel_drawning');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_drawning.png`,
                `${screenshotsPath}/canvas3d_perspective_cancel_drawning.png`,
            );
        });

        it('Repeat draw.', () => {
            cy.get('body').type('n');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 450, 250);
            cy.get('.cvat-canvas3d-perspective').dblclick(450, 250);
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarStateItems) => {
                expect(sidebarStateItems.length).to.be.equal(1);
            });
        });
    });
});
