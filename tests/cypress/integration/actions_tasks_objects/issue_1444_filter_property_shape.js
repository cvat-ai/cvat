// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Filter property "shape" work correctly', () => {
    const issueId = '1444';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 300, y: 100 },
            { x: 400, y: 400 },
            { x: 400, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a rectangle shape', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'RECTANGLE SHAPE');
        });
        it('Create a polygon', () => {
            cy.createPolygon(createPolygonShape);
            cy.get('#cvat-objects-sidebar-state-item-2').should('contain', '2').and('contain', 'POLYGON SHAPE');
        });
        it('Input filter "shape == "polygon""', () => {
            cy.get('.cvat-annotations-filters-input').type('shape == "polygon"{Enter}');
        });
        it('Only polygon is visible', () => {
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
        });
    });
});
