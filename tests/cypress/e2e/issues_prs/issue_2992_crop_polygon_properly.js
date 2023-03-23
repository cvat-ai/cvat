// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Crop polygon properly.', () => {
    const issueId = '2992';

    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 200, y: 500 },
            { x: 200, y: 200 },
            { x: 10, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Draw a polygon with vertices outside the image', () => {
            cy.createPolygon(createPolygonShape);
            cy.get('.cvat-canvas-container').click(58, 238);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });
    });
});
