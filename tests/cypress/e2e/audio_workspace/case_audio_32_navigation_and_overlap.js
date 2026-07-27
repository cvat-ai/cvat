// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Interval navigation and overlap selection.', () => {
    const caseId = 'audio_32';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Wraps next and previous navigation while skipping hidden intervals', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 80, 140);
            cy.audioCreateRegionViaButton(firstLabelName, 200, 260);
            cy.audioCreateRegionViaButton(firstLabelName, 320, 380);
            cy.get('.cvat-audio-region-item').should('have.length', 3);

            cy.get('.cvat-audio-region-item').eq(1)
                .find('.cvat-audio-region-item-action-btn').eq(1).click();
            cy.get('.cvat-audio-region-item').eq(1).should('have.class', 'cvat-audio-region-item-hidden');

            cy.get('.cvat-audio-region-item').first().click();
            cy.realPress('Tab');
            cy.get('.cvat-audio-region-item').eq(2).should('have.class', 'cvat-audio-region-item-active');

            cy.realPress('Tab');
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');

            cy.realPress(['Shift', 'Tab']);
            cy.get('.cvat-audio-region-item').eq(2).should('have.class', 'cvat-audio-region-item-active');
        });

        it('Selects the Core-chosen interval when visible regions overlap', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 300);
            cy.audioCreateRegionViaButton(secondLabelName, 200, 400);
            cy.get('.cvat-audio-region-item').should('have.length', 2);

            cy.clickRegionOnWaveform(280);

            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-region-item').eq(1).should('not.have.class', 'cvat-audio-region-item-active');
        });
    });
});
