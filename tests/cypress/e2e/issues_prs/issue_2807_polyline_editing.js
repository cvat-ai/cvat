// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('After draw correcting line and press the latest drawn point then it closes editing mode.', () => {
    const issueId = '2807';
    const createPolylinesShapePoints = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 400 },
            { x: 600, y: 250 },
            { x: 800, y: 300 },
        ],
        numberOfPoints: 3,
    };
    const svgJsCircle = [];
    const svgJsCircleAfterCorrection = [];

    function getCircleAndWriteToArr(array) {
        cy.get('circle').then((circle) => {
            for (let i = 0; i < circle.length; i++) {
                if (circle[i].id.match(/^SvgjsCircle\d+$/)) {
                    array.push(circle[i]);
                }
            }
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createPolyline(createPolylinesShapePoints);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Draw correcting line', () => {
            cy.get('.cvat-canvas-container').trigger('mousemove', 600, 250);
            cy.get('.cvat-canvas-container').trigger('mouseover', 600, 250);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            getCircleAndWriteToArr(svgJsCircle); // Getting a list of "SvgjsCircleNNNN" objects
            cy.get('.cvat-canvas-container').click(600, 250, { shiftKey: true }); // Activate editing move
            // There is no "cvat_canvas_shape_activated" class during the activated change mode
            cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 250);
            cy.get('.cvat-canvas-container').click(500, 250);
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 240);
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 250);
            cy.get('.cvat-canvas-container').click(500, 250);
            getCircleAndWriteToArr(svgJsCircleAfterCorrection);
        });

        it('The count of the "circle" objects after the correction is the same.', () => {
            // There is "cvat_canvas_shape_activated" class during the disabled change mode.
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            // The number of "SvgjsCircleNNNN" objects remained the same
            expect(svgJsCircle.length).to.be.equal(svgJsCircleAfterCorrection.length); // expected 3 to equal 3
        });
    });
});
