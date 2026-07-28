// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Create region via hotkey.', () => {
    const caseId = 'audio_06';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Pressing CREATE_AUDIO_REGION (n) activates create mode and a drag creates a region', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.audioCreateRegionViaHotkey(80, 220);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
        });
    });
});
