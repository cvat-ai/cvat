// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Tooltip does not interfere with interaction with elements.', () => {
    const issueId = '1825';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Mouseover to "Shape" button when draw new rectangle. The tooltip open.', () => {
            cy.get('.cvat-draw-rectangle-control').click();
            cy.get('.cvat-draw-shape-popover-content');
            cy.contains('Shape').invoke('show').trigger('mouseover', 'top').should('have.class', 'ant-tooltip-open');
        });
        it('The radio element was clicked successfully', () => {
            /*Before the fix, cypress can't click on the radio element
            due to its covered with the tooltip. After the fix, cypress
            successfully clicks on the element, but the tooltip does not
            disappear visually.*/
            cy.contains('By 4 Points').click();
        });
    });
});
