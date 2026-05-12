// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. CANCEL_AUDIO restores cursor mode from any control.', () => {
    const caseId = 'audio_12';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('After EDIT mode, ESC switches back to cursor', () => {
            cy.get('body').type('e');
            cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('body').type('{esc}');
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        });
    });
});
