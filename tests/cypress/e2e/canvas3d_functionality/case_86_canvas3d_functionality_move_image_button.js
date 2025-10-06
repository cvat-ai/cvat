// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable cypress/no-unnecessary-waiting */

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. "Move the image" button interaction.', () => {
    const caseId = '86';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_86_canvas3d_functionality_move_image_button.js';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.loginSetup();
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Click to "Move the image" button. The cuboid on the top/side/front view should be hidden.', () => {
            cy.get('.cvat-canvas3d-perspective canvas').trigger('mousemove', 340, 310);
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_add_cuboid');
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_after_add_cuboid`);
            });
            cy.get('.cvat-move-control').click();
            cy.get('.cvat-canvas3d-perspective canvas').trigger('mousedown', { button: 0 });
            cy.get('.cvat-canvas3d-perspective canvas').trigger('pointerdown', { buttons: 1 });
            cy.get('.cvat-canvas3d-perspective canvas').trigger('pointermove', { buttons: 1, clientX: 100, clientY: 100 }); // Interacting with the canvas before interacting with the cuboid.
            cy.get('.cvat-canvas3d-perspective canvas').trigger('pointerup', { buttons: 1 });
            cy.get('.cvat-canvas3d-perspective canvas').trigger('mouseup', { button: 0 });
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
            cy.get('.cvat-canvas3d-perspective canvas').trigger('mousemove', 346, 372); // Interacting with the canvas before interacting with the cuboid.
            cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
        });
    });
});
