// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Appearance features', () => {
    const caseId = '14';
    let ariaValuenow = 0;
    const strokeColor = 'ff0000';
    let fill = '';
    let fillOpacity = '';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 350,
        secondX: 200,
        secondY: 450,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName,
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
        labelName,
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
        labelName,
        firstX: 450,
        firstY: 350,
        secondX: 550,
        secondY: 450,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName,
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
            cy.get('#cvat_canvas_shape_1').then(($rectangleShape) => {
                fill = $rectangleShape.css('fill');
                fillOpacity = $rectangleShape.css('fill-opacity');
            });
            cy.createPolygon(createPolygonShape);
            cy.createPolyline(createPolylinesShape);
            cy.createCuboid(createCuboidShape2Points);
            cy.createPoint(createPointsShape);
        });

        it('Set opacity level for shapes to 100. All shapes are filled.', () => {
            cy.get('.cvat-appearance-opacity-slider').click('right');
            cy.get('.cvat-appearance-opacity-slider')
                .within(() => {
                    cy.get('[role="slider"]')
                        .should('have.attr', 'aria-valuemax')
                        .then(($ariaValuemax) => {
                            ariaValuenow = $ariaValuemax;
                            cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', ariaValuenow);
                        });
                });
            cy.get('.cvat_canvas_shape').each((object) => {
                cy.get(object).then((obj) => {
                    const clientID = obj.attr('clientID');
                    cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).then((sidebarObj) => {
                        const text = sidebarObj.text();
                        if (text.includes('POLYLINE') || text.includes('POINTS')) {
                            expect(Number(object.attr('fill-opacity'))).to.be.lt(Number(fillOpacity)); // expected 0 to be below 0.03
                        } else {
                            expect(Number(object.attr('fill-opacity'))).to.be.gt(Number(fillOpacity)); // expected 1 to be above 0.03
                        }
                    });
                });
            });
        });

        it('Set "Selected opacity" to 0.', () => {
            cy.get('.cvat-appearance-selected-opacity-slider').click('left');
            cy.get('.cvat-appearance-selected-opacity-slider').within(() => {
                cy.get('[role="slider"]')
                    .should('have.attr', 'aria-valuemin')
                    .then(($ariaValuemin) => {
                        ariaValuenow = $ariaValuemin;
                        cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', ariaValuenow);
                    });
            });
        });

        it('Activate the rectangle, the polygon and the cuboid. Shapes are transparent during activated.', () => {
            for (const i of ['#cvat_canvas_shape_1', '#cvat_canvas_shape_2', '#cvat_canvas_shape_4']) {
                cy.get(i).trigger('mousemove');
                cy.get(i)
                    .should('have.class', 'cvat_canvas_shape_activated')
                    .and('have.css', 'fill-opacity', ariaValuenow);
            }
        });

        it('Activate checkbox "show projections". Activated the cuboid. Projection lines are visible.', () => {
            cy.get('.cvat-appearance-cuboid-projections-checkbox').click();
            cy.get('#cvat_canvas_shape_4').trigger('mousemove', { force: true });
            cy.get('#cvat_canvas_shape_4').should('have.attr', 'projections', 'true');
            cy.get('.cvat_canvas_cuboid_projections').should('be.visible');
            // Deactivate all objects
            cy.get('.cvat-canvas-container').click(500, 500);
        });

        it('Activate checkbox "outlined borders" with a red color. The borders are red on the objects.', () => {
            cy.get('.cvat-appearance-outlinded-borders-checkbox').click();
            cy.get('.cvat-appearance-outlined-borders-button').click();
            cy.changeColorViaBadge(strokeColor);
            cy.get('.cvat-label-color-picker').should('be.hidden');
            cy.get('.cvat_canvas_shape').each((object) => {
                cy.get(object).should('have.attr', 'stroke', `#${strokeColor}`);
            });
        });

        it('Set "Color by" to instance. The shapes changed a color.', () => {
            cy.changeAppearance('Instance');
            cy.get('.cvat_canvas_shape').each((object) => {
                cy.get(object).should('have.css', 'fill').and('not.equal', fill);
            });
        });

        it('Set "Color by" to group. The shapes are white.', () => {
            cy.changeAppearance('Group');
            cy.get('.cvat_canvas_shape').each((object) => {
                cy.get(object).then((obj) => {
                    const clientID = obj.attr('clientID');
                    cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).then((sidebarObj) => {
                        const text = sidebarObj.text();
                        if (!(text.includes('POLYLINE') || text.includes('POINTS'))) {
                            expect(object.css('fill')).to.be.equal('rgb(224, 224, 224)'); // expected rgb(224, 224, 224) to equal rgb(224, 224, 224)
                        }
                    });
                });
            });

            // Disable "Outlined borders" and check css "stroke" for polyline.
            cy.get('.cvat-appearance-outlinded-borders-checkbox').click();
            cy.get('#cvat_canvas_shape_3').should('have.css', 'stroke', 'rgb(224, 224, 224)'); // have CSS property stroke with the value rgb(224, 224, 224)
        });

        it('"Selected opacity" slider now defines opacity level of shapes being drawn.', () => {
            function testDrawShapeCheckOpacity({
                shape,
                drawingMethod,
                shapeType,
                fillOpacityBefore,
                fillOpacityAfter,
                opacityBefore,
                opacityAfter,
            }) {
                cy.interactControlButton(`draw-${shape}`);
                cy.get(`.cvat-draw-${shape}-popover`).within(() => {
                    if (drawingMethod) {
                        cy.contains('.ant-radio-wrapper', drawingMethod).click();
                    }
                    cy.contains('button', shapeType).click();
                });
                cy.get('.cvat-canvas-container').click(100, 450);
                if (fillOpacityBefore != null || fillOpacityAfter != null) {
                    cy.get('.cvat-appearance-selected-opacity-slider').click('left');
                    cy.get('.cvat_canvas_shape_drawing').should('have.attr', 'fill-opacity', fillOpacityBefore);
                    cy.get('.cvat-appearance-selected-opacity-slider').click('right');
                    cy.get('.cvat_canvas_shape_drawing').should('have.attr', 'fill-opacity', fillOpacityAfter);
                } else if (opacityBefore != null || opacityAfter != null) {
                    cy.get('.cvat-appearance-selected-opacity-slider').click('left');
                    cy.get('.cvat_canvas_shape_drawing').should('have.attr', 'opacity', opacityBefore);
                    cy.get('.cvat-appearance-selected-opacity-slider').click('right');
                    cy.get('.cvat_canvas_shape_drawing').should('have.attr', 'opacity', opacityAfter);
                } else {
                    cy.get('.cvat_canvas_shape_drawing').should('not.have.attr', 'opacity');
                    cy.get('.cvat_canvas_shape_drawing').should('not.have.attr', 'fill-opacity');
                }
                cy.get('body').type('{Esc}');
            }
            // affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'rectangle',
                drawingMethod: 'By 2 Points',
                shapeType: 'Shape',
                fillOpacityBefore: 0,
                fillOpacityAfter: 1,
            });
            // not affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'rectangle',
                drawingMethod: 'By 4 Points',
                shapeType: 'Shape',
                opacityBefore: 0,
                opacityAfter: 0,
            });
            // not affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'polyline',
                shapeType: 'Shape',
                fillOpacityBefore: 0,
                fillOpacityAfter: 0,
            });
            // affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'polygon',
                shapeType: 'Shape',
                fillOpacityBefore: 0,
                fillOpacityAfter: 1,
            });
            // not affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'points',
                shapeType: 'Shape',
                opacityBefore: 0,
                opacityAfter: 0,
            });
            // affect opacity level
            testDrawShapeCheckOpacity({
                shape: 'cuboid',
                drawingMethod: 'From rectangle',
                shapeType: 'Shape',
                fillOpacityBefore: 0,
                fillOpacityAfter: 1,
            });
            // not have 'fill-opacity' or 'opacity' attributes
            testDrawShapeCheckOpacity({
                shape: 'cuboid',
                drawingMethod: 'By 4 Points',
                shapeType: 'Shape',
            });
        });
    });
});
