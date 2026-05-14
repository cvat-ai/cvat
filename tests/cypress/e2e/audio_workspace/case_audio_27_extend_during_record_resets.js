// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Extend during Record cancels record without creating an extend region.', () => {
    const caseId = 'audio_27';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Shift+E pressed while recording switches mode back to cursor and adds no new region', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                // Create a baseline region so an active label is set and we
                // have a clear pre/post region count to compare against.
                cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
                const baseline = initial + 1;
                cy.get('.cvat-audio-region-item').should('have.length', baseline);

                // Activate record mode via Shift+N. Without playback the
                // phantom interval has zero duration and is dropped on exit
                // (MIN_RECORDING_DURATION), so the only region we expect at
                // the end is the baseline.
                cy.get('body').type('{shift}N');
                cy.get('.cvat-audio-record-region-control')
                    .should('have.class', 'cvat-active-canvas-control');

                cy.get('body').type('{shift}E');

                cy.get('.cvat-cursor-control')
                    .should('have.class', 'cvat-active-canvas-control');
                cy.get('.cvat-audio-record-region-control')
                    .should('not.have.class', 'cvat-active-canvas-control');
                cy.get('.cvat-audio-extend-region-popover-content').should('not.exist');
                cy.get('.cvat-audio-region-item').should('have.length', baseline);
            });
        });
    });
});
