// Copyright (C) 2021 Intel Corporation
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
            cy.get('.cvat-draw-cuboid-popover').find('button').click();
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

        // Temporarily disabling the test until it is fixed https://github.com/openvinotoolkit/cvat/issues/3438#issuecomment-892432089
        it.skip('Repeat draw.', () => {
            cy.get('body').type('n');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 450, 250).dblclick(450, 250);
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarStateItems) => {
                expect(sidebarStateItems.length).to.be.equal(1);
            });
        });
    });
});
