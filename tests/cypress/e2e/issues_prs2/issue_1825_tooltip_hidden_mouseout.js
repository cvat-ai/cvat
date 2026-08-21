// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Tooltip does not interfere with interaction with elements.', () => {
    const issueId = '1825';

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Mouseover to "Shape" button when draw new rectangle. The tooltip open.', () => {
            cy.get('.cvat-draw-rectangle-control').click();
            cy.get('.cvat-draw-shape-popover-content');
            cy.contains('Shape').invoke('show');
            cy.contains('Shape').trigger('mouseover', 'top');
            cy.contains('Shape').should('have.class', 'ant-tooltip-open');
        });
        it('The radio element was clicked successfully', () => {
            // Move away as a user would when selecting another drawing method.
            // The tooltip must then stop covering the radio group by itself.
            cy.contains('Shape').trigger('mouseout', 'top');
            cy.contains('By 4 Points').click();
        });
    });
});
