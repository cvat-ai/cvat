// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, textDefaultValue, attrName, labelName } from '../../support/const';

context('Check label attribute changes', () => {
    const issueId = '1919';
    const newLabelAttrValue = 'New attribute value';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open object menu', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').rightclick();
        });
        it('Open object menu details', () => {
            cy.get('.cvat-canvas-context-menu').contains('Details').click();
        });
        it('Clear field of text attribute and write new value', () => {
            cy.get('.cvat-canvas-context-menu')
                .contains(attrName)
                .parents('.cvat-object-item-attribute-wrapper')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute')
                        .should('have.value', textDefaultValue)
                        .clear()
                        .type(newLabelAttrValue);
                });
        });
        it('Check what value of right panel is changed too', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .contains(attrName)
                .parents('.cvat-object-item-attribute-wrapper')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute').should('have.value', newLabelAttrValue);
                });
        });
    });
});
