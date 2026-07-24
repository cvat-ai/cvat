// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

function ensureAndGetWaveform(wrapper) {
    const host = [...wrapper.querySelectorAll('*')].find((element) => (
        element.shadowRoot?.querySelector('[part~="regions-container"]')
    ));
    expect(host, 'WaveSurfer host').to.exist;

    const waveform = host.shadowRoot.querySelector('[part~="wrapper"]');
    expect(waveform, 'WaveSurfer waveform').to.exist;

    return { host, waveform };
}

function ensureAndGetWaveformParts(wrapper) {
    const { host, waveform } = ensureAndGetWaveform(wrapper);
    const region = host.shadowRoot.querySelector('[part~="region"]');
    expect(region, 'audio interval region').to.exist;

    return { waveform, region };
}

function expectRegionAtTrackEnd(region) {
    // WaveSurfer converts the drag delta from pixels to time and back. That
    // can leave a sub-pixel floating-point residue (for example, saw 1e-14%).
    expect(Number.parseFloat(region.style.right), 'region right offset').to.be.closeTo(0, 0.001);
}

function createIntervalAwayFromTrackEnd() {
    cy.get('.cvat-audio-waveform-wrapper').first().then(($wrapper) => {
        const { waveform } = ensureAndGetWaveform($wrapper[0]);
        const { width } = waveform.getBoundingClientRect();
        cy.audioCreateRegionViaButton(firstLabelName, width * 0.2, width * 0.4);
    });
    cy.get('.cvat-audio-region-item').should('have.length', 1);
    cy.get('.cvat-audio-waveform-wrapper').first().should(($wrapper) => {
        ensureAndGetWaveformParts($wrapper[0]);
    });
}

function dragTargetToTrackEnd(getRegionTarget, targetName) {
    cy.get('.cvat-audio-waveform-wrapper').first().should(($wrapper) => {
        const { region } = ensureAndGetWaveformParts($wrapper[0]);
        expect(region.style.cursor, 'region is draggable').to.equal('grab');
        expect(getRegionTarget(region), targetName).to.exist;
    }).then(($wrapper) => {
        const { waveform, region } = ensureAndGetWaveformParts($wrapper[0]);
        const target = getRegionTarget(region);

        const wrapperRect = $wrapper[0].getBoundingClientRect();
        const waveformRect = waveform.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const start = {
            x: targetRect.left - wrapperRect.left + (targetRect.width / 2),
            y: targetRect.top - wrapperRect.top + (targetRect.height / 2),
        };
        const trackEnd = {
            x: waveformRect.right - wrapperRect.left - 1,
            y: start.y,
        };

        cy.wrap($wrapper).realMouseDown({ position: start, button: 'left' });
        cy.wrap($wrapper).realMouseMove(trackEnd.x, trackEnd.y);
        cy.wrap($wrapper).realMouseUp({
            position: trackEnd,
            button: 'left',
        });
    });

    cy.get('.cvat-audio-waveform-wrapper').first().should(($wrapper) => {
        const { region } = ensureAndGetWaveformParts($wrapper[0]);
        expectRegionAtTrackEnd(region);
    });
}

function saveAndCheckAfterReload() {
    cy.intercept('PATCH', '/api/jobs/**/annotations**').as('saveAnnotations');
    cy.audioSaveAnnotations();
    cy.wait('@saveAnnotations').its('response.statusCode').should('equal', 200);
    cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');

    cy.reload();
    cy.assertWaveformReady();
    cy.get('.cvat-audio-region-item', { timeout: 15000 }).should('have.length', 1);
    cy.get('.cvat-audio-waveform-wrapper').first().should(($wrapper) => {
        const { region } = ensureAndGetWaveformParts($wrapper[0]);
        expectRegionAtTrackEnd(region);
    });
}

context('Audio annotation. Editing an interval to the track end persists.', () => {
    const caseId = 'audio_35';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Moves an interval to the end of the track and persists it after reload', () => {
            createIntervalAwayFromTrackEnd();
            cy.get('body').type('e');
            cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
            dragTargetToTrackEnd((region) => region, 'audio interval region');
            saveAndCheckAfterReload();
        });

        it('Resizes an interval end to the end of the track and persists it after reload', () => {
            createIntervalAwayFromTrackEnd();
            cy.get('body').type('e');
            cy.get('.cvat-audio-edit-region-control').should('have.class', 'cvat-active-canvas-control');
            dragTargetToTrackEnd((region) => (
                region.querySelector('[part~="region-handle-right"]')
            ), 'audio interval right resize handle');
            saveAndCheckAfterReload();
        });
    });
});
