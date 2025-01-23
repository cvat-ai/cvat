// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check if the new label reflects in the options', () => {
    const issueId = '1429';
    const newLabelName = `New ${labelName}`;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Return to task page using browser button "previous page"', () => {
            cy.go('back');
            cy.url().should('include', '/tasks').and('not.contain', '/jobs');
        });
        it('Add new label', () => {
            cy.addNewLabel({ name: newLabelName });
        });
        it('Open the job again', () => {
            cy.openJob();
        });
        it('Create a rectangle shape', () => {
            cy.createRectangle(createRectangleShape2Points);
        });
        it('Checking for the new label', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').find('.ant-select-selector').click();
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').should('contain', newLabelName);
        });
    });
});
