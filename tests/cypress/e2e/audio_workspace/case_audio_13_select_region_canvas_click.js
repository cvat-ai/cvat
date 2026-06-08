// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Click region on canvas activates it.', () => {
    const caseId = 'audio_13';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
        cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Selecting via list updates the active class on the item', () => {
            cy.clickRegionOnWaveform((100 + 250) / 2);
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-region-details').should('be.visible');
        });
    });
});
