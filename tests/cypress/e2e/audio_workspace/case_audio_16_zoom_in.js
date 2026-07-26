// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Zoom in increases zoom value.', () => {
    const caseId = 'audio_16';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Adjusting zoom slider updates the value badge on the zoom control', () => {
            cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge').should('have.text', 'x1');
            cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge').invoke('text').then((before) => {
                cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 5);
                cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge')
                    .invoke('text').should('not.equal', before);
            });
        });
    });
});
