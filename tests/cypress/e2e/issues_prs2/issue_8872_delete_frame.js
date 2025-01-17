// Copyright (C) 2025 CVAT.ai Corporation
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
            cy.intercept('GET', '/api/jobs/**/data/meta**').as('getMeta');
            cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');

            cy.openTaskJob(taskName);
            // Ensure first request is sent after loading the job
            cy.wait('@getMeta');

            const frameAlias = 'oldCurrentFrame';

            cy.goToNextFrame(1);
            cy.wait('@getMeta').then(() => {
                // enqueue current frame number
                // save it in context
                cy.getCurrentFrameNumber(frameAlias);
            });

            cy.clickDeleteFrame();
            cy.get('.cvat-player-restore-frame').should('not.exist');
            cy.wait('@getMeta');

            // Save and intercept request to confirm validate deleted frames
            cy.clickSave();
            cy.get(`@${frameAlias}`).then((frameNum) => {
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
                cy.clickSave();
                cy.wait('@patchMeta').then((interceptRestored) => {
                    const deletedFrames = interceptRestored.request.body.deleted_frames;
                    cy.wrap(deletedFrames).should('be.empty');
                    cy.checkFrameNum(frameNum);
                });
            });
        });
        after(() => {
            cy.window().then((window) => {
                window.cvat.config.jobMetaDataReloadPeriod = defaultJobMetadataReloadPreiod;
            });
        });
    });
});
