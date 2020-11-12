// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Appearance features', () => {
    const caseId = '14';
    let ariaValuenow = 0;
    const strokeColor = 'ff0000';
    let fill = '';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 100,
        firstY: 350,
        secondX: 200,
        secondY: 450,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 250, y: 350 },
            { x: 300, y: 300 },
            { x: 300, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 350, y: 350 },
            { x: 400, y: 300 },
            { x: 400, y: 450 },
            { x: 350, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        switchLabel: false,
        firstX: 450,
        firstY: 350,
        secondX: 550,
        secondY: 450,
    };
    const createPointsShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [{ x: 650, y: 350 }],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a rectangle, a polygon, a polyline, a cuboid and points.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').should('have.attr', 'fill').then($fill => {
                fill = $fill;
            });
            cy.createPolygon(createPolygonShape);
            cy.createPolyline(createPolylinesShape);
            cy.createCuboid(createCuboidShape2Points);
            cy.createPoint(createPointsShape);
        });
        it('Set opacity level for shapes to 100. All shapes are filled.', () => {
            cy.get('.cvat-objects-appearance-content').within(() => {
                cy.contains('Opacity').next().within(() => {
                    cy.get('.ant-slider-step').click('right');
                    cy.get('[role="slider"]').should('have.attr', 'aria-valuemax').then(($ariaValuemax) => {
                        ariaValuenow = $ariaValuemax;
                        cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', ariaValuenow);
                    });
                });
            });
            cy.get('.cvat_canvas_shape').each(object => {
                cy.get(object).should('have.prop', 'tagName').then($tagName => {
                    if ($tagName !== 'polyline') {
                        cy.get(object).should('have.css', 'fill-opacity', '1');
                    } else {
                        cy.get(object).should('have.css', 'fill-opacity', '0');
                    }
                });
            });
        });
        it('Set selected opacity to 0.', () => {
            cy.get('.cvat-objects-appearance-content').within(() => {
                cy.contains('Selected opacity').next().within(() => {
                    cy.get('.ant-slider-step').click('left');
                    cy.get('[role="slider"]').should('have.attr', 'aria-valuemin').then(($ariaValuemin) => {
                        ariaValuenow = $ariaValuemin;
                        cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', ariaValuenow);
                    });
                });
            });
        });
        it('Activate the box, the polygon and the cuboid. Boxes are transparent during activated.', () => {
            for (let i of ['#cvat_canvas_shape_1', '#cvat_canvas_shape_2', '#cvat_canvas_shape_4']) {
                cy.get(i).trigger('mousemove').should('have.class', 'cvat_canvas_shape_activated').and('have.css', 'fill-opacity', ariaValuenow);
            }
        });
        it('Activate checkbox "show projections".', () => {
            cy.contains('Show projections').click();
        });
        it('Activated the cuboid. Projection lines are visible.', () => {
            cy.get('#cvat_canvas_shape_4').trigger('mousemove', {force: true})
            .should('have.attr', 'projections', 'true');
            cy.get('.cvat_canvas_cuboid_projections').should('be.visible');
            // Deactivate all objects
            cy.get('.cvat-canvas-container').click();
        });
        it('Activate checkbox "outlined borders" with a red color. The borders are red on the objects.', () => {
            cy.get('.cvat-objects-appearance-content').within(() => {
                cy.contains('Outlined borders').click().within(() => {
                    cy.get('button').click();
                });
            });
            cy.get('.cvat-label-color-picker').within(() => {
                cy.contains('hex').prev().clear().type(strokeColor);
                cy.contains('Ok').click();
            });
            cy.get('.cvat_canvas_shape').each(object => {
                cy.get(object).should('have.attr', 'stroke', `#${strokeColor}`);
            });
        });
        it('Set "Color by" to instance. The shapes changed a color.', () => {
            cy.changeAppearance('Instance');
            cy.get('.cvat_canvas_shape').each(object => {
                cy.get(object).should('have.css', 'fill').and('not.equal', fill);
            });
        });
        it('Set "Color by" to group. The shapes are white.', () => {
            cy.changeAppearance('Group');
            cy.get('.cvat_canvas_shape').each(object => {
                cy.get(object).should('have.prop', 'tagName').then($tagName => {
                    if ($tagName !== 'polyline') {
                        cy.get(object).should('have.css', 'fill-opacity', '1').and('have.css', 'fill', 'rgb(224, 224, 224)');
                    } else {
                        cy.get(object).should('have.css', 'fill-opacity', '0');
                    }
                });
            });
        });
    });
});
