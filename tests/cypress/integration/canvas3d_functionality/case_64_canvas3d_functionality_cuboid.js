// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Add cuboid.', () => {
    const caseId = '64';

    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_64_canvas3d_functionality_cuboid.js';

    before(() => {
        cy.openTaskJob(taskName);
        // Prepare screenshots to compare
        cy.get('.cvat-canvas3d-perspective').screenshot('canvas3d_perspective_before_all');
        ['topview', 'sideview', 'frontview'].forEach((view) => {
            cy.get(`.cvat-canvas3d-${view}`).find('.cvat-canvas3d-fullsize').screenshot(`canvas3d_${view}_before_all`);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Add cuboid.', () => {
            cy.get('.cvat-draw-cuboid-control').trigger('mouseover');
            cy.get('.cvat-draw-shape-popover').find('button').click();
            cy.get('.cvat-canvas3d-perspective').dblclick();
            cy.wait(1000);
            cy.get('.cvat-canvas3d-perspective').screenshot('canvas3d_perspective_after_add_cuboid'); // The cuboid displayed
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_before_all.png`,
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.get(`.cvat-canvas3d-${view}`)
                    .find('.cvat-canvas3d-fullsize')
                    .screenshot(`canvas3d_${view}_add_cuboid`);
            });
            [
                ['canvas3d_topview_before_all.png', 'canvas3d_topview_add_cuboid.png'],
                ['canvas3d_sideview_before_all.png', 'canvas3d_sideview_add_cuboid.png'],
                ['canvas3d_frontview_before_all.png', 'canvas3d_frontview_add_cuboid.png'],
            ].forEach(([viewBefore, viewAfterAddCuboid]) => {
                cy.compareImagesAndCheckResult(`${screenshotsPath}/${viewBefore}`, `${screenshotsPath}/${viewAfterAddCuboid}`);
            });
        });

        it('Cuboid interaction by mouse.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200); // Interacting with the canvas before interacting with the cuboid.
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove'); // Move cursor to cuboid
            cy.wait(1000); // Waiting for the reaction of the cuboid to interact with the mouse cursor
            cy.get('.cvat-canvas3d-perspective').screenshot('canvas3d_perspective_after_cursor_movements_to_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_after_cursor_movements_to_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.get(`.cvat-canvas3d-${view}`)
                    .find('.cvat-canvas3d-fullsize')
                    .screenshot(`canvas3d_${view}_move_cursor_to_cuboid`);
            });
            [
                ['canvas3d_topview_add_cuboid.png', 'canvas3d_topview_move_cursor_to_cuboid.png'],
                ['canvas3d_sideview_add_cuboid.png', 'canvas3d_sideview_move_cursor_to_cuboid.png'],
                ['canvas3d_frontview_add_cuboid.png', 'canvas3d_frontview_move_cursor_to_cuboid.png'],
            ].forEach(([viewAfterAddCuboid, viewAfterMoveCursorToCuboid]) => {
                cy.compareImagesAndCheckResult(`${screenshotsPath}/${viewAfterAddCuboid}`, `${screenshotsPath}/${viewAfterMoveCursorToCuboid}`);
            });
        });
    });
});
