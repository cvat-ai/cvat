// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, firstLabelName, secondLabelName, attrName, secondAttrDefaultValue,
} from '../../support/const_audio';

context('Audio annotation. Saving after relabeling persists attributes.', () => {
    const caseId = 'audio_34';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    after(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Saves a relabeled region and restores its default attribute after reload', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 1).click();
            cy.get('.cvat-audio-region-details textarea').clear();
            cy.get('.cvat-audio-region-details textarea').type('custom value');

            cy.audioChangeSelectedRegionLabel(secondLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', secondAttrDefaultValue);

            cy.intercept('PATCH', '/api/jobs/**/annotations**').as('saveAnnotations');
            cy.audioSaveAnnotations();
            cy.wait('@saveAnnotations').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');

            cy.reload();
            cy.assertWaveformReady();
            cy.get('.cvat-audio-region-item', { timeout: 15000 }).should('have.length', 1).click();
            cy.get('.cvat-audio-region-label-trigger').should('contain.text', secondLabelName);
            cy.get('.cvat-audio-region-attr-name').should('contain.text', attrName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', secondAttrDefaultValue);
        });
    });
});
