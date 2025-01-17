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

            // Intercept first request after loading the job
            cy.openTaskJob(taskName);
            cy.wait('@getMeta');

            const frameAlias = 'oldCurrentFrame';

            cy.goToNextFrame(1);
            cy.wait('@getMeta').then((interceptor) => {
                expect(interceptor.response.body).to.haveOwnProperty('frames');
                // enqueue current frame number
                // save it in context
                cy.getCurrentFrameNumber(frameAlias);
            });

            // Delete frame, ignore new request
            cy.clickDeleteFrame();
            cy.get('.cvat-player-restore-frame').should('not.exist'); // ???: not sure about this one, it might be visible

            // Save and intercept request to confirm validate deleted frames
            cy.clickSave();
            cy.wait('@patchMeta').then((interceptor) => {
                cy.get(`@${frameAlias}`).then((frameNum) => {
                    expect(interceptor.response.body).to.haveOwnProperty('deleted_frames');
                    const deletedFrames = interceptor.response.body.deleted_frames;
                    assert(Array.isArray(deletedFrames) && deletedFrames.length === 1);

                    // Check old frame is unavailable
                    cy.checkFrameNum(frameNum + 1);

                    // Check deleted frames are correct
                    const [actualDeletedFrames, expectedDeletedFrames] = [deletedFrames[0], frameNum];
                    expect(actualDeletedFrames).to.equal(expectedDeletedFrames);
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
