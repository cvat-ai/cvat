// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on polygon', () => {
    const caseId = '16';
    let zLayer = 0;
    const createPolygonShapeFirst = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 340, y: 200 },
            { x: 590, y: 200 },
            { x: 590, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolygonShapeSecond = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 190, y: 210 },
            { x: 440, y: 210 },
            { x: 440, y: 460 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a first polygon shape', () => {
            cy.createPolygon(createPolygonShapeFirst);
        });

        it('Increase z-layer with a special switcher', () => {
            cy.get('.cvat-canvas-z-axis-wrapper').within(() => {
                cy.get('[role="slider"]')
                    .should('have.attr', 'aria-valuenow')
                    .then(($zLayer) => {
                        zLayer = Number($zLayer);
                    });
                cy.get('span[aria-label="plus-circle"]').click();
                cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', zLayer + 1);
            });
        });

        it('Create a second polygon shape', () => {
            cy.createPolygon(createPolygonShapeSecond);
        });

        it('Deactivate all objects', () => {
            cy.get('.cvat-canvas-container').click();
        });

        it('Second shape is over the first shape', () => {
            // The larger the index of an element in the array the closer it is to us
            cy.get('.cvat_canvas_shape').then(($canvasShape) => {
                expect(Number($canvasShape[1].id.match(/\d+$/))).to.be.equal(2);
            });
        });

        it('Activate first shape', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mousemove');
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });

        it('First shape is over the second shape', () => {
            // The larger the index of an element in the array the closer it is to us
            cy.get('.cvat_canvas_shape').then(($canvasShape) => {
                expect(Number($canvasShape[1].id.match(/\d+$/))).to.be.equal(1);
                assert.isAbove(
                    Number($canvasShape.eq(-1).attr('fill-opacity')),
                    Number($canvasShape.eq(0).attr('fill-opacity')),
                );
            });
        });

        it('Deactivate all objects', () => {
            cy.get('.cvat-canvas-container').click();
        });

        it('Switch z-layer slider to zero position', () => {
            cy.get('.cvat-canvas-z-axis-wrapper').within(() => {
                cy.get('[role="slider"]').parent().click('top');
                cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', zLayer);
            });
        });

        it('Second shape is invisible', () => {
            cy.get('#cvat_canvas_shape_2').should('not.exist');
        });

        it('Increase z-layer with a special switcher', () => {
            cy.get('.cvat-canvas-z-axis-wrapper').within(() => {
                cy.get('[role="slider"]')
                    .should('have.attr', 'aria-valuenow')
                    .then(($zLayer) => {
                        zLayer = Number($zLayer);
                    });
                cy.get('span[aria-label="plus-circle"]').click();
                cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', zLayer + 2);
            });
        });

        it('First and second shapes are visible', () => {
            cy.get('#cvat_canvas_shape_1').should('be.visible');
            cy.get('#cvat_canvas_shape_2').should('be.visible');
        });
    });

    describe('Z-order button actions', () => {
        const performZOrderAction = (actionSelector, expectedZOrder) => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-object-item-menu-button')
                .click();

            cy.get(actionSelector).click();

            cy.get('.cvat-canvas-z-axis-wrapper .ant-slider')
                .then(() => {
                    cy.get('.cvat-canvas-z-axis-wrapper .ant-slider')
                        .click('bottom', { force: true });
                });

            cy.get('#cvat_canvas_shape_1')
                .should('be.visible')
                .should('have.attr', 'data-z-order', expectedZOrder);
        };

        it('Send shape to background', () => {
            performZOrderAction('.cvat-object-item-menu-to-background', '-1');
        });

        it('Move shape to next layer', () => {
            performZOrderAction('.cvat-object-item-menu-move-to-next-layer', '0');
        });

        it('Move shape to previous layer', () => {
            performZOrderAction('.cvat-object-item-menu-move-to-previous-layer', '-1');
        });

        it('Send shape to foreground', () => {
            performZOrderAction('.cvat-object-item-menu-to-foreground', '3');
        });
    });
});
