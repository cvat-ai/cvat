// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Split interval at playhead.', () => {
    const caseId = 'audio_38';
    const REGION_POSITION_TOLERANCE_PX = 4;

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Splits the only interval at the playhead from the button and with Alt+M', () => {
            let originalIntervalBounds;
            let firstSplitPosition;

            cy.audioCreateRegionViaButton(firstLabelName, 100, 400);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioRegionRects().then(([region]) => {
                    originalIntervalBounds = {
                        left: region.left - wrapperLeft,
                        right: region.right - wrapperLeft,
                    };
                });
            });
            cy.clickAudioWaveform(250);

            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioWaveformCursor().then(($cursor) => {
                    firstSplitPosition = $cursor[0].getBoundingClientRect().left - wrapperLeft;
                });
            });

            cy.get('.cvat-audio-split-control').click();
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
            cy.get('.cvat-audio-region-item').last().should('have.class', 'cvat-audio-region-item-active');
            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioRegionRects().then(([left, right]) => {
                    expect(left.left - wrapperLeft)
                        .to.be.closeTo(originalIntervalBounds.left, REGION_POSITION_TOLERANCE_PX);
                    expect(left.right - wrapperLeft)
                        .to.be.closeTo(firstSplitPosition, REGION_POSITION_TOLERANCE_PX);
                    expect(right.left - wrapperLeft)
                        .to.be.closeTo(firstSplitPosition, REGION_POSITION_TOLERANCE_PX);
                    expect(right.right - wrapperLeft)
                        .to.be.closeTo(originalIntervalBounds.right, REGION_POSITION_TOLERANCE_PX);
                });
            });

            cy.clickAudioWaveform(325);
            cy.realPress(['Alt', 'M']);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);

            cy.audioUndo();
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
        });

        it('Splits the selected interval without opening the chooser when intervals overlap', () => {
            let splitPosition;
            let selectedIntervalBounds;
            let otherIntervalBounds;

            cy.audioCreateRegionViaButton(firstLabelName, 100, 400);
            cy.audioCreateRegionViaButton(secondLabelName, 200, 500);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioRegionRects().then(([selected, other]) => {
                    selectedIntervalBounds = {
                        left: selected.left - wrapperLeft,
                        right: selected.right - wrapperLeft,
                    };
                    otherIntervalBounds = {
                        left: other.left - wrapperLeft,
                        right: other.right - wrapperLeft,
                    };
                });
            });
            cy.clickAudioWaveform(250);

            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioWaveformCursor().then(($cursor) => {
                    splitPosition = $cursor[0].getBoundingClientRect().left - wrapperLeft;
                });
            });

            cy.get('.cvat-audio-region-item').first().find('.cvat-audio-interval-header-index').click();
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-split-control').click();
            cy.get('.cvat-audio-split-option').should('not.exist');
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);
            cy.getAudioWaveformWrapper().then(($wrapper) => {
                const wrapperLeft = $wrapper[0].getBoundingClientRect().left;
                cy.getAudioRegionRects().then((regions) => {
                    expect(regions.some((region) => (
                        Math.abs(region.left - wrapperLeft - selectedIntervalBounds.left) <=
                            REGION_POSITION_TOLERANCE_PX &&
                        Math.abs(region.right - wrapperLeft - splitPosition) <= REGION_POSITION_TOLERANCE_PX
                    ))).to.be.true;
                    expect(regions.some((region) => (
                        Math.abs(region.left - wrapperLeft - splitPosition) <= REGION_POSITION_TOLERANCE_PX &&
                        Math.abs(region.right - wrapperLeft - selectedIntervalBounds.right) <=
                            REGION_POSITION_TOLERANCE_PX
                    ))).to.be.true;
                    expect(regions.some((region) => (
                        Math.abs(region.left - wrapperLeft - otherIntervalBounds.left) <=
                            REGION_POSITION_TOLERANCE_PX &&
                        Math.abs(region.right - wrapperLeft - otherIntervalBounds.right) <=
                            REGION_POSITION_TOLERANCE_PX
                    ))).to.be.true;
                });
            });
        });

        it('Lets the user choose an overlapping interval when another interval is active', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 400);
            cy.audioCreateRegionViaButton(secondLabelName, 200, 500);
            cy.audioCreateRegionViaButton(firstLabelName, 600, 700);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);

            cy.clickAudioWaveform(250);
            cy.get('.cvat-audio-region-item').last().find('.cvat-audio-interval-header-index').click();
            cy.get('.cvat-audio-region-item').last().should('have.class', 'cvat-audio-region-item-active');

            cy.get('.cvat-audio-split-control').click();
            cy.get('.cvat-audio-split-option').should('have.length', 2);
            cy.contains('.cvat-audio-split-option', firstLabelName).click();
            cy.get('.cvat-audio-split-option').should('not.be.visible');
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 4);
        });

        it('Splits a pinned interval', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 400);
            cy.get('.cvat-audio-region-item')
                .find('.cvat-audio-region-item-action-btn:has([data-icon="pushpin"])')
                .click();
            cy.clickAudioWaveform(250);

            cy.get('.cvat-audio-split-control').click();
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
        });
    });
});
