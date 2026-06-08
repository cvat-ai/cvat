// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Region details panel shows active region info.', () => {
    const caseId = 'audio_15';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('No details panel before any selection; details panel appears after creating a region', () => {
            cy.get('.cvat-audio-region-details').should('not.exist');
            cy.audioCreateRegionViaButton(firstLabelName, 120, 280);
            cy.clickRegionOnWaveform((120 + 280) / 2);
            cy.get('.cvat-audio-region-details', { timeout: 5000 }).should('be.visible');
            cy.get('.cvat-audio-region-details-time-range').should('not.be.empty');
            cy.get('.cvat-audio-region-details-duration').should('not.be.empty');
            cy.get('.cvat-audio-region-label-trigger').should('contain.text', firstLabelName);
            cy.get('.cvat-audio-region-details-index').should('contain.text', '1');
        });
    });
});
