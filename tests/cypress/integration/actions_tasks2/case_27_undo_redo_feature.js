// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Undo/redo feature', () => {
    const caseId = '27';
    const firstRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 100,
        firstY: 100,
        secondX: 150,
        secondY: 150,
    };
    const secondRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 150,
        firstY: 150,
        secondX: 200,
        secondY: 200,
    };
    const thirdRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 200,
        firstY: 200,
        secondX: 250,
        secondY: 250,
    };

    function checkExistObject(stateFirstObject, stateSecondObject, stateThirdObject) {
        // check objects on background
        cy.get('#cvat_canvas_shape_1').should(stateFirstObject);
        cy.get('#cvat_canvas_shape_2').should(stateSecondObject);
        cy.get('#cvat_canvas_shape_3').should(stateThirdObject);
        // check objects on sidebar
        cy.get('#cvat-objects-sidebar-state-item-1').should(stateFirstObject);
        cy.get('#cvat-objects-sidebar-state-item-2').should(stateSecondObject);
        cy.get('#cvat-objects-sidebar-state-item-3').should(stateThirdObject);
    };

    before(() => {
        cy.openTaskJob(taskName);

        // create objects
        cy.createRectangle(firstRectangleShape2Points);
        cy.createRectangle(secondRectangleShape2Points);
        cy.createRectangle(thirdRectangleShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Undo objects', () => {
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            checkExistObject('exist', 'exist', 'not.exist');

            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            checkExistObject('exist', 'not.exist', 'not.exist');

            cy.get('body').type('{ctrl}{z}');
            checkExistObject('not.exist', 'not.exist', 'not.exist');
        });

        it('Redo objects', () => {
            cy.contains('.cvat-annotation-header-button', 'Redo').click();
            checkExistObject('exist', 'not.exist', 'not.exist');

            cy.get('body').type('{ctrl}{shift}{z}');
            checkExistObject('exist', 'exist', 'not.exist');

            cy.get('body').type('{ctrl}{y}');
            checkExistObject('exist', 'exist', 'exist');
        });
    });
});
