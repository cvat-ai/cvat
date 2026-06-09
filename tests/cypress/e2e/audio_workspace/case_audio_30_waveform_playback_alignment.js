// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

// Regression test for waveform/playback misalignment.
//
// The audio served to the player must be decoded PCM (WAV), never a raw
// compressed stream. WaveSurfer draws the waveform from the Web-Audio-decoded
// buffer (exact duration) but seeks/cursors using the <audio> element duration.
// For a VBR stream the browser only estimates the latter, so the two durations
// drift apart and the rendered waveform stops matching what is played (worse
// when zoomed in). PCM/WAV keeps both durations identical, so they stay aligned.
context('Audio annotation. Waveform and playback are time-aligned.', () => {
    const caseId = 'audio_30';
    const WAVEFORM_TIMEOUT = 30000;

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Player consumes decoded PCM WAV, not a raw compressed stream', () => {
            cy.window({ timeout: WAVEFORM_TIMEOUT })
                .its('cvatAudioWavesurfer').should('not.be.null');

            cy.window().then((win) => {
                const ws = win.cvatAudioWavesurfer;
                const media = ws.getMediaElement();
                const src = media.currentSrc || media.src;
                expect(src, 'media source').to.match(/^blob:/);

                return cy.wrap(
                    fetch(src).then((response) => response.blob()),
                    { timeout: WAVEFORM_TIMEOUT },
                ).then((blob) => {
                    expect(blob.type, 'served audio MIME type').to.equal('audio/wav');
                });
            });
        });

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
                expect(
                    Math.abs(decodedDuration - mediaDuration),
                    'decoded vs media duration drift',
                ).to.be.lessThan(0.05);
            });
        });
    });
});
