// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Changing a default value for an attribute.', () => {
    const caseId = '44';
    const additionalLabel = `Case ${caseId}`;
    const additionalAttrsLabel = [
        { additionalAttrName: 'type', additionalValue: '', typeAttribute: 'Text' },
        { additionalAttrName: 'shape', additionalValue: 'False', typeAttribute: 'Checkbox' },
    ];
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: additionalLabel,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };
    const newTextValue = `${additionalLabel} text`;
    const newCheckboxValue = 'True';
    let wrapperId = [];

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Add a label, add text (leave it’s value empty by default) & checkbox attributes.', () => {
            cy.intercept('PATCH', '/api/v1/tasks/**').as('patchTask');
            cy.intercept('GET', '/api/v1/tasks**').as('getTask');
            cy.addNewLabel(additionalLabel, additionalAttrsLabel);
            cy.wait('@patchTask').its('response.statusCode').should('equal', 200);
            cy.wait('@getTask').its('response.statusCode').should('equal', 200);
        });

        it('Open label editor. Change default values for text & checkbox attributes, press Done.', () => {
            cy.intercept('PATCH', '/api/v1/tasks/**').as('patchTask');
            cy.get('.cvat-constructor-viewer').within(() => {
                cy.contains(new RegExp(`^${additionalLabel}$`))
                    .parents('.cvat-constructor-viewer-item')
                    .find('[aria-label="edit"]')
                    .click({ force: true });
            });
            cy.get('.cvat-label-constructor-updater').within(() => {
                cy.get('.cvat-attribute-inputs-wrapper').then((wrapper) => {
                    for (let i = 0; i < wrapper.length; i++) {
                        wrapperId.push(wrapper[i].getAttribute('cvat-attribute-id'));
                    }
                    const minId = Math.min(...wrapperId);
                    const maxId = Math.max(...wrapperId);
                    cy.get(`[cvat-attribute-id="${minId}"]`).find('.cvat-attribute-values-input').type(newTextValue);
                    cy.task('log', `minId: ${minId}`);
                    cy.get(`[cvat-attribute-id="${maxId}"]`).find('.cvat-attribute-values-input').click().wait(500); // Wait for the dropdown menu to transition.
                    cy.task('log', `maxId: ${maxId}`);
                });
            });
            cy.get('.ant-select-dropdown').within(() => {
                cy.contains(new RegExp(`^${newCheckboxValue}$`)).click();
            });
            cy.contains('[type="submit"]', 'Done').click();
            cy.wait('@patchTask').its('response.statusCode').should('equal', 200);
        });

        it('Open a job, create an object. Attribute values are correct.', () => {
            cy.openJob();
            cy.createRectangle(rectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.contains(new RegExp(`^type: ${newTextValue}$`)).should('be.visible');
            cy.contains(new RegExp(`^shape: ${newCheckboxValue.toLowerCase()}$`)).should('be.visible');
        });
    });
});
