// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Camera ray.', () => {
    const caseId = '94';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_94_canvas3d_functionality_camera_ray.js';
    const contextImage = '.cvat-context-image-wrapper';
    const contextImageOverlay = '.cvat-context-image-svg-overlay';
    const contextImageTitle = '.cvat-context-image-title';
    const cameraRayMarker = '.cvat-context-image-camera-ray-marker';
    const clearCameraRaysButton = '.cvat-canvas3d-perspective-tools-group button';

    function getContextImage(index) {
        return cy.get(contextImage).eq(index);
    }

    function getCameraRayMarkers(contextImageIndex) {
        return getContextImage(contextImageIndex).find(cameraRayMarker);
    }

    function addCameraRay(contextImageIndex, x, y) {
        getContextImage(contextImageIndex).find(contextImageOverlay).then(($overlay) => {
            const { width, height } = $overlay[0].getBoundingClientRect();
            cy.wrap($overlay).click(Math.round(width * x), Math.round(height * y));
        });
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.get('.cvat-player-first-button').click();
        cy.checkFrameNum(0);
        cy.get(contextImage).should('have.length', 2);
        cy.get(contextImageOverlay).should('have.length', 2).and('be.visible');
        cy.get(contextImageTitle).eq(0).invoke('text').then((firstContextImageName) => {
            cy.get(contextImageTitle).eq(1).invoke('text').should('not.equal', firstContextImageName);
        });
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_without_camera_rays');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Creates and removes camera rays from two context images.', () => {
            addCameraRay(0, 0.25, 0.25);
            getCameraRayMarkers(0).should('have.length', 1);
            getCameraRayMarkers(1).should('not.exist');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_with_one_camera_ray');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_without_camera_rays.png`,
                `${screenshotsPath}/canvas3d_perspective_with_one_camera_ray.png`,
            );

            addCameraRay(1, 0.75, 0.75);
            getCameraRayMarkers(1).should('have.length', 1);
            cy.contains(clearCameraRaysButton, 'Clear 2 rays').should('be.visible');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_with_two_camera_rays');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_with_one_camera_ray.png`,
                `${screenshotsPath}/canvas3d_perspective_with_two_camera_rays.png`,
            );

            getCameraRayMarkers(0).click();
            getCameraRayMarkers(0).should('not.exist');
            getCameraRayMarkers(1).should('have.length', 1);
            cy.contains(clearCameraRaysButton, 'Clear 1 ray').should('be.visible');

            addCameraRay(1, 0.25, 0.25);
            getCameraRayMarkers(1).should('have.length', 2).first().click({ shiftKey: true });
            getCameraRayMarkers(1).should('not.exist');
            cy.get(clearCameraRaysButton).should('not.exist');

            addCameraRay(0, 0.5, 0.5);
            addCameraRay(1, 0.5, 0.5);
            cy.contains(clearCameraRaysButton, 'Clear 2 rays').click();
            getCameraRayMarkers(0).should('not.exist');
            getCameraRayMarkers(1).should('not.exist');
            cy.get(clearCameraRaysButton).should('not.exist');

            cy.get('.cvat-player-next-button').click();
            cy.checkFrameNum(1);
            getContextImage(0).find(contextImageOverlay).should('be.visible');

            addCameraRay(0, 0.5, 0.5);
            cy.contains('.ant-notification-notice-message', 'Camera calibration is unavailable').should('be.visible');
            cy.get(cameraRayMarker).should('not.exist');
            cy.get(clearCameraRaysButton).should('not.exist');
        });
    });
});
