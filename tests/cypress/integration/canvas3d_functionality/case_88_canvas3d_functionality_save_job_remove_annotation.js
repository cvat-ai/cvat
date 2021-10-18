// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Save a job. Remove annotations.', () => {
    const caseId = '88';
    const screenshotsPath =
        'cypress/screenshots/canvas3d_functionality/case_88_canvas3d_functionality_save_job_remove_annotation.js';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.customScreenshot('.cvat-canvas3d-topview', 'canvas3d_topview_before_all');
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save a job. Reopen the job.', () => {
            const waitTime = 1000;
            cy.wait(waitTime);
            cy.saveJob('PATCH', 200, 'saveJob');
            cy.wait(waitTime);
            cy.goToTaskList();
            cy.wait(waitTime);
            cy.openTaskJob(taskName);
            cy.wait(waitTime); // Waiting for the point cloud to display
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarStateItem) => {
                expect(sidebarStateItem.length).to.be.equal(1);
            });
            cy.wait(waitTime);
            cy.customScreenshot('.cvat-canvas3d-topview', 'canvas3d_topview_after_reopen_job');
            cy.wait(waitTime);
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_topview_before_all.png`,
                `${screenshotsPath}/canvas3d_topview_after_reopen_job.png`,
            );
        });

        it('Remove annotations. Save the job.', () => {
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.contains('Saving changes on the server').should('be.hidden');
            cy.get('.cvat-objects-sidebar-state-item').should('not.exist');
            cy.customScreenshot('.cvat-canvas3d-topview', 'canvas3d_topview_after_remove_annotations');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_topview_after_reopen_job.png`,
                `${screenshotsPath}/canvas3d_topview_after_remove_annotations.png`,
            );
        });
    });
});
