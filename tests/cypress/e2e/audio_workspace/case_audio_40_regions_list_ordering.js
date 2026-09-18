// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Regions list ordering.', () => {
    const caseId = 'audio_40';
    let firstIntervalId;
    let secondIntervalId;
    let thirdIntervalId;

    function createInterval(labelName, xStart, xEnd) {
        cy.audioCreateRegionViaButton(labelName, xStart, xEnd);
        return cy.get('.cvat-audio-region-item-active')
            .should('have.attr', 'data-interval-id')
            .then(Number);
    }

    function selectOrdering(ordering) {
        cy.get('.cvat-audio-regions-list-ordering-selector').click();
        cy.get('.ant-select-dropdown').filter(':visible')
            .contains('.ant-select-item-option', ordering)
            .click();
    }

    function assertIntervalsOrder(expectedIntervalIds) {
        cy.get('.cvat-audio-region-item').then(($items) => {
            const actualIntervalIds = Array.from($items, (item) => Number(item.dataset.intervalId));
            expect(actualIntervalIds).to.deep.equal(expectedIntervalIds);
        });
    }

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);

        // Creation order: first, second, third.
        // Start time: second, third, first. End time: third, second, first.
        // Duration: third, first, second. Label name: second, third, first.
        createInterval(secondLabelName, 380, 640).then((intervalId) => {
            firstIntervalId = intervalId;
        });
        createInterval(firstLabelName, 80, 480).then((intervalId) => {
            secondIntervalId = intervalId;
        });
        createInterval(firstLabelName, 180, 300).then((intervalId) => {
            thirdIntervalId = intervalId;
        });
    });

    after(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Orders regions by ID, start time, end time, duration, and label name', () => {
            const ascendingIds = [firstIntervalId, secondIntervalId, thirdIntervalId].sort((a, b) => a - b);

            selectOrdering('ID - ascent');
            assertIntervalsOrder(ascendingIds);

            selectOrdering('ID - descent');
            assertIntervalsOrder([...ascendingIds].reverse());

            selectOrdering('Start time');
            assertIntervalsOrder([secondIntervalId, thirdIntervalId, firstIntervalId]);

            selectOrdering('End time');
            assertIntervalsOrder([thirdIntervalId, secondIntervalId, firstIntervalId]);

            selectOrdering('Duration');
            assertIntervalsOrder([thirdIntervalId, firstIntervalId, secondIntervalId]);

            selectOrdering('Label name');
            assertIntervalsOrder([secondIntervalId, thirdIntervalId, firstIntervalId]);
        });
    });
});
