// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, firstLabelName, secondLabelName,
} from '../../support/const_audio';

context('Audio annotation. Create region via hotkey.', () => {
    const caseId = 'audio_06';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Pressing CREATE_AUDIO_REGION (n) activates create mode and a drag creates a region', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.audioCreateRegionViaHotkey(80, 220);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
        });

        it('Keeps the Draw default when relabeling an active interval by shortcut', () => {
            cy.audioCreateRegionViaHotkey(80, 220);
            cy.get('.cvat-audio-region-item').should('have.length', 1)
                .and('contain.text', firstLabelName);

            cy.get('body').type('n');
            cy.get('body').type('{Ctrl}2');
            cy.audioDrawRegion(280, 420);
            cy.get('.cvat-audio-region-item', { timeout: 5000 })
                .should('have.length', 2)
                .last()
                .should('contain.text', secondLabelName);

            cy.get('body').type('n');
            cy.audioDrawRegion(480, 620);
            cy.get('.cvat-audio-region-item', { timeout: 5000 })
                .should('have.length', 3)
                .last()
                .should('contain.text', secondLabelName);

            cy.get('.cvat-audio-interval-region-control').click();
            cy.get('.cvat-audio-interval-region-popover-content .ant-select-selection-item')
                .should('contain.text', secondLabelName);
        });
    });
});
