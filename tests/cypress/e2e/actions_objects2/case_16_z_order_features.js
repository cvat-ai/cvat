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
        cy.prepareUserSession();
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
            performZOrderAction('.cvat-object-item-menu-to-layer-background', '-1');
        });

        it('Move shape to next layer', () => {
            performZOrderAction('.cvat-object-item-menu-to-one-layer-forward', '0');
        });

        it('Move shape to previous layer', () => {
            performZOrderAction('.cvat-object-item-menu-to-one-layer-backward', '-1');
        });

        it('Send shape to foreground', () => {
            performZOrderAction('.cvat-object-item-menu-to-layer-foreground', '3');
        });
    });

    describe('Z-order layer sidebar actions', () => {
        before(() => {
            cy.sidebarItemSortBy('Z Order');
        });

        it('Shows z-order layers with draggable cards for non-tag objects', () => {
            cy.contains('.cvat-objects-sidebar-z-layers-title', 'Layer stack').should('exist');
            cy.get('.cvat-objects-sidebar-z-layer-mark').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1')
                .should('have.class', 'cvat-objects-sidebar-state-item-draggable');
        });

        it('Collapses and expands a single layer', () => {
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '3')
                .parents('.cvat-objects-sidebar-z-layer')
                .within(() => {
                    cy.get('.cvat-objects-sidebar-z-layer-collapse-button').click();
                    cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
                    cy.get('.cvat-objects-sidebar-z-layer-collapse-button').click();
                    cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
                });
        });

        it('Collapses and expands all layers', () => {
            cy.get('.cvat-objects-sidebar-z-layers-collapse-all-button').click();
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-2').should('not.exist');

            cy.get('.cvat-objects-sidebar-z-layers-collapse-all-button').click();
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-2').should('exist');
        });

        it('Moves a layer with shifting intervening layers', () => {
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '2')
                .parents('.cvat-objects-sidebar-z-layer')
                .prev('.cvat-objects-sidebar-z-layer-move-drop-area')
                .then(($dropArea) => {
                    const targetRect = $dropArea[0].getBoundingClientRect();

                    cy.contains('.cvat-objects-sidebar-z-layer-mark', '3')
                        .find('.cvat-objects-sidebar-z-layer-drag-handle')
                        .trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 1 });
                    cy.get('body').trigger('pointermove', {
                        clientX: targetRect.left + targetRect.width / 2,
                        clientY: targetRect.top + targetRect.height / 2,
                        button: 0,
                        isPrimary: true,
                        pointerId: 1,
                    });
                    cy.get('body').trigger('pointerup', { button: 0, isPrimary: true, pointerId: 1 });
                });

            cy.get('#cvat_canvas_shape_1').should('have.attr', 'data-z-order', '2');
            cy.get('#cvat_canvas_shape_2').should('have.attr', 'data-z-order', '3');
        });

        it('Merges one layer into another layer', () => {
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '2').then(($layer) => {
                const targetRect = $layer[0].getBoundingClientRect();

                cy.contains('.cvat-objects-sidebar-z-layer-mark', '3')
                    .find('.cvat-objects-sidebar-z-layer-drag-handle')
                    .trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 1 });
                cy.get('body').trigger('pointermove', {
                    clientX: targetRect.left + targetRect.width / 2,
                    clientY: targetRect.top + targetRect.height / 2,
                    button: 0,
                    isPrimary: true,
                    pointerId: 1,
                });
                cy.get('body').trigger('pointerup', { button: 0, isPrimary: true, pointerId: 1 });
            });

            cy.get('#cvat_canvas_shape_1').should('have.attr', 'data-z-order', '2');
            cy.get('#cvat_canvas_shape_2').should('have.attr', 'data-z-order', '2');
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '3').should('not.exist');
        });

        it('Moves an object to another layer by dragging it to a layer section', () => {
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '2').then(($layer) => {
                const targetRect = $layer[0].getBoundingClientRect();

                cy.get('#cvat-objects-sidebar-state-item-1')
                    .trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 1 });
                cy.get('body').trigger('pointermove', {
                    clientX: targetRect.left + targetRect.width / 2,
                    clientY: targetRect.top + targetRect.height / 2,
                    button: 0,
                    isPrimary: true,
                    pointerId: 1,
                });
                cy.get('body').trigger('pointerup', { button: 0, isPrimary: true, pointerId: 1 });
            });

            cy.get('#cvat_canvas_shape_1').should('have.attr', 'data-z-order', '2');
        });

        it('Compacts layers while preserving relative order', () => {
            cy.get('.cvat-objects-sidebar-z-layers-compact-button').click();
            cy.get('#cvat_canvas_shape_1').should('have.attr', 'data-z-order', '0');
            cy.get('#cvat_canvas_shape_2').should('have.attr', 'data-z-order', '0');
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '0').should('exist');
            cy.contains('.cvat-objects-sidebar-z-layer-mark', '2').should('not.exist');
        });

        it('Does not make tag cards draggable', () => {
            cy.createTag(labelName);
            cy.sidebarItemSortBy('Z Order');
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('not.have.class', 'cvat-objects-sidebar-state-item-draggable');
        });
    });
});
