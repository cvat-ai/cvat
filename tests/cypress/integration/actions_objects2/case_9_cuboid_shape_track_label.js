// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on Cuboid', () => {
    const caseId = '9';
    const newLabelName = `New label for case ${caseId}`;
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createCuboidShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 350,
        thirdX: 500,
        thirdY: 450,
        fourthX: 400,
        fourthY: 450,
    };
    const createCuboidTrack2Points = {
        points: 'From rectangle',
        type: 'Track',
        labelName: labelName,
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY - 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY - 150,
    };
    const createCuboidTrack4Points = {
        points: 'By 4 Points',
        type: 'Track',
        labelName: labelName,
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY - 150,
        secondX: createCuboidShape4Points.secondX - 100,
        secondY: createCuboidShape4Points.secondY - 50,
        thirdX: createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY - 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY - 150,
    };
    const createCuboidShape2PointsNewLabel = {
        labelName: newLabelName,
        points: 'From rectangle',
        type: 'Shape',
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY + 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY + 150,
    };
    const createCuboidShape4PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 4 Points',
        type: 'Shape',
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY + 150,
        secondX: createCuboidShape4Points.secondX,
        secondY: createCuboidShape4Points.secondY + 150,
        thirdX: createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY + 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY + 150,
    };
    let svgJsPolygonId = [];
    let svgJsCircleId = [];

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabelName);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a Cuboid shape in two ways (From rectangle, by 4 points)', () => {
            cy.createCuboid(createCuboidShape2Points);
            cy.get('polygon').then(($polygon) => {
                for (let i = 0; i < $polygon.length; i++) {
                    if ($polygon[i].id.match(/^SvgjsPolygon\d+$/)) {
                        svgJsPolygonId.push($polygon[i].id);
                    }
                }
                // cy.get(`#${svgJsPolygonId[1]}`).invoke('attr', 'points').then(($svgjsPolygonPointsCoords) => {
                //     cy.log($svgjsPolygonPointsCoords.split(' '))
                // });
                // cy.get('.cvat-canvas-container').trigger('mousemove', 300, 400);
                // cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated')
                // cy.get('.cvat-canvas-container').trigger('mouseenter').trigger('mousedown', 330, 400, {button: 0})
                // cy.get('text').should('have.class', 'cvat_canvas_hidden')
                // cy.get('.cvat-canvas-container').trigger('mousemove', 500, 500).click(500, 500);
            });
            cy.get('.cvat-canvas-container').trigger('mousemove', 300, 400);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated')
            cy.get('circle').then(($circle) => {
                for (let i = 0; i < $circle.length; i++) {
                    if ($circle[i].id.match(/^SvgjsCircle\d+$/)) {
                        svgJsCircleId.push($circle[i].id);
                    }
                }
            });
            cy.get('.cvat-canvas-container')
                .trigger('mouseenter', 360, 340)
                .trigger('mousedown', 360, 340, {button: 0})
                .trigger('mousemove', 360, 240)
                .trigger('mouseup', 360, 240)
                .trigger('mouseenter', 360, 340)
                .trigger('mousedown', 360, 340, {button: 0})
                .trigger('mousemove', 400, 340)
                .trigger('mouseup', 400, 340);
            // cy.createCuboid(createCuboidShape4Points);
        });
        // it('Draw a Cuboid track in two ways (From rectangle, by 4 points)', () => {
        //     cy.createCuboid(createCuboidTrack2Points);
        //     cy.createCuboid(createCuboidTrack4Points);
        // });
        // it('Draw a new Cuboid shape in two ways (From rectangle, by 4 points) with second label', () => {
        //     cy.createCuboid(createCuboidShape2PointsNewLabel);
        //     cy.createCuboid(createCuboidShape4PointsNewLabel);
        // });
    });
});
