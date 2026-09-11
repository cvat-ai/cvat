// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Move interval.', () => {
    const caseId = 'audio_10';
    const POSITION_TOLERANCE_PX = 4;

    const getRegionBounds = () => cy.getAudioRegion().should('have.length', 1).then(($region) => {
        const { left, right, width } = $region[0].getBoundingClientRect();
        return { left, right, width };
    });

    const moveRegion = (fromX, toX) => {
        cy.getAudioWaveformViewport().then(($viewport) => {
            const yOffset = $viewport[0].getBoundingClientRect().height / 2;

            cy.wrap($viewport).realMouseMove(fromX, yOffset);
            cy.wrap($viewport).realMouseDown({
                position: { x: fromX, y: yOffset },
                button: 'left',
            });
            cy.wrap($viewport).realMouseMove(toX, yOffset);
            cy.wrap($viewport).realMouseUp({ button: 'left' });
        });
    };

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
        cy.audioSliderSetValue('cvat-audio-zoom-control', '{home}', 1);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Moves an interval while preserving its duration', () => {
            const moveDistance = 100;

            cy.audioCreateRegionViaButton(firstLabelName, 200, 350);
            getRegionBounds().then((before) => {
                moveRegion(250, 250 + moveDistance);

                getRegionBounds().should((after) => {
                    expect(after.left).to.be.closeTo(before.left + moveDistance, POSITION_TOLERANCE_PX);
                    expect(after.right).to.be.closeTo(before.right + moveDistance, POSITION_TOLERANCE_PX);
                    expect(after.width).to.be.closeTo(before.width, POSITION_TOLERANCE_PX);
                });
            });
        });

        it('Keeps an interval at the track end when moved beyond it', () => {
            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewportWidth = $viewport[0].getBoundingClientRect().width;
                const regionStart = viewportWidth - 250;
                const regionEnd = viewportWidth - 100;

                cy.audioCreateRegionViaButton(firstLabelName, regionStart, regionEnd);
                getRegionBounds().then((before) => {
                    moveRegion(regionStart + 50, viewportWidth + 100);

                    getRegionBounds().should((after) => {
                        const viewportRight = $viewport[0].getBoundingClientRect().right;

                        expect(after.left).to.be.closeTo(viewportRight - before.width, POSITION_TOLERANCE_PX);
                        expect(after.right).to.be.closeTo(viewportRight, POSITION_TOLERANCE_PX);
                        expect(after.width).to.be.closeTo(before.width, POSITION_TOLERANCE_PX);
                    });
                });
            });
        });
    });
});
