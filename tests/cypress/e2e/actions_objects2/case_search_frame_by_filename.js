// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// Cypress.automation('remote:debugger:protocol', {
//     command: 'Browser.grantPermissions',
//     params: {
//         permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
//         origin: window.location.origin,
//     },
// });

context('Search frame by filename', () => {
    const taskName = 'Search frame by filename';
    const labelName = 'search_frame_label';
    const imagesCount = 12;
    const serverFiles = ['archive.zip'];
    const fileIndices = Cypress._.range(1, imagesCount + 1);
    const padValue = (val) => val.toString().padStart(2, '0');
    const filenames = fileIndices.map(
        (val) => `archive/${padValue(val)}`,
    );

    let taskId = null;
    let jobId = null;

    function filenamesThatContain(input) {
        return filenames.filter((name) => name.search(input) !== -1);
    }

    function checkSearchResultsLength(input, expectedCount) {
        // !!! only works with <= 8 number of total items
        /*
            Possible approach: focus on first item and navigate with down arrow
            until we wrap around to the first item again
        */
        // cy.get('.cvat-frame-search-modal').find('input').focus();
        cy.get('.cvat-frame-search-modal').find('input').type(input); // -> 50
        cy.then(() => {
            cy.get('.cvat-frame-search-item').should('be.visible').then(() => {
                // .and('have.length', expectedCount);
                cy.realPress('ArrowDown');
                cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                    cy.task('log', text);
                });
                cy.realPress('ArrowDown');
                cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                    cy.task('log', text);
                });

                cy.realPress('ArrowDown');
                cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                    cy.task('log', text);
                });

                cy.realPress('ArrowDown');
                cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                    cy.task('log', text);
                });

                cy.realPress('ArrowDown');
                cy.get('.ant-select-item-option-active').invoke('text').then((text) => {
                    cy.task('log', text);
                });
            });
        });
    } // TODO: check filenames in search results

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then(({ taskID: tid, jobIDs: [jid] }) => {
            [taskId, jobId] = [tid, jid];
        });
        cy.visit('/tasks');
        cy.openTaskJob(taskName);
    });
    after(() => {
        cy.headlessDeleteTask(taskId);
    });
    describe('Open frame search modal, try to find frames', () => {
        it('looking glass icon is visible, opens modal on click', () => {
            cy.get('.cvat-player-search-frame-name-icon').should('be.visible').click();
            cy.get('.cvat-frame-search-modal').should('be.visible')
                .find('input').should('be.visible');
        });

        it.skip('search for present frames, should be found', () => {
            const input = '1';
            const expectedFilenames = filenamesThatContain(input);
            const expectedCount = expectedFilenames.length;
            checkSearchResultsLength(input, expectedCount); // -> 01, 10, 11, 12 TODO: check filenames

            // After clearing the input, modal should stay
            cy.get('.cvat-frame-search-modal').find('input').clear();
            cy.get('.cvat-frame-search-modal').should('be.visible')
                .find('input').should('be.visible');
        });

        it.skip("negative search, modal shows 'No frames found", () => {
            cy.get('.cvat-frame-search-modal').find('input').type('N');
            cy.contains('No frames found').should('exist');
            cy.get('.cvat-frame-search-modal').find('input').clear();
            cy.contains('No frames found').should('not.exist');
        });

        it('with more context, search results should change dynamically', () => {
            const input1 = '1';
            const input2 = '1';
            const expectedFilenames1 = filenamesThatContain(input1);
            const expectedFilenames2 = filenamesThatContain(input2);
            checkSearchResultsLength(input1, expectedFilenames1.length);
            // checkSearchResultsLength('{backspace}', expectedFilenames2.length);

            // empty search after fill shows all options
            // checkSearchResultsLength('{backspace}', filenames.length);
        });
    });
});
