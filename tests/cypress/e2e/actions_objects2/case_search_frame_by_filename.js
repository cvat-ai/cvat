// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, imagesCount } from '../../support/const';

Cypress.automation('remote:debugger:protocol', {
    command: 'Browser.grantPermissions',
    params: {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: window.location.origin,
    },
});

context('Search frame by filename', () => {
    // const fileIndices = [...Array(imagesCount).keys()];
    // const expectedFilenames = fileIndices.map((val) => `${taskName}_${val}`);

    // function checkSearchResultsLength(input, expectedCount) {
    //     cy.get('cvat-frame-search-modal').find('input').type(input); // -> 50
    //     cy.get('cvat-frame-search-item').should('be.visible')
    //         .and('have.length', expectedCount);
    // } // TODO: check filenames in search results

    before(() => {
        cy.openTaskJob(taskName);
    });
    // NOTE: on negative search, shows 'No frames found'
    describe('Open frame search modal, try to find frames', () => {
        it('looking glass icon is visible, opens modal on click', () => {
            cy.get('cvat-player-search-frame-name-icon').should('be.visible').click();
            cy.get('cvat-frame-search-modal').should('be.visible')
                .its('input').should('be.visible');
            cy.get('ant-select-dropdown').should('exist').and('be.hidden');
        });
    });
});
