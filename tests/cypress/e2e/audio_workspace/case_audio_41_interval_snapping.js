// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Interval snapping.', () => {
    const caseId = 'audio_41';
    const SNAP_OFFSET_PX = 12;
    const POSITION_TOLERANCE_PX = 3;

    const getViewportPoint = (x) => cy.getAudioWaveformViewport().then(($viewport) => {
        const bounds = $viewport[0].getBoundingClientRect();
        return {
            x: x - bounds.left,
            y: bounds.height / 2,
        };
    });

    const resizeRightBoundary = (sourceLeft, targetX) => {
        cy.getAudioRegion().then(($regions) => {
            const region = $regions.toArray().find((item) => (
                Math.abs(item.getBoundingClientRect().left - sourceLeft) <= POSITION_TOLERANCE_PX
            ));
            expect(region, 'source interval').to.not.be.undefined;

            const handle = region.querySelector('[part~="region-handle-right"]');
            expect(handle, 'source interval right handle').to.not.be.null;

            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewportBounds = $viewport[0].getBoundingClientRect();
                const handleBounds = handle.getBoundingClientRect();
                const y = handleBounds.top - viewportBounds.top + handleBounds.height / 2;
                const x = targetX - viewportBounds.left;

                // grab close to the right side of the handle so the final position is close to the pointer
                // when not snapped
                cy.wrap(handle).realMouseDown({
                    x: handleBounds.width - 1,
                    y: handleBounds.height / 2,
                    button: 'left',
                    altKey: true,
                    scrollBehavior: false,
                });
                cy.wrap($viewport).realMouseMove(x, y, { altKey: true, scrollBehavior: false });
                cy.wrap($viewport).realMouseUp({
                    x,
                    y,
                    button: 'left',
                    altKey: false,
                    scrollBehavior: false,
                });
            });
        });
    };

    const moveInterval = (sourceX, targetX) => {
        cy.getAudioWaveformViewport().then(($viewport) => {
            const viewportBounds = $viewport[0].getBoundingClientRect();
            const y = viewportBounds.height / 2;
            const fromX = sourceX - viewportBounds.left;
            const toX = targetX - viewportBounds.left;

            cy.wrap($viewport).realMouseMove(fromX, y, { altKey: true, scrollBehavior: false });
            cy.wrap($viewport).realMouseDown({
                position: { x: fromX, y },
                button: 'left',
                altKey: true,
                scrollBehavior: false,
            });
            cy.wrap($viewport).realMouseMove(toX, y, { altKey: true, scrollBehavior: false });
            cy.wrap($viewport).realMouseUp({
                x: toX,
                y,
                button: 'left',
                altKey: true,
                scrollBehavior: false,
            });
        });
    };

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Shows the snapped draw-start guide and creates its initial preview without movement', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 240, 320);

            cy.getAudioRegion().should('have.length', 1).then(($regions) => {
                const targetX = $regions[0].getBoundingClientRect().left;
                const pointerX = targetX + SNAP_OFFSET_PX;

                cy.audioActivateCreate(firstLabelName);
                getViewportPoint(pointerX).then(({ x, y }) => {
                    cy.getAudioWaveformViewport().realMouseMove(x, y, { altKey: true });
                    cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]')
                        .should('have.length', 1)
                        .then(($guide) => {
                            expect($guide[0].getBoundingClientRect().left)
                                .to.be.closeTo(targetX, POSITION_TOLERANCE_PX);
                        });
                    cy.get('.cvat-audio-waveform-wrapper > div:first-child')
                        .should('have.class', 'cvat-audio-waveform-interaction-snap-hover');
                    cy.getAudioWaveformHost().shadow().find('[part~="hover"]')
                        .should('have.css', 'visibility', 'hidden');
                    cy.getAudioWaveformViewport().realMouseDown({
                        position: { x, y },
                        button: 'left',
                        altKey: true,
                    });
                });

                cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]')
                    .should('have.length', 1)
                    .then(($preview) => {
                        const bounds = $preview[0].getBoundingClientRect();
                        expect(bounds.left).to.be.closeTo(targetX, POSITION_TOLERANCE_PX);
                        expect(bounds.right).to.be.closeTo(pointerX, POSITION_TOLERANCE_PX);
                    });
                cy.get('.cvat-audio-waveform-wrapper > div:first-child')
                    .should('not.have.class', 'cvat-audio-waveform-interaction-snap-hover');

                getViewportPoint(pointerX).then(({ x, y }) => {
                    cy.getAudioWaveformViewport().realMouseUp({
                        x,
                        y,
                        button: 'left',
                        altKey: false,
                    });
                });

                cy.getAudioRegionRects().should((rectangles) => {
                    expect(rectangles).to.have.length(2);
                    expect(rectangles.some((bounds) => (
                        Math.abs(bounds.left - targetX) <= POSITION_TOLERANCE_PX &&
                        Math.abs(bounds.right - pointerX) <= POSITION_TOLERANCE_PX
                    ))).to.be.true;
                });
            });
        });

        it('Snaps the draw end to an interval boundary', () => {
            const startOffset = 120;
            cy.audioCreateRegionViaButton(firstLabelName, 340, 420);

            cy.getAudioRegion().should('have.length', 1).then(($regions) => {
                const targetX = $regions[0].getBoundingClientRect().left;

                cy.audioActivateCreate(firstLabelName);
                cy.getAudioWaveformViewport().then(($viewport) => {
                    const viewportBounds = $viewport[0].getBoundingClientRect();
                    const startX = viewportBounds.left + startOffset;
                    const endX = targetX + SNAP_OFFSET_PX - viewportBounds.left;
                    const y = viewportBounds.height / 2;

                    cy.wrap($viewport).realMouseDown({
                        position: { x: startOffset, y },
                        button: 'left',
                        altKey: false,
                    });
                    cy.wrap($viewport).realMouseMove(endX, y, { altKey: true });
                    cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]')
                        .should('have.length', 1)
                        .then(($preview) => {
                            const bounds = $preview[0].getBoundingClientRect();
                            expect(bounds.left).to.be.closeTo(startX, POSITION_TOLERANCE_PX);
                            expect(bounds.right).to.be.closeTo(targetX, POSITION_TOLERANCE_PX);
                        });
                    cy.wrap($viewport).realMouseUp({
                        x: endX,
                        y,
                        button: 'left',
                        altKey: true,
                    });

                    cy.getAudioRegionRects().should((rectangles) => {
                        expect(rectangles).to.have.length(2);
                        expect(rectangles.some((bounds) => (
                            Math.abs(bounds.left - startX) <= POSITION_TOLERANCE_PX &&
                            Math.abs(bounds.right - targetX) <= POSITION_TOLERANCE_PX
                        ))).to.be.true;
                    });
                });
            });
        });

        it('Snaps a resize edge while excluding the fixed opposite-edge timestamp', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 120, 200);
            cy.audioCreateRegionViaButton(firstLabelName, 340, 420);

            cy.getAudioRegionRects().then((rectangles) => {
                const [source, target] = rectangles;
                resizeRightBoundary(source.left, target.left - SNAP_OFFSET_PX);

                cy.getAudioRegionRects().should((updatedRectangles) => {
                    expect(updatedRectangles[0].right)
                        .to.be.closeTo(updatedRectangles[1].left, POSITION_TOLERANCE_PX);
                });
            });

            cy.audioClearAnnotations();
            cy.audioCreateRegionViaButton(firstLabelName, 180, 300);
            cy.audioCreateRegionViaButton(firstLabelName, 300, 420);

            cy.getAudioRegionRects().then((rectangles) => {
                const [adjacent, source] = rectangles;
                const targetX = source.left + SNAP_OFFSET_PX;
                resizeRightBoundary(source.left, targetX);

                cy.getAudioRegionRects().should((updatedRectangles) => {
                    expect(updatedRectangles[1].left)
                        .to.be.closeTo(adjacent.right, POSITION_TOLERANCE_PX);
                    expect(updatedRectangles[1].right)
                        .to.be.closeTo(targetX, POSITION_TOLERANCE_PX);
                });
            });
        });

        it('Snaps each moved interval boundary to another interval', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 120, 200);
            cy.audioCreateRegionViaButton(firstLabelName, 340, 420);

            cy.getAudioRegionRects().then(([leftSource, rightTarget]) => {
                const sourceCenter = (leftSource.left + leftSource.right) / 2;
                const pointerNearTargetStart = sourceCenter + rightTarget.left - leftSource.right - SNAP_OFFSET_PX;
                moveInterval(sourceCenter, pointerNearTargetStart);

                cy.getAudioRegionRects().should(([movedSource, target]) => {
                    expect(movedSource.right)
                        .to.be.closeTo(target.left, POSITION_TOLERANCE_PX);
                });
            });

            cy.audioClearAnnotations();
            cy.audioCreateRegionViaButton(firstLabelName, 180, 260);
            cy.audioCreateRegionViaButton(firstLabelName, 340, 420);

            cy.getAudioRegionRects().then(([leftTarget, rightSource]) => {
                const sourceCenter = (rightSource.left + rightSource.right) / 2;
                const pointerNearTargetEnd = sourceCenter + leftTarget.right - rightSource.left + SNAP_OFFSET_PX;
                moveInterval(sourceCenter, pointerNearTargetEnd);

                cy.getAudioRegionRects().should(([target, movedSource]) => {
                    expect(target.right)
                        .to.be.closeTo(movedSource.left, POSITION_TOLERANCE_PX);
                });
            });
        });
    });
});
