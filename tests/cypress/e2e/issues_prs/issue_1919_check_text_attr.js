// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, textDefaultValue, attrName, labelName,
} from '../../support/const';

context('Check label attribute changes', () => {
    const issueId = '1919';
    const newLabelAttrValue = 'New attribute value';
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
        it('Open object menu', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').rightclick();
        });

        it('Open object menu details', () => {
            cy.get('.cvat-canvas-context-menu').contains('DETAILS').click();
        });

        it('Clear field of text attribute and write new value', () => {
            cy.get('.cvat-canvas-context-menu')
                .contains(attrName)
                .parents('.cvat-object-item-attribute-wrapper')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute').should('have.value', textDefaultValue).clear();
                    cy.get('.cvat-object-item-text-attribute').type(newLabelAttrValue);
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

        it('Specify many lines for a text attribute, update the page and check values', () => {
            const multilineValue = 'This text attributes has many lines.\n - Line 1\n - Line 2';
            cy.get('.cvat-canvas-context-menu')
                .contains(attrName)
                .parents('.cvat-object-item-attribute-wrapper')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute').clear();
                    cy.get('.cvat-object-item-text-attribute').type(multilineValue);
                });
            cy.saveJob();
            cy.reload();
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-1')
                .contains('DETAILS').click();
            cy.get('#cvat-objects-sidebar-state-item-1')
                .contains(attrName)
                .parents('.cvat-object-item-attribute-wrapper')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute').should('have.value', multilineValue);
                });
        });
    });
});
