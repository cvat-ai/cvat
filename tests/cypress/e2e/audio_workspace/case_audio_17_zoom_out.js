// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Zoom out decreases zoom value.', () => {
    const caseId = 'audio_17';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('After zooming in, zooming out reduces the value badge', () => {
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 10);
            cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge').invoke('text').then((zoomedIn) => {
                cy.audioSliderSetValue('cvat-audio-zoom-control', '{uparrow}', 100);
                cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge')
                    .invoke('text').should('not.equal', zoomedIn).and('equal', 'x1');
            });
        });
    });
});
