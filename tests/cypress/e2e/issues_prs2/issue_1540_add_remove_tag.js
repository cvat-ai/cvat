// Copyright (C) 2020-2022 Intel Corporation
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
            cy.get('.cvat-add-tag-button').click({ force: true });
            cy.changeWorkspace('Standard');
        });
        it('Remove the tag', () => {
            const keyCodeDel = 46;
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'TAG');
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('keydown', { keyCode: keyCodeDel, code: 'Delete' });
        });
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong').should('not.exist');
        });
    });
});
