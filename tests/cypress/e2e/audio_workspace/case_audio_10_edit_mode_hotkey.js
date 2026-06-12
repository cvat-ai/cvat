// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Edit mode hotkey activates edit control.', () => {
    const caseId = 'audio_10';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Pressing EDIT_AUDIO_REGION (e) marks edit control as active', () => {
            cy.get('.cvat-audio-edit-region-control').should('not.have.class', 'cvat-active-canvas-control');
            cy.get('body').type('e');
            cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
        });
    });
});
