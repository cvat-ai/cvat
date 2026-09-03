// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Interval navigation and overlap selection.', () => {
    const caseId = 'audio_32';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Wraps next and previous navigation while skipping hidden intervals', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 80, 140);
            cy.audioCreateRegionViaButton(firstLabelName, 200, 260);
            cy.audioCreateRegionViaButton(firstLabelName, 320, 380);
            cy.get('.cvat-audio-region-item').should('have.length', 3);

            cy.get('.cvat-audio-region-item').eq(1)
                .find('.cvat-audio-region-item-action-btn:has(.anticon-eye)').click();
            cy.get('.cvat-audio-region-item').eq(1).should('have.class', 'cvat-audio-region-item-hidden');

            cy.get('.cvat-audio-region-item').first()
                .find('.cvat-audio-interval-header-index').click();
            cy.realPress('Tab');
            cy.get('.cvat-audio-region-item').eq(2).should('have.class', 'cvat-audio-region-item-active');

            cy.realPress('Tab');
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');

            cy.realPress(['Shift', 'Tab']);
            cy.get('.cvat-audio-region-item').eq(2).should('have.class', 'cvat-audio-region-item-active');
        });

        it('Selects the Core-chosen interval when visible regions overlap', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 300);
            cy.audioCreateRegionViaButton(secondLabelName, 200, 400);
            cy.get('.cvat-audio-region-item').should('have.length', 2);

            cy.clickRegionOnWaveform(280);

            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-region-item').eq(1).should('not.have.class', 'cvat-audio-region-item-active');
        });

        it('Drags the Core-chosen interval when it is fully covered by a later created interval', () => {
            const getRegionBoundaries = () => cy.getAudioRegion().should('have.length', 2).then(($regions) => (
                Array.from($regions, (region) => ({
                    left: Number.parseFloat(region.style.left),
                    rightInset: Number.parseFloat(region.style.right),
                }))
            ));

            cy.audioCreateRegionViaButton(firstLabelName, 200, 300);
            cy.audioCreateRegionViaButton(secondLabelName, 100, 400);
            getRegionBoundaries().then((before) => {
                cy.getAudioWaveformViewport().then(($viewport) => {
                    const yOffset = $viewport[0].getBoundingClientRect().height / 2;
                    cy.wrap($viewport).realMouseMove(250, yOffset);
                    cy.wrap($viewport).realMouseDown({
                        position: { x: 250, y: yOffset },
                        button: 'left',
                    });
                    cy.wrap($viewport).realMouseMove(300, yOffset);
                    cy.wrap($viewport).realMouseUp({ button: 'left' });
                });

                getRegionBoundaries().should((after) => {
                    expect(after[0].left).to.be.greaterThan(before[0].left);
                    expect(after[0].rightInset).to.be.lessThan(before[0].rightInset);
                    expect(after[1]).to.deep.equal(before[1]);
                });
            });
        });
    });
});
