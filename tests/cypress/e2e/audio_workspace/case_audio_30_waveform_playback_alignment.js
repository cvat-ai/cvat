// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

// Regression test for waveform/playback misalignment.
//
// WaveSurfer draws the waveform from the Web-Audio-decoded buffer (exact
// duration) but seeks/positions the cursor using the player's reported
// duration. With the default MediaElement backend that is the <audio> element
// duration, which the browser only estimates for VBR streams, so the two
// durations drift apart and the rendered waveform stops matching what is played
// (worse when zoomed in). The WebAudio backend derives duration from
// decodeAudioData, keeping both identical and the waveform aligned.
context('Audio annotation. Waveform and playback are time-aligned.', () => {
    const caseId = 'audio_30';
    const WAVEFORM_TIMEOUT = 30000;

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Decoded waveform duration equals media playback duration', () => {
            cy.window({ timeout: WAVEFORM_TIMEOUT })
                .its('cvatAudioWavesurfer').should('not.be.null');

            cy.window().then((win) => {
                const ws = win.cvatAudioWavesurfer;
                const decoded = ws.getDecodedData();
                expect(decoded, 'decoded audio buffer').to.not.be.null;

                const decodedDuration = decoded.duration;
                const mediaDuration = ws.getDuration();
                expect(mediaDuration, 'media duration').to.be.greaterThan(0);
                // VBR streams desynchronize these two under the MediaElement
                // backend; the WebAudio backend keeps them equal.
                expect(
                    Math.abs(decodedDuration - mediaDuration),
                    'decoded vs media duration drift',
                ).to.be.lessThan(0.05);
            });
        });
    });
});
