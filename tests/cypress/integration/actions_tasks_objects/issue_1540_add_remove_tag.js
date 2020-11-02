// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if the UI not to crash after remove a tag', () => {
    const issueId = '1540';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Add a tag', () => {
            cy.changeWorkspace('Tag annotation');
            cy.get('.cvat-tag-annotation-sidebar-buttons').within(() => {
                cy.get('button').contains('Add tag').click({ force: true });
            });
            cy.changeWorkspace('Standard');
        });
        it('Remove the tag', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .should('contain', '1')
                .and('contain', 'TAG')
                .trigger('mouseover')
                .trigger('keydown', { key: 'Delete' });
        });
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong').should('not.exist');
        });
    });
});
