// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('The highlighted attribute in AAM should correspond to the chosen attribute', () => {
    const issueId = '1425';
    let textValue = '';
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
        it('Create a object', () => {
            cy.createRectangle(createRectangleShape2Points);
        });
        it('Go to AAM', () => {
            cy.changeWorkspace('Attribute annotation', labelName);
        });
        it('Check if highlighted attribute correspond to the chosen attribute in right panel', () => {
            cy.get('.cvat_canvas_text').within(() => {
                cy.get('[style="fill: red;"]').then(($textValue) => {
                    textValue = $textValue.text().split(': ')[1];
                });
            });
            cy.get('.attribute-annotation-sidebar-attr-editor').within(() => {
                cy.get('[type="text"]').should('have.value', textValue);
            });
        });
        it('Go to next attribute and check again', () => {
            cy.get('.attribute-annotation-sidebar-attribute-switcher').find('.anticon-right').click({ force: true });
            cy.get('.cvat_canvas_text').within(() => {
                cy.get('[style="fill: red;"]').then(($textValue) => {
                    textValue = $textValue.text().split(': ')[1];
                });
            });
            cy.get('.attribute-annotation-sidebar-attr-editor').within(() => {
                cy.get('[type="text"]').should('have.value', textValue);
            });
        });
    });
});
