// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. ESC exits edit mode back to cursor.', () => {
    const caseId = 'audio_11';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Edit mode is cancelled by ESC and cursor becomes active', () => {
            cy.get('body').type('e');
            cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('body').type('{esc}');
            cy.get('.cvat-audio-edit-region-control').should('not.have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        });
    });
});
