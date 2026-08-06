// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Region editing auto-scrolls the waveform.', () => {
    const caseId = 'audio_36';
    const EDGE_OFFSET_PX = 2;

    const getRegionBounds = () => cy.getAudioRegion().should('have.length', 1).then(($region) => ({
        left: Number.parseFloat($region[0].style.left),
        rightInset: Number.parseFloat($region[0].style.right),
    }));

    const dragToViewportEdge = (target, edge) => {
        target.then(($target) => {
            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewportRect = $viewport[0].getBoundingClientRect();
                const targetRect = $target[0].getBoundingClientRect();
                const targetY = targetRect.top - viewportRect.top + targetRect.height / 2;
                const x = edge === 'left' ? EDGE_OFFSET_PX : viewportRect.width - EDGE_OFFSET_PX;
                const xBeyondEdge = edge === 'left' ? -EDGE_OFFSET_PX : viewportRect.width + EDGE_OFFSET_PX;

                cy.wrap($target).realMouseDown({
                    position: 'center',
                    button: 'left',
                    scrollBehavior: false,
                });
                cy.wrap($viewport).realMouseMove(x, targetY, {
                    scrollBehavior: false,
                });
                cy.document().should((currentDocument) => {
                    expect(currentDocument.pointerLockElement).not.to.be.null;
                });
                cy.wrap($viewport).realMouseMove(xBeyondEdge, targetY, {
                    scrollBehavior: false,
                });
                cy.wrap($viewport).realMouseUp({
                    button: 'left',
                    scrollBehavior: false,
                });
            });
        });
    };

    const rememberInteractionStart = () => {
        getRegionBounds().as('boundsBefore');
        cy.getAudioWaveformScrollContainer().then(($scroll) => cy.wrap($scroll[0].scrollLeft).as('scrollBefore'));
    };

    const expectScrolledTo = (direction) => {
        cy.get('@scrollBefore').then((before) => {
            cy.getAudioWaveformScrollContainer().should(($scroll) => {
                if (direction === 'left') {
                    expect($scroll[0].scrollLeft).to.be.lessThan(before);
                } else {
                    expect($scroll[0].scrollLeft).to.be.greaterThan(before);
                }
            });
        });
    };

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
        cy.viewport(1400, 900);
        cy.audioSliderSetValue('cvat-audio-zoom-control', '{home}', 1);
        cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 20);
        cy.audioCreateRegionViaButton(firstLabelName, 400, 550);
        cy.get('body').type('e');
        cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
        cy.getAudioRegion().should('have.css', 'cursor', 'grab');
    });

    afterEach(() => {
        cy.document().should((currentDocument) => {
            expect(currentDocument.pointerLockElement).to.be.null;
        });
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Dragging left moves the region left and scrolls left', () => {
            cy.getAudioWaveformScrollContainer().then(($scroll) => cy.wrap($scroll).scrollTo(100, 0));
            rememberInteractionStart();
            dragToViewportEdge(cy.getAudioRegion(), 'left');
            expectScrolledTo('left');
            getRegionBounds().then((after) => {
                cy.get('@boundsBefore').then((before) => {
                    expect(after.left).to.be.lessThan(before.left);
                    expect(after.rightInset).to.be.greaterThan(before.rightInset);
                });
            });
        });

        it('Dragging right moves the region right and scrolls right', () => {
            rememberInteractionStart();
            dragToViewportEdge(cy.getAudioRegion(), 'right');
            expectScrolledTo('right');
            getRegionBounds().then((after) => {
                cy.get('@boundsBefore').then((before) => {
                    expect(after.left).to.be.greaterThan(before.left);
                    expect(after.rightInset).to.be.lessThan(before.rightInset);
                });
            });
        });

        it('Resizing the end right extends the region and scrolls right', () => {
            rememberInteractionStart();
            dragToViewportEdge(cy.getAudioRegionHandle('right'), 'right');
            expectScrolledTo('right');
            getRegionBounds().then((after) => {
                cy.get('@boundsBefore').then((before) => {
                    expect(after.left).to.equal(before.left);
                    expect(after.rightInset).to.be.lessThan(before.rightInset);
                });
            });
        });

        it('Resizing the start left extends the region and scrolls left', () => {
            cy.getAudioWaveformScrollContainer().then(($scroll) => cy.wrap($scroll).scrollTo(100, 0));
            rememberInteractionStart();
            dragToViewportEdge(cy.getAudioRegionHandle('left'), 'left');
            expectScrolledTo('left');
            getRegionBounds().then((after) => {
                cy.get('@boundsBefore').then((before) => {
                    expect(after.left).to.be.lessThan(before.left);
                    expect(after.rightInset).to.equal(before.rightInset);
                });
            });
        });
    });
});
