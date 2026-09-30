// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, firstLabelName, secondLabelName, attrName,
} from '../../support/const_audio';

context('Audio annotation. Saving after relabeling persists attributes.', () => {
    const caseId = 'audio_34';
    const customValue = 'custom value';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    after(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Saves a relabeled region and preserves its compatible attribute after reload', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 1)
                .find('.cvat-audio-interval-header-index').click();
            cy.get('.cvat-audio-region-details textarea').clear();
            cy.get('.cvat-audio-region-details textarea').type(customValue);

            cy.audioChangeSelectedRegionLabel(secondLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', customValue);
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');
            cy.saveJob();
            cy.reload();
            cy.assertWaveformReady();
            cy.get('.cvat-audio-region-item', { timeout: 15000 }).should('have.length', 1)
                .find('.cvat-audio-interval-header-index').click();
            cy.get('.cvat-audio-region-details .cvat-audio-interval-header-label-selector')
                .should('contain.text', secondLabelName);
            cy.get('.cvat-audio-region-attr-name').should('contain.text', attrName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', customValue);
        });
    });
});
