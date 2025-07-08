// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Search frame by filename', () => {
    const taskName = 'Search frame by filename';
    const labelName = 'search_frame_label';
    const imagesCount = 12;
    const serverFiles = ['archive.zip'];
    const fileIndices = Cypress._.range(1, imagesCount + 1);
    const padValue = (val) => val.toString().padStart(2, '0');
    const allFilenames = fileIndices.map(
        (val) => `archive/${padValue(val)}.jpg`,
    );

    let taskId = null;
    let jobId = null;

    function filenamesThatContain(input) {
        return allFilenames.filter((name) => name.search(input) !== -1);
    }
    function checkFrameSearchResults(expectedResults, allNames) {
        const expectedCount = expectedResults.length;
        return cy.then(() => {
            const actualIndicesWrapped = [];
            const actualNamesWrapped = [];
            return cy.get('.ant-select-dropdown')
                .should('be.visible')
                .and('not.have.class', 'ant-slide-up')
                .then(() => {
                    for (let i = 0; i <= expectedCount; i++) {
                        cy.realPress('ArrowDown');
                        cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                            const split = text.split(' ');
                            assert(split.length === 2);
                            const [frameIdRaw, frameFilename] = split;
                            const frameId = parseInt(frameIdRaw.replace('#', ''), 10);
                            actualIndicesWrapped.push(frameId);
                            actualNamesWrapped.push(frameFilename);
                        });
                    }
                }).then(() => {
                // Check that we wrapped the list correctly and found the first filename again
                    cy.wrap(actualNamesWrapped[expectedCount]).should('equal', expectedResults[0]);
                    const actualNames = actualNamesWrapped.slice(0, actualNamesWrapped.length - 1);
                    const actualIndices = actualIndicesWrapped.slice(0, actualIndicesWrapped.length - 1);

                    cy.wrap(actualNames).each((actualName, i) => {
                        cy.wrap(actualName).should('equal', expectedResults[i]);
                    });
                    cy.wrap(actualIndices).each((actualFrameId, i) => {
                        cy.wrap(allNames[actualFrameId]).should('equal', expectedResults[i]);
                    });
                });
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName, serverFiles, labelName,
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskID: tid, jobIDs: [jid] }) => {
            [taskId, jobId] = [tid, jid];
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        });
    });
    after(() => {
        cy.headlessDeleteTask(taskId);
    });
    describe('Open frame search modal, try to find frames', () => {
        it('search icon is visible, opens modal on click', () => {
            cy.get('.cvat-player-search-frame-name-icon').should('be.visible').click();
            cy.get('.cvat-frame-search-modal').should('be.visible')
                .find('input')
                .should('be.visible')
                .should('be.focused');
        });

        describe('With more context, search results should change dynamically', () => {
            const input1 = '3';
            const input2 = '12';

            it(`type ${input1}, search ${input1}`, () => {
                const expectedFilenames = filenamesThatContain(input1);

                cy.get('.cvat-frame-search-modal').find('input').type(input1);
                cy.get('.cvat-frame-search-item').should('have.length', expectedFilenames.length);

                cy.get('.cvat-frame-search-modal').find('input').clear();
                cy.get('.cvat-frame-search-modal').should('contain', 'Type to search');
            });

            it(`type ${input2}, search ${input2}`, () => {
                const expectedFilenames = filenamesThatContain(input2);

                cy.get('.cvat-frame-search-modal').find('input').type(input2);
                cy.get('.cvat-frame-search-item').should('have.length', expectedFilenames.length);

                cy.get('.cvat-frame-search-modal').find('input').clear();
                cy.get('.cvat-frame-search-modal').should('contain', 'Type to search');
            });
        });

        it('search for present frames, scroll through', () => {
            const input = '0';
            const expectedFilenames = filenamesThatContain(input);

            cy.get('.cvat-frame-search-modal').find('input')
                .should('be.focused').type(input);
            cy.contains(expectedFilenames[0]).then(() => {
                checkFrameSearchResults(expectedFilenames, allFilenames);
            });
            // After clearing the input, modal should stay
            cy.get('.cvat-frame-search-modal').find('input').clear();
            cy.get('.cvat-frame-search-modal').should('be.visible')
                .find('input').should('be.visible');
        });

        it("negative search, modal shows 'No frames found", () => {
            cy.get('.cvat-frame-search-modal').find('input').type('N');
            cy.contains('No frames found').should('exist');
            cy.get('.cvat-frame-search-modal').find('input').clear();
            cy.contains('No frames found').should('not.exist');
        });
    });
});
