// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Player navigation.', () => {
    const caseId = 'audio_42';
    const POSITION_TOLERANCE_PX = 2;
    const SHORT_STEP_FRACTION = 0.005;
    const LONG_STEP_FRACTION = 0.05;

    const seekAtViewportOffset = (offset) => cy.getAudioWaveformScrollContainer().then(($scroll) => {
        const { scrollLeft, clientWidth, clientHeight } = $scroll[0];
        cy.getAudioWaveformWrapper().click(
            scrollLeft + clientWidth * offset,
            clientHeight / 2,
            { force: true },
        );
    });

    const expectCursorOffset = (expectedOffset) => {
        cy.getAudioWaveformCursor().should(($cursor) => {
            expect($cursor[0].offsetLeft).to.be.closeTo(expectedOffset, POSITION_TOLERANCE_PX);
        });
    };

    const clickAndExpectStep = (buttonSelector, stepFraction) => {
        cy.getAudioWaveformScrollContainer().then(($scroll) => {
            const expectedStep = $scroll[0].clientWidth * stepFraction;
            cy.getAudioWaveformCursor().then(($cursor) => {
                const initialOffset = $cursor[0].offsetLeft;

                cy.get(buttonSelector).click();
                expectCursorOffset(initialOffset + expectedStep);
            });
        });
    };

    beforeEach(() => {
        cy.viewport(1400, 900);
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Seeks to recording boundaries and steps by visible viewport fractions', () => {
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 20);
            cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge').should('have.text', 'x3');

            cy.getAudioWaveformScrollContainer().then(($scroll) => {
                cy.get('.cvat-player-end-button').click();
                expectCursorOffset($scroll[0].scrollWidth);
            });

            cy.get('.cvat-player-begin-button').click();
            expectCursorOffset(0);
            seekAtViewportOffset(0.5);

            clickAndExpectStep('.cvat-player-short-jump-forward-button', SHORT_STEP_FRACTION);
            clickAndExpectStep('.cvat-player-short-jump-backward-button', -SHORT_STEP_FRACTION);
            clickAndExpectStep('.cvat-player-long-jump-forward-button', LONG_STEP_FRACTION);
            clickAndExpectStep('.cvat-player-long-jump-backward-button', -LONG_STEP_FRACTION);
        });
    });
});
