// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Search frame by filename on the task page', () => {
    const taskName = 'Search frame by filename task page';
    const labelName = 'search_frame_label';
    const imagesCount = 12;
    const serverFiles = ['archive.zip'];
    const fileIndices = Cypress._.range(1, imagesCount + 1);
    const padValue = (val) => val.toString().padStart(2, '0');
    const allFilenames = fileIndices.map((val) => `archive/${padValue(val)}.jpg`);

    function filenamesThatContain(input) {
        return allFilenames.filter((name) => name.includes(input));
    }

    let taskId = null;
    let jobId = null;

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName, serverFiles, labelName,
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: tid, jobIds: [jid] }) => {
            [taskId, jobId] = [tid, jid];
            cy.visit(`/tasks/${taskId}`);
            cy.get('.cvat-task-details').should('be.visible');
        });
    });

    after(() => {
        cy.headlessDeleteTask(taskId);
    });

    describe('Open the search modal from the task page and navigate to a frame', () => {
        beforeEach(() => {
            // Every test starts from the task page with the modal opened and empty.
            cy.visit(`/tasks/${taskId}`);
            cy.get('.cvat-task-details').should('be.visible');
            cy.get('.cvat-task-search-frame-button').should('be.visible').click();
            cy.get('.cvat-frame-search-modal').should('be.visible')
                .find('input')
                .should('be.visible')
                .should('be.focused');
        });

        it('search button opens the modal with a focused input', () => {
            // Assertions already covered by beforeEach; this documents the entry point.
            cy.get('.cvat-frame-search-modal').should('contain', 'Type to search');
        });

        it('typing a filename fragment lists the matching frames', () => {
            const input = '0';
            const expected = filenamesThatContain(input);

            cy.get('.cvat-frame-search-modal').find('input').type(input);
            cy.get('.cvat-frame-search-item').should('have.length', expected.length);
        });

        it('a filename that does not exist shows "No frames found"', () => {
            cy.get('.cvat-frame-search-modal').find('input').type('does-not-exist');
            cy.contains('No frames found').should('exist');
        });

        it('selecting a frame navigates to the job that contains it at the right frame', () => {
            // 05.jpg is the 5th image after lexicographical sorting, i.e. absolute frame 4.
            cy.get('.cvat-frame-search-modal').find('input').type('05.jpg');
            cy.get('.cvat-frame-search-item').should('have.length', 1);
            cy.realPress('ArrowDown');
            cy.realPress('Enter');
            cy.url().should('include', `/tasks/${taskId}/jobs/${jobId}?frame=4`);
        });
    });
});
