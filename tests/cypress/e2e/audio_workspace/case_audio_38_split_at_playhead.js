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
        it('Splits the only interval at the playhead from the button and with S', () => {
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
            cy.realPress('s');
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);

            cy.audioUndo();
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
        });

        it('Lets the user choose an overlapping interval', () => {
            let splitPosition;
            let selectedIntervalBounds;
            let otherIntervalBounds;
            let selectedIntervalId;
            let otherIntervalId;

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

            cy.get('.cvat-audio-split-control').click();
            cy.get('.cvat-audio-split-option').should('have.length', 2);
            cy.get('.cvat-audio-split-option').then(($options) => {
                const selectedOption = Array.from($options).find((option) => (
                    option.textContent?.includes(firstLabelName)
                ));
                const otherOption = Array.from($options).find((option) => (
                    option !== selectedOption
                ));

                selectedIntervalId = selectedOption?.getAttribute('data-interval-id');
                otherIntervalId = otherOption?.getAttribute('data-interval-id');

                expect(selectedIntervalId).to.be.a('string').and.not.be.empty;
                expect(otherIntervalId).to.be.a('string').and.not.be.empty;
            });
            cy.then(() => {
                cy.get(`.cvat-audio-split-option[data-interval-id="${selectedIntervalId}"]`)
                    .trigger('mouseover');
                cy.get('.cvat-audio-region-item').filter(`[data-interval-id="${selectedIntervalId}"]`)
                    .should('have.class', 'cvat-audio-region-item-hovered');
            });
            cy.then(() => {
                cy.get(`.cvat-audio-split-option[data-interval-id="${selectedIntervalId}"]`).click();
            });

            cy.get('.cvat-audio-split-option').should('not.be.visible');
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 3);
            cy.then(() => {
                cy.get(`.cvat-audio-region-item[data-interval-id="${selectedIntervalId}"]`)
                    .should('have.length', 1);
                cy.get(`.cvat-audio-region-item[data-interval-id="${otherIntervalId}"]`)
                    .should('have.length', 1);
            });
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
    });
});
