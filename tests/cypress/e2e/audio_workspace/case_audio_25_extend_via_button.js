// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Extend region via toolbar button.', () => {
    const caseId = 'audio_25';
    const REGION_POSITION_TOLERANCE_PX = 4;

    const getWaveformHost = () => cy.get('.cvat-audio-waveform-wrapper > div:first-child > div');
    const getWaveformWrapper = () => getWaveformHost().shadow().find('.wrapper');
    const getPlaybackCursor = () => getWaveformHost().shadow().find('.cursor');
    const getRegionRects = () => getWaveformHost().shadow().find('[part~="region"]').then(($regions) => (
        Array.from($regions)
            .map((region) => region.getBoundingClientRect())
            .sort((left, right) => left.left - right.left)
    ));

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Extend button uses the closest region to the left, regardless of creation order', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 500, 650);
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 2);

            cy.get('.cvat-audio-waveform-wrapper').first().then(($el) => {
                const rect = $el[0].getBoundingClientRect();
                cy.get('.cvat-audio-waveform-wrapper').realClick({
                    position: { x: 400, y: rect.height / 2 },
                    button: 'left',
                });
            });
            cy.audioExtendViaButton(firstLabelName);

            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').last().should('have.class', 'cvat-audio-region-item-active');
            getRegionRects().then(([left, extended, right]) => {
                expect(extended.left).to.be.closeTo(left.right, REGION_POSITION_TOLERANCE_PX);
                expect(extended.right).to.be.lessThan(right.left);
                expect(extended.width).to.be.greaterThan(0);
            });
        });

        it('Extend button creates a region from audio start to the paused playback position', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);

            cy.get('.cvat-player-play-button').click();
            cy.get('.cvat-player-pause-button').should('exist');
            // Keep playing for ~0.5sec
            cy.wait(500);
            cy.get('.cvat-player-pause-button').click();
            cy.get('.cvat-player-play-button').should('exist');

            getWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                getPlaybackCursor().then(($cursor) => {
                    const pausedCursorPosition = $cursor[0].getBoundingClientRect().left - wrapperLeft;
                    cy.wrap(pausedCursorPosition).as('pausedCursorPosition');
                });
            });

            cy.audioExtendViaButton(firstLabelName);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').first()
                .should('contain.text', firstLabelName)
                .and('have.class', 'cvat-audio-region-item-active');
            cy.get('@pausedCursorPosition').then((pausedCursorPosition) => {
                getWaveformWrapper().then(($wrapper) => {
                    const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                    getRegionRects().then(([region]) => {
                        expect(region.left - wrapperLeft).to.be.closeTo(0, REGION_POSITION_TOLERANCE_PX);
                        expect(region.right - wrapperLeft)
                            .to.be.closeTo(pausedCursorPosition, REGION_POSITION_TOLERANCE_PX);
                    });
                });
            });
        });
    });
});
