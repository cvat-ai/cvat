// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Overlapping regions are both stored.', () => {
    const caseId = 'audio_26';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Two regions with overlapping x-ranges coexist in the regions list', () => {
            // x-ranges 100-280 and 200-380 overlap by construction
            cy.audioCreateRegionViaButton(firstLabelName, 100, 280);
            cy.audioCreateRegionViaButton(secondLabelName, 200, 380);
            cy.get('.cvat-audio-region-item').should('have.length', 2);
            // Each item shows its own label
            cy.get('.cvat-audio-region-item').first().should('contain.text', firstLabelName);
            cy.get('.cvat-audio-region-item').last().should('contain.text', secondLabelName);
        });
    });
});
