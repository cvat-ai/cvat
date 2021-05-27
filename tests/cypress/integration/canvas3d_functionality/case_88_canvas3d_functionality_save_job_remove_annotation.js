// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Save a job. Remove annotations.', () => {
    const caseId = '88';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_88_canvas3d_functionality_save_job_remove_annotation.js';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.get('.cvat-canvas3d-perspective > .cvat-canvas-container').screenshot('canvas3d_perspective_before_all');
        cy.create3DCuboid(cuboidCreationParams);
        cy.get('.cvat-canvas3d-perspective > .cvat-canvas-container').screenshot('canvas3d_perspective_after_add_cuboid');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save a job. Reopen the job.', () => {
            cy.saveJob('PATCH', 200, 'saveJob');
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.wait(1000); // Waiting for the point cloud to display
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarStateItem) => {
                expect(sidebarStateItem.length).to.be.equal(1);
            });
            cy.get('.cvat-canvas3d-perspective > .cvat-canvas-container').screenshot('canvas3d_perspective_after_reopen_job');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_after_reopen_job.png`,
                true,
            );
        });

        it('Remove annotations. Save the job.', () => {
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.contains('Saving changes on the server').should('be.hidden');
            cy.get('.cvat-objects-sidebar-state-item').should('not.exist');
            cy.get('.cvat-canvas3d-perspective > .cvat-canvas-container').screenshot('canvas3d_perspective_after_remove_annotations');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_before_all.png`,
                `${screenshotsPath}/canvas3d_perspective_after_remove_annotations.png`,
                true,
            );
        });
    });
});
