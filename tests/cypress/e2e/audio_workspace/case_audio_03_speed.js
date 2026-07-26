// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Speed slider changes playback rate.', () => {
    const caseId = 'audio_03';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Adjusting speed slider updates the value badge on the control', () => {
            cy.get('.cvat-audio-speed-control .cvat-audio-slider-value-badge').invoke('text').then((before) => {
                cy.audioSliderSetValue('cvat-audio-speed-control', '{downarrow}', 5);
                cy.get('.cvat-audio-speed-control .cvat-audio-slider-value-badge')
                    .invoke('text').should('not.equal', before);
            });
        });
    });
});
