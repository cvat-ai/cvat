// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Create region via toolbar button.', () => {
    const caseId = 'audio_05';
    const REGION_POSITION_TOLERANCE_PX = 2;

    const drawAndAssertPreview = (xStart, xEnd) => {
        cy.getAudioWaveformViewport().then(($viewport) => {
            const viewport = $viewport[0];
            const viewportRect = viewport.getBoundingClientRect();
            const yOffset = viewportRect.height / 2;
            const expectedLeft = viewportRect.left + Math.min(xStart, xEnd);
            const expectedRight = viewportRect.left + Math.max(xStart, xEnd);

            cy.wrap($viewport).realMouseDown({
                position: { x: xStart, y: yOffset },
                button: 'left',
            });
            cy.wrap($viewport).realMouseMove(xEnd, yOffset);

            cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]')
                .should('have.length', 1)
                .then(($preview) => {
                    const previewRect = $preview[0].getBoundingClientRect();
                    expect(previewRect.left).to.be.closeTo(expectedLeft, REGION_POSITION_TOLERANCE_PX);
                    expect(previewRect.right).to.be.closeTo(expectedRight, REGION_POSITION_TOLERANCE_PX);
                });

            cy.wrap($viewport).realMouseUp({
                position: { x: xEnd, y: yOffset },
                button: 'left',
            });
        });
    };

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Creates regions by dragging in both directions and previews their boundaries', () => {
            let playbackCursorPosition;

            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.getAudioWaveformCursor().then(($cursor) => {
                playbackCursorPosition = $cursor[0].getBoundingClientRect().left;
            });

            cy.audioActivateCreate(firstLabelName);
            drawAndAssertPreview(100, 250);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.getAudioWaveformCursor().then(($cursor) => {
                expect($cursor[0].getBoundingClientRect().left)
                    .to.be.closeTo(playbackCursorPosition, REGION_POSITION_TOLERANCE_PX);
            });
            cy.get('.cvat-audio-region-item').first()
                .should('contain.text', firstLabelName)
                .and('have.class', 'cvat-audio-region-item-active');

            cy.audioActivateCreate(firstLabelName);
            drawAndAssertPreview(400, 300);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 2);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        });
    });
});
