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
        });

        it('Top/side/front views should be changed afer dblclick on the cuboid on perspective view because of the drawing of the cuboid.', () => {
            // On the top/side/front view the cuboid should change a color also.
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.get(`.cvat-canvas3d-${view}`)
                    .find('.cvat-canvas3d-fullsize')
                    .screenshot(`canvas3d_${view}_add_cuboid`);
            });
            [
                ['canvas3d_topview_before_all.png', 'canvas3d_topview_add_cuboid.png'],
                ['canvas3d_sideview_before_all.png', 'canvas3d_sideview_add_cuboid.png'],
                ['canvas3d_frontview_before_all.png', 'canvas3d_frontview_add_cuboid.png'],
            ].forEach(([viewBefore, viewAfter]) => {
                cy.compareImagesAndCheckResult(`${screenshotsPath}/${viewBefore}`, `${screenshotsPath}/${viewAfter}`);
            });
        });
    });
});
