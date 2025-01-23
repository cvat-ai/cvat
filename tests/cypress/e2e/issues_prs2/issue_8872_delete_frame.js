// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('UI and job metadata work correctly when deleting frames', () => {
    const chunkReloadPeriod = 100; // 100 ms
    let defaultJobMetadataReloadPreiod;

    describe('Attempt to delete any frame after repeated request to /data/meta/', () => {
        before(() => {
            cy.window().then((window) => {
                defaultJobMetadataReloadPreiod = window.cvat.config.jobMetaDataReloadPeriod;
                window.cvat.config.jobMetaDataReloadPeriod = chunkReloadPeriod;
            });
        });

        it('Elapse job metadata reload period, delete a frame, validate UI state is and request body ', () => {
            let frameNum = null;
            function getCurrentFrameNumber() {
                cy.get('.cvat-player-frame-selector').within(() => cy.get('[role="spinbutton"]')
                    .should('have.attr', 'aria-valuenow')
                    .then((valueFrameNow) => { frameNum = Number(valueFrameNow); }));
            }

            cy.intercept('GET', '/api/jobs/**/data/meta**').as('getMeta');
            cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');

            cy.openTaskJob(taskName);
            // Ensure first request is sent after loading the job
            cy.wait('@getMeta');

            cy.goToNextFrame(1);
            cy.wait('@getMeta');
            getCurrentFrameNumber();

            cy.clickDeleteFrameAnnotationView();
            cy.get('.cvat-player-restore-frame').should('not.exist');

            // Save and intercept request to confirm validate deleted frames
            cy.clickSaveAnnotationView();
            cy.wait('@patchMeta').then((interceptDeleted) => {
                const deletedFrames = interceptDeleted.request.body.deleted_frames;

                // Check old frame is unavailable
                cy.checkFrameNum(frameNum + 1);

                // Check deleted frame are correct
                expect(deletedFrames).to.include(frameNum);
            });
            // Restore state and save
            // Validate UI and that no frames are marked deleted
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.clickSaveAnnotationView();
            cy.wait('@patchMeta').then((interceptRestored) => {
                const deletedFrames = interceptRestored.request.body.deleted_frames;
                cy.wrap(deletedFrames).should('be.empty');
                cy.checkFrameNum(frameNum);
            });
        });
        after(() => {
            cy.window().then((window) => {
                window.cvat.config.jobMetaDataReloadPeriod = defaultJobMetadataReloadPreiod;
            });
        });
    });
});
