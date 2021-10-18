// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. "Move the image" button interaction.', () => {
    const caseId = '86';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_86_canvas3d_functionality_move_image_button.js';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_add_cuboid');
        ['topview', 'sideview', 'frontview'].forEach((view) => {
            cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_after_add_cuboid`);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Click to "Move the image" button. The cuboid on the top/side/front view should be hidden.', () => {
            cy.get('.cvat-move-control').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200); // Interacting with the canvas before interacting with the cuboid.
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.have.class', 'cvat-objects-sidebar-state-active-item');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_move_the_image_clicked');
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_move_the_image_clicked`);
            });
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_move_the_image_clicked.png`,
            );
            [
                ['canvas3d_topview_after_add_cuboid.png', 'canvas3d_topview_move_the_image_clicked.png'],
                ['canvas3d_sideview_after_add_cuboid.png', 'canvas3d_sideview_move_the_image_clicked.png'],
                ['canvas3d_frontview_after_add_cuboid.png', 'canvas3d_frontview_move_the_image_clicked.png'],
            ].forEach(([viewAfterAddCuboid, viewMoveTheImageClicked]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterAddCuboid}`,
                    `${screenshotsPath}/${viewMoveTheImageClicked}`,
                );
            });
        });

        it('Cancel "Move the image" activity. "Cursor" button should be active.', () => {
            cy.get('body').type('{Esc}');
            cy.get('.cvat-active-canvas-control').should('exist');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200); // Interacting with the canvas before interacting with the cuboid.
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
        });
    });
});
