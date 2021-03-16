// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Autoborder feature.', () => {
    const caseId = '60';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    const createRectangleShape2PointsSec = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 600,
        firstY: 350,
        secondX: 700,
        secondY: 450,
    };

    const keyCodeN = 78;
    let rectangleSvgJsCircleId = [];
    let rectangleSvgJsCircleIdSecond = [];
    let polygonSvgJsCircleId = [];
    let polygonSvgJsCircleIdSecons = [];
    let polylineSvgJsCircleId = [];

    function collectCxCircleCoord(arrToPush) {
        cy.get('circle').then((circle) => {
            for (let i = 0; i < circle.length; i++) {
                if (circle[i].id.match(/^SvgjsCircle\d+$/)) {
                    cy.get(`#${circle[i].id}`)
                        .invoke('attr', 'cx')
                        .then(($circleCx) => {
                            arrToPush.push($circleCx);
                        });
                }
            }
        });
    }

    function checkAutoborderPointsCount(expextedCount) {
        cy.get('.cvat_canvas_autoborder_point')
            .should('exist')
            .and('be.visible')
            .then(($autoborderPoints) => {
                expect($autoborderPoints.length).to.be.equal(expextedCount);
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.createRectangle(createRectangleShape2PointsSec);
        // Collect the rectagle points coordinates
        cy.get('.cvat-canvas-container').trigger('mousemove', 450, 400);
        cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        collectCxCircleCoord(rectangleSvgJsCircleId);
        cy.get('.cvat-canvas-container').trigger('mousemove', 650, 400);
        cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_activated');
        collectCxCircleCoord(rectangleSvgJsCircleIdSecond);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Drawning a polygon with autoborder.', () => {
            cy.get('.cvat-draw-polygon-control').click();
            cy.get('.cvat-draw-polygon-popover-visible').find('[type="button"]').contains('Shape').click();
            cy.get('body').type('{Ctrl}');
            checkAutoborderPointsCount(8); // 8 points at the rectangles
            cy.get('.cvat-canvas-container').click(400, 350).click(450, 250).click(500, 350).click(500, 450); // Stop propagation
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');

            // Collect the polygon points coordinates
            cy.get('.cvat-canvas-container').trigger('mousemove', 450, 300);
            cy.get('#cvat_canvas_shape_3').should('have.class', 'cvat_canvas_shape_activated');
            collectCxCircleCoord(polygonSvgJsCircleId);
        });

        it('Start drawning a polyline with autobordering beetwen the two shapes.', () => {
            cy.get('.cvat-draw-polyline-control').click();
            cy.get('.cvat-draw-polyline-popover-visible').find('[type="button"]').contains('Shape').click();
            checkAutoborderPointsCount(12); // 8 points at the rectangles + 4 at the polygon
            cy.get('.cvat-canvas-container') // Drawning
                .click(600, 350)
                .click(700, 450)
                .click(400, 450)
                .click(550, 500)
                .click(600, 450)
                .click(600, 350);
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');

            // Collect the polygon points coordinates
            cy.get('.cvat-canvas-container').trigger('mousemove', 550, 350);
            cy.get('#cvat_canvas_shape_4').should('have.class', 'cvat_canvas_shape_activated');
            collectCxCircleCoord(polylineSvgJsCircleId);
        });

        it('Drawning a polygon with autoborder and dblclick to the second point.', () => {
            cy.get('.cvat-draw-polygon-control').click();
            cy.get('.cvat-draw-polygon-popover-visible').find('[type="button"]').contains('Shape').click();
            checkAutoborderPointsCount(17);
            cy.get('.cvat-canvas-container').click(600, 350).click(700, 350).click(650, 250);
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');

            // Collect the polygon points coordinates
            cy.get('.cvat-canvas-container').trigger('mousemove', 650, 300);
            cy.get('#cvat_canvas_shape_5').should('have.class', 'cvat_canvas_shape_activated');
            collectCxCircleCoord(polygonSvgJsCircleIdSecons);
        });

        it('Checking whether the coordinates of the contact points of the shapes match.', () => {
            expect(polygonSvgJsCircleId[0]).to.be.equal(rectangleSvgJsCircleId[0]); // The 1st point of the rect and the 1st polygon point
            expect(polygonSvgJsCircleId[2]).to.be.equal(rectangleSvgJsCircleId[1]); // The 2nd point of the rect and the 3rd polygon point
            expect(polygonSvgJsCircleIdSecons[1]).to.be.equal(rectangleSvgJsCircleIdSecond[1]); // The 2nd point of the 2nd polygon and the 2nd point 2nd rect
            expect(polylineSvgJsCircleId[1]).to.be.equal(rectangleSvgJsCircleId[3]); // The 2nd point of the polyline and the 4th point rect
            // cy.log(`rectangleSvgJsCircleId: ${rectangleSvgJsCircleId}`)
            // cy.log(`rectangleSvgJsCircleIdSecond: ${rectangleSvgJsCircleIdSecond}`)
            // cy.log(`polygonSvgJsCircleId: ${polygonSvgJsCircleId}`)
            // cy.log(`polygonSvgJsCircleIdSecons: ${polygonSvgJsCircleIdSecons}`)
            // cy.log(`polylineSvgJsCircleId: ${polylineSvgJsCircleId}`)
        });
    });
});
