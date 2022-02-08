// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Object make a copy.', () => {
    const caseId = '37';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 100,
        secondX: 150,
        secondY: 150,
    };
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 200,
        firstY: 100,
        secondX: 250,
        secondY: 150,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 300, y: 100 },
            { x: 350, y: 100 },
            { x: 350, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 100 },
            { x: 450, y: 100 },
            { x: 450, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 500, y: 100 }],
        complete: true,
        numberOfPoints: null,
    };
    const createEllipseShape = {
        type: 'Shape',
        labelName,
        cx: 550,
        cy: 100,
        rightX: 600,
        topY: 150,
    };
    const countObject = 6;

    function checkObjectArrSize(expectedValueShape, expectedValueSidebar) {
        cy.get('.cvat_canvas_shape').then(($cvatCanvasShape) => {
            cy.get('.cvat-objects-sidebar-state-item').then(($cvatObjectsSidebarStateItem) => {
                expect($cvatCanvasShape.length).be.equal(expectedValueShape);
                expect($cvatObjectsSidebarStateItem.length).be.equal(expectedValueSidebar);
            });
        });
    }

    function compareObjectsAttr(object1, object2) {
        cy.get(object1).then(($cvatCanvasShape1) => {
            cy.get(object2).then(($cvatCanvasShape2) => {
                expect($cvatCanvasShape1.attr('stroke')).be.eq($cvatCanvasShape2.attr('stroke'));
                expect($cvatCanvasShape1.attr('fill')).be.eq($cvatCanvasShape2.attr('fill'));
            });
        });
    }

    function compareObjectsSidebarAttr(objectSidebar1, objectSidebar2) {
        cy.get(objectSidebar1).then(($cvatObjectsSidebarStateItem1) => {
            cy.get(objectSidebar2).then(($cvatObjectsSidebarStateItem2) => {
                // Check type of a shape
                expect($cvatObjectsSidebarStateItem1.text().match(/[a-zA-Z]+/)[0])
                    .be.eq($cvatObjectsSidebarStateItem2.text().match(/[a-zA-Z]+/)[0]);
                expect($cvatObjectsSidebarStateItem1.attr('style')).be.eq($cvatObjectsSidebarStateItem2.attr('style'));
            });
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
        cy.createCuboid(createCuboidShape2Points);
        cy.createPolygon(createPolygonShape);
        cy.createPolyline(createPolylinesShape);
        cy.createEllipse(createEllipseShape);
        cy.createPoint(createPointsShape);
        cy.createTag(labelName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Make a copy via sidebar.', () => {
            let coordX = 100;
            const coordY = 300;
            for (let id = 1; id < countObject + 2; id++) {
                cy.get(`#cvat-objects-sidebar-state-item-${id}`).within(() => {
                    cy.get('[aria-label="more"]').trigger('mouseover').wait(300); // Wait dropdown menu transition
                });
                // Get the last element from cvat-object-item-menu array
                cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Make a copy').click();
                cy.get('.cvat-canvas-container').click(coordX, coordY);
                cy.get('.cvat-canvas-container').click();
                coordX += 100;
            }
        });

        it('After copying via sidebar, the attributes of the objects are the same.', () => {
            checkObjectArrSize(12, 14);
            for (let id = 1; id < countObject; id++) {
                // Parameters id 1 equal patameters id 8, 2 to 9, etc.
                compareObjectsAttr(`#cvat_canvas_shape_${id}`, `#cvat_canvas_shape_${id + countObject + 1}`);
            }
            for (let idSidebar = 1; idSidebar < 7; idSidebar++) {
                compareObjectsSidebarAttr(
                    `#cvat-objects-sidebar-state-item-${idSidebar}`,
                    `#cvat-objects-sidebar-state-item-${idSidebar + countObject + 1}`,
                ); // Parameters sidebar id 1 equal patameters sidebar id 8, 2 to 9, etc.
            }
        });

        // Disabled part of the test for the Firefox browser due to possible problems
        // positioning the element and completing the trigger() construct for moving the mouse cursor over the element.
        it('Make a copy via object context menu.', { browser: '!firefox' }, () => {
            let coordX = 100;
            const coordY = 400;
            for (let id = 1; id < countObject; id++) {
                // Point doesn't have a context menu
                cy.get(`#cvat_canvas_shape_${id}`)
                    .trigger('mousemove', 'right')
                    .should('have.class', 'cvat_canvas_shape_activated')
                    .rightclick({ force: true });
                cy.get('.cvat-canvas-context-menu')
                    .last()
                    .should('be.visible')
                    .find('[aria-label="more"]')
                    .trigger('mouseover')
                    .wait(300); // Wait dropdown menu transition;
                // Get the last element from cvat-object-item-menu array
                cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Make a copy').click();
                cy.get('.cvat-canvas-container').click(coordX, coordY);
                cy.get('.cvat-canvas-container').click(); // Deactivate all objects and hide context menu
                coordX += 100;
            }
        });

        it(
            'After copying via object context menu, the attributes of the objects are the same.',
            { browser: '!firefox' },
            () => {
                checkObjectArrSize(17, 19); // The point and tag was not copied via the object's context menu
                for (let id = 1; id < countObject; id++) {
                    // Parameters id 1 equal patameters id 13, 2 to 14, etc.
                    compareObjectsAttr(`#cvat_canvas_shape_${id}`, `#cvat_canvas_shape_${id + countObject + 8}`);
                }
                for (let idSidebar = 1; idSidebar < 6; idSidebar++) {
                    compareObjectsSidebarAttr(
                        `#cvat-objects-sidebar-state-item-${idSidebar}`,
                        `#cvat-objects-sidebar-state-item-${idSidebar + countObject + 8}`,
                    ); // Parameters sidebar id 1 equal patameters sidebar id 15, 2 to 16, etc.
                }
            },
        );

        it('Copy a shape to an another frame.', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{ctrl}c');
            cy.get('.cvat-player-next-button').click();
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat-canvas-container').click();
            cy.get('.cvat-player-previous-button').click();
        });

        it('Copy a shape to an another frame after press "Ctrl+V" on the first frame.', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{ctrl}c');
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-canvas-container').click(300, 300);
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarItems) => {
                expect(sidebarItems.length).to.be.equal(2);
            });
        });

        it('Copy a shape with holding "Ctrl".', () => {
            const keyCodeC = 67;
            const keyCodeV = 86;
            cy.get('.cvat_canvas_shape')
                .first()
                .trigger('mousemove')
                .should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{ctrl}', { release: false }); // Hold
            cy.get('body')
                .trigger('keydown', { keyCode: keyCodeC, code: 'KeyC', ctrlKey: true })
                .trigger('keyup', { keyCode: keyCodeC, code: 'KeyC', ctrlKey: true })
                .trigger('keydown', { keyCode: keyCodeV, code: 'KeyV', ctrlKey: true })
                .trigger('keyup', { keyCode: keyCodeC, code: 'KeyC', ctrlKey: true });
            cy.get('.cvat-canvas-container').click(400, 300);
            cy.get('.cvat-canvas-container').click(500, 300);
            cy.get('body').type('{ctrl}'); // Unhold
            cy.get('.cvat-canvas-container').click(600, 300);
            cy.get('.cvat_canvas_shape_drawing').should('not.exist');
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarItems) => {
                expect(sidebarItems.length).to.be.equal(5);
            });
            cy.get('.cvat_canvas_shape').then((shapes) => {
                expect(shapes.length).to.be.equal(5);
            });
        });
    });
});
