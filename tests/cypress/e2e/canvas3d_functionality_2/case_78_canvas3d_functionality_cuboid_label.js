// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Interaction with cuboid via sidebar.', () => {
    const caseId = '78';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality_2/case_78_canvas3d_functionality_cuboid_label.js';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };
    const secondLabel = 'car';
    const secondLabelAdditionalAttrs = false;
    const secondLabelColorRed = 'ff0000';

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel({ name: secondLabel, color: secondLabelColorRed }, secondLabelAdditionalAttrs);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_before_all');
        ['topview', 'sideview', 'frontview'].forEach((view) => {
            cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_before_all`);
        });
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Activate a cuboid on sidear.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
            cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
            cy.wait(1000); // Wating for cuboid activation
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_activating_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_before_all.png`,
                `${screenshotsPath}/canvas3d_perspective_after_activating_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_activating_cuboid`);
            });
            [
                ['canvas3d_topview_before_all.png', 'canvas3d_topview_activating_cuboid.png'],
                ['canvas3d_sideview_before_all.png', 'canvas3d_sideview_activating_cuboid.png'],
                ['canvas3d_frontview_before_all.png', 'canvas3d_frontview_activating_cuboid.png'],
            ].forEach(([viewBefore, viewAfterCubiodActivation]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewBefore}`,
                    `${screenshotsPath}/${viewAfterCubiodActivation}`,
                );
            });
        });

        it('Change a label via sidear.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .type(`${secondLabel}{Enter}`);
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_change_label_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_activating_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_after_change_label_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_change_label_cuboid`);
            });
            [
                ['canvas3d_topview_activating_cuboid.png', 'canvas3d_topview_change_label_cuboid.png'],
                ['canvas3d_sideview_activating_cuboid.png', 'canvas3d_sideview_change_label_cuboid.png'],
                ['canvas3d_frontview_activating_cuboid.png', 'canvas3d_frontview_change_label_cuboid.png'],
            ].forEach(([viewAfterCubiodActivation, viewAfterCubiodChangeLabel]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterCubiodActivation}`,
                    `${screenshotsPath}/${viewAfterCubiodChangeLabel}`,
                );
            });
        });

        it('Lock/unlock a cuboid via sidear. The control points of the cuboid on the top/side/front view are locked/unlocked.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-object-item-button-lock')
                .click({ force: true }); // Lock the cubiod
            cy.get('.cvat-object-item-button-lock-enabled').should('exist');
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_lock_cuboid`);
            });
            [
                ['canvas3d_topview_change_label_cuboid.png', 'canvas3d_topview_lock_cuboid.png'],
                ['canvas3d_sideview_change_label_cuboid.png', 'canvas3d_sideview_lock_cuboid.png'],
                ['canvas3d_frontview_change_label_cuboid.png', 'canvas3d_frontview_lock_cuboid.png'],
            ].forEach(([viewAfterCubiodChangeLabel, viewAfterCubiodLock]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterCubiodChangeLabel}`,
                    `${screenshotsPath}/${viewAfterCubiodLock}`,
                );
            });
            cy.get('.cvat-object-item-button-lock-enabled').click({ force: true }); // Unlock the cubiod
            cy.get('.cvat-object-item-button-lock').should('exist').trigger('mouseout');
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_unlock_cuboid`);
            });
            [
                ['canvas3d_topview_lock_cuboid.png', 'canvas3d_topview_unlock_cuboid.png'],
                ['canvas3d_sideview_lock_cuboid.png', 'canvas3d_sideview_unlock_cuboid.png'],
                ['canvas3d_frontview_lock_cuboid.png', 'canvas3d_frontview_unlock_cuboid.png'],
            ].forEach(([viewAfterCubiodLock, viewAfterCubiodUnlock]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterCubiodLock}`,
                    `${screenshotsPath}/${viewAfterCubiodUnlock}`,
                );
            });
        });

        it('Switch occluded property for a cuboid via sidear. The cuboid on the perpective view are occluded.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-object-item-button-occluded')
                .click({ force: true }); // Switch occluded property
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_enable_occlud_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_activating_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_enable_occlud_cuboid.png`,
            );
            cy.get('.cvat-object-item-button-occluded-enabled').click({ force: true }); // Switch occluded property again
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_disable_occlud_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_enable_occlud_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_disable_occlud_cuboid.png`,
            );
        });

        it('Hide/unhide a cuboid via sidear. The cuboid on the perpective/top/side/front view be hidden/unhidden.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-object-item-button-hidden')
                .click({ force: true }); // Hide the cuboid
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_hide_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_disable_occlud_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_hide_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_hide_cuboid`);
            });
            [
                ['canvas3d_topview_unlock_cuboid.png', 'canvas3d_topview_hide_cuboid.png'],
                ['canvas3d_sideview_unlock_cuboid.png', 'canvas3d_sideview_hide_cuboid.png'],
                ['canvas3d_frontview_unlock_cuboid.png', 'canvas3d_frontview_hide_cuboid.png'],
            ].forEach(([viewAfterCubiodUnlock, viewAfterCubiodHide]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterCubiodUnlock}`,
                    `${screenshotsPath}/${viewAfterCubiodHide}`,
                );
            });
            cy.get('.cvat-object-item-button-hidden-enabled').click({ force: true }); // Unhide the cuboid
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_unhide_cuboid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_hide_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_unhide_cuboid.png`,
            );
            ['topview', 'sideview', 'frontview'].forEach((view) => {
                cy.customScreenshot(`.cvat-canvas3d-${view}`, `canvas3d_${view}_unhide_cuboid`);
            });
            [
                ['canvas3d_topview_hide_cuboid.png', 'canvas3d_topview_unhide_cuboid.png'],
                ['canvas3d_sideview_hide_cuboid.png', 'canvas3d_sideview_unhide_cuboid.png'],
                ['canvas3d_frontview_hide_cuboid.png', 'canvas3d_frontview_unhide_cuboid.png'],
            ].forEach(([viewAfterCubiodHide, viewAfterCubiodUnhide]) => {
                cy.compareImagesAndCheckResult(
                    `${screenshotsPath}/${viewAfterCubiodHide}`,
                    `${screenshotsPath}/${viewAfterCubiodUnhide}`,
                );
            });
        });
    });
});
