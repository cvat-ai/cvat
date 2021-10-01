// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Opacity. Outlined borders.', () => {
    const caseId = '82';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality_2/case_82_canvas3d_functionality_cuboid_opacity_outlined_borders.js';
    const cuboidCreationParams = {
        labelName: labelName,
        x: 500,
        y: 250,
    };

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.get('.cvat-canvas3d-perspective').trigger('mousemove').click(); // Deactivate the cuboiud
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_deactivate_cuboid');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change opacity to 100. To 0.', () => {
            cy.get('.cvat-appearance-opacity-slider').click('right');
            cy.get('.cvat-appearance-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 100);
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_opacty_100');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_deactivate_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_opacty_100.png`,
            );
            cy.get('.cvat-appearance-opacity-slider').click('left');
            cy.get('.cvat-appearance-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 0);
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_opacty_0');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_opacty_100.png`,
                `${screenshotsPath}/canvas3d_perspective_opacty_0.png`,
            );
        });

        it('Change selected opacity to 100. To 0.', () => {
            cy.get('.cvat-appearance-selected-opacity-slider').click('right');
            cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 100);
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove').trigger('mousemove', 500, 250).wait(1000); // Waiting for the cuboid activation
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_selected_opacty_100');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_opacty_100.png`,
                `${screenshotsPath}/canvas3d_perspective_selected_opacty_100.png`,
                true, // No diff between the images
            );
            cy.get('.cvat-appearance-selected-opacity-slider').click('left');
            cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 0);
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_selected_opacty_0');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_opacty_0.png`,
                `${screenshotsPath}/canvas3d_perspective_selected_opacty_0.png`,
                true, // No diff between the images
            );
        });

        it('Enable/disable outlined borders.', () => {
            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').check().should('be.checked');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_enable_outlined_borders');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_enable_outlined_borders.png`,
                `${screenshotsPath}/canvas3d_perspective_selected_opacty_0.png`,
            );
            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').uncheck().should('not.be.checked');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_disable_outlined_borders');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_disable_outlined_borders.png`,
                `${screenshotsPath}/canvas3d_perspective_selected_opacty_0.png`,
                true, // No diff between the images
            );
        });
    });
});
