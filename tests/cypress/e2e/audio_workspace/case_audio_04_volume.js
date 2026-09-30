// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Volume slider changes volume.', () => {
    const caseId = 'audio_04';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Adjusting volume slider updates the value badge on the control', () => {
            cy.get('.cvat-audio-volume-control .cvat-audio-slider-value-badge').invoke('text').then((before) => {
                cy.audioSliderSetValue('cvat-audio-volume-control', '{uparrow}', 10);
                cy.get('.cvat-audio-volume-control .cvat-audio-slider-value-badge')
                    .invoke('text').should('not.equal', before);
            });
        });
    });
});
