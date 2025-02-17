// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Add cuboid.', () => {
    const caseId = '64';

    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality_2/case_64_canvas3d_functionality_cuboid.js';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.openTaskJob(taskName);
        // Prepare screenshots to compare
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_before_all');
        ['topview', 'sideview', 'frontview'].forEach((view) => {
            cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_before_all`);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Add cuboid.', () => {
            cy.create3DCuboid(cuboidCreationParams);
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
            cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_add_cuboid'); // The cuboid displayed
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_before_all.png`,
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_add_cuboid`);
            });
            [
                ['canvas3d_topview_before_all.png', 'canvas3d_topview_add_cuboid.png'],
                ['canvas3d_sideview_before_all.png', 'canvas3d_sideview_add_cuboid.png'],
                ['canvas3d_frontview_before_all.png', 'canvas3d_frontview_add_cuboid.png'],
            ].forEach(([viewBefore, viewAfterAddCuboid]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewBefore}`,
                    `${screenshotsPath}/${viewAfterAddCuboid}`,
                );
            });
        });

        it('Cuboid interaction by mouse.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200);
            cy.get('.cvat-canvas3d-perspective').click(300, 200); // Deactivate the cuboid
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_deactivate_cuboid');
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_deactivate_cuboid`);
            });
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200); // Interacting with the canvas before interacting with the cuboid.
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove'); // Move cursor to cuboid
            cy.wait(1000); // Waiting for the reaction of the cuboid to interact with the mouse cursor
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_cursor_movements_to_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_deactivate_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_after_cursor_movements_to_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_move_cursor_to_cuboid`);
            });
            [
                ['canvas3d_topview_deactivate_cuboid.png', 'canvas3d_topview_move_cursor_to_cuboid.png'],
                ['canvas3d_sideview_deactivate_cuboid.png', 'canvas3d_sideview_move_cursor_to_cuboid.png'],
                ['canvas3d_frontview_deactivate_cuboid.png', 'canvas3d_frontview_move_cursor_to_cuboid.png'],
            ].forEach(([viewAfterAddCuboid, viewAfterMoveCursorToCuboid]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterAddCuboid}`,
                    `${screenshotsPath}/${viewAfterMoveCursorToCuboid}`,
                );
            });
        });
    });
});
