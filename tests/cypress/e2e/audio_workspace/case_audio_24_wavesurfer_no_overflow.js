// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. WaveSurfer container does not overflow on resize.', () => {
    const caseId = 'audio_24';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Shrinking the viewport keeps the waveform wrapper within the page width', () => {
            const checkWidth = () => {
                cy.window().then((win) => {
                    const viewportWidth = win.innerWidth;
                    cy.get('.cvat-audio-waveform-wrapper').then(($el) => {
                        const rect = $el[0].getBoundingClientRect();
                        expect(rect.width).to.be.at.most(viewportWidth + 1);
                    });
                });
            };

            cy.viewport(1600, 900);
            cy.assertWaveformReady();
            checkWidth();

            cy.viewport(900, 700);
            cy.wait(200);
            checkWidth();
        });
    });
});
