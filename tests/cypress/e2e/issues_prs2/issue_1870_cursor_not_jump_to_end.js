// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, textDefaultValue, attrName, labelName,
} from '../../support/const';

context(
    "Checks that the cursor doesn't automatically jump to the end of a word when the attribute value changes",
    () => {
        const issueId = '1870';
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
            it('Enter 2 characters in the middle of the word attribute value and check the result', () => {
                cy.createRectangle(createRectangleShape2Points);
                cy.get('#cvat-objects-sidebar-state-item-1').find('.ant-collapse-item').click();
                cy.get('.cvat-object-item-attribute-wrapper')
                    .contains(attrName)
                    .parents('.cvat-object-item-attribute-wrapper')
                    .within(() => {
                        cy.get('.cvat-object-item-text-attribute').type('{leftarrow}{leftarrow}ee');
                        cy.get('.cvat-object-item-text-attribute').should('have.value', textDefaultValue.replace('Text', 'Teeext'));
                    });
            });
        });
    },
);
