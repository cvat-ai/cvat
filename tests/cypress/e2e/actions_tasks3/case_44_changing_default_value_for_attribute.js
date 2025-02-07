// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Changing a default value for an attribute.', () => {
    const caseId = '44';
    const additionalLabel = `Case ${caseId}`;
    const additionalAttrsLabel = [
        { name: 'type', values: '', type: 'Text' },
        { name: 'count', values: '0;5;1', type: 'Number' }, // Check issue 2968
        { name: 'shape', values: 'False', type: 'Checkbox' },
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
    const wrapperId = [];

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}", issue 2968`, () => {
        it('Add a label, add text (leave its value empty by default) & checkbox attributes.', () => {
            cy.intercept('PATCH', '/api/tasks/**').as('patchTask');
            cy.addNewLabel({ name: additionalLabel }, additionalAttrsLabel);
            cy.wait('@patchTask').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-constructor-viewer').should('exist').and('be.visible');
        });

        it('Open label editor. Change default values for text & checkbox attributes, press Done.', () => {
            cy.intercept('PATCH', '/api/labels/**').as('patchLabel');
            cy.get('.cvat-constructor-viewer').within(() => {
                // eslint-disable-next-line security/detect-non-literal-regexp
                cy.contains(new RegExp(`^${additionalLabel}$`))
                    .parents('.cvat-constructor-viewer-item')
                    .should('be.visible')
                    .find('[aria-label="edit"]')
                    .should('be.visible')
                    .click();
            });

            cy.get('.cvat-label-constructor-updater').within(() => {
                cy.get('.cvat-attribute-inputs-wrapper').then((wrapper) => {
                    for (let i = 0; i < wrapper.length; i++) {
                        wrapperId.push(wrapper[i].getAttribute('cvat-attribute-id'));
                    }
                    const minId = Math.min(...wrapperId);
                    const maxId = Math.max(...wrapperId);
                    cy.get(`[cvat-attribute-id="${minId}"]`).find('.cvat-attribute-values-input').type(newTextValue);
                    cy.get(`[cvat-attribute-id="${maxId}"]`).find('.cvat-attribute-values-input').click();
                });
            });
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').within(() => {
                // eslint-disable-next-line security/detect-non-literal-regexp
                cy.contains(new RegExp(`^${newCheckboxValue}$`)).click();
            });
            cy.contains('[type="submit"]', 'Done').click();
            cy.wait('@patchLabel').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-constructor-viewer').should('exist').and('be.visible');
        });

        it('Open a job, create an object. Attribute values are correct.', () => {
            cy.openJob();
            cy.createRectangle(rectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            [
                [additionalAttrsLabel[0].name, newTextValue],
                [additionalAttrsLabel[1].name, additionalAttrsLabel[1].values.split(';')[0]],
                [additionalAttrsLabel[2].name, newCheckboxValue.toLowerCase()],
            ].forEach(([attrName, attrValue]) => {
                // eslint-disable-next-line security/detect-non-literal-regexp
                cy.contains(new RegExp(`^${attrName}: ${attrValue}$`)).should('be.visible');
            });
        });
    });
});
