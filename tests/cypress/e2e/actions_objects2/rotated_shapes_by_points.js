// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Rotated rectangles and ellipses drawn by contour points', { scrollBehavior: false }, () => {
    const canvas = '.cvat-canvas-container';
    const shape = '.cvat_canvas_shape';
    const original = {
        x: 350, y: 350, width: 160, height: 80, angle: 30,
    };

    function contour(shapeType, geometry = original) {
        const {
            x, y, width, height, angle,
        } = geometry;
        // Start in the middle of the top edge to make the expected orientation unambiguous.
        const points = shapeType === 'rectangle' ? [
            [0, -height / 2], [width / 2, -height / 2], [width / 2, height / 2],
            [-width / 2, height / 2], [-width / 2, -height / 2],
        ] : Array.from({ length: 8 }, (_, index) => {
            const theta = -Math.PI / 2 + (index * Math.PI) / 4;
            return [(width / 2) * Math.cos(theta), (height / 2) * Math.sin(theta)];
        });
        const radians = (angle * Math.PI) / 180;
        return points.map(([localX, localY]) => [
            x + localX * Math.cos(radians) - localY * Math.sin(radians),
            y + localX * Math.sin(radians) + localY * Math.cos(radians),
        ]);
    }

    function startDrawing(shapeType, objectType = 'Shape') {
        cy.interactControlButton(`draw-${shapeType}`);
        cy.switchLabel(labelName, `draw-${shapeType}`);
        cy.get(`.cvat-draw-${shapeType}-popover`).within(() => {
            cy.contains('.ant-radio-button-wrapper', 'Rotated').click();
            cy.contains('button', objectType).click();
        });
        cy.get('.cvat-annotation-header-done-button').should('be.visible');
    }

    function placePoints(points) {
        points.forEach(([x, y]) => {
            cy.get(canvas).click(x, y);
        });
    }

    function finishDrawing(method = 'N') {
        if (method === 'Done') {
            cy.get('.cvat-annotation-header-done-button').click();
        } else {
            cy.get('body').type('n');
        }
        cy.get('.cvat_canvas_shape_drawing').should('not.exist');
    }

    function expectGeometry(shapeType, expected = original, stage = 'drawn shape') {
        cy.get(shape).should('have.length', 1).and('be.visible').should(($shape) => {
            const element = $shape[0];
            expect(element.tagName.toLowerCase()).to.equal(shapeType === 'rectangle' ? 'rect' : 'ellipse');
            const bounds = element.getBBox();
            const matrix = element.getScreenCTM();
            const container = element.closest(canvas).getBoundingClientRect();
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            // Compare in canvas screen coordinates, independently of image zoom and translation.
            expect(matrix.a * centerX + matrix.c * centerY + matrix.e - container.left)
                .to.be.closeTo(expected.x, 2);
            expect(matrix.b * centerX + matrix.d * centerY + matrix.f - container.top)
                .to.be.closeTo(expected.y, 2);
            expect(bounds.width * Math.hypot(matrix.a, matrix.b), `${stage}: width`)
                .to.be.closeTo(expected.width, 2);
            expect(bounds.height * Math.hypot(matrix.c, matrix.d), `${stage}: height`)
                .to.be.closeTo(expected.height, 2);
            const angle = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
            const difference = ((angle - expected.angle + 540) % 360) - 180;
            expect(difference, `${stage}: rotation including the first-point top-edge orientation`)
                .to.be.closeTo(0, 1);
        });
        cy.get('.cvat-objects-sidebar-state-item').should('have.length', 1);
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    beforeEach(() => {
        cy.goCheckFrameNumber(0);
        cy.removeAnnotations();
    });

    afterEach(() => {
        cy.get('body').type('{esc}');
    });

    ['rectangle', 'ellipse'].forEach((shapeType) => {
        ['N', 'Done'].forEach((method) => {
            it(`Fits a ${shapeType} and preserves its top edge when finished with ${method}`, () => {
                startDrawing(shapeType);
                placePoints(contour(shapeType));
                cy.get(shape).should('not.exist');
                finishDrawing(method);
                expectGeometry(shapeType);
            });
        });

        it(`Removes the last ${shapeType} contour point with right-click`, () => {
            startDrawing(shapeType);
            placePoints(contour(shapeType));
            // An outlier would substantially change the fit if undo did not remove it.
            cy.get(canvas).click(600, 500);
            cy.get(canvas).rightclick(600, 500);
            finishDrawing();
            expectGeometry(shapeType);
        });

        it(`Does not create a ${shapeType} with too few contour points`, () => {
            startDrawing(shapeType);
            placePoints(contour(shapeType).slice(0, shapeType === 'rectangle' ? 2 : 4));
            finishDrawing('Done');
            cy.get(shape).should('not.exist');
            cy.get('.cvat-objects-sidebar-state-item').should('not.exist');
        });

        it(`Cancels a ${shapeType} contour and can draw again`, () => {
            startDrawing(shapeType);
            placePoints(contour(shapeType));
            cy.get('body').type('{esc}');
            cy.get('.cvat_canvas_shape_drawing').should('not.exist');
            cy.get(shape).should('not.exist');
            startDrawing(shapeType);
            placePoints(contour(shapeType));
            finishDrawing();
            expectGeometry(shapeType);
        });

        it(`Redraws a ${shapeType} with a new rotation without creating another object`, () => {
            startDrawing(shapeType);
            placePoints(contour(shapeType));
            finishDrawing();
            expectGeometry(shapeType);
            cy.get(shape).invoke('attr', 'id').then((id) => {
                cy.get(canvas).trigger('mousemove', original.x, original.y);
                cy.get(shape).should('have.class', 'cvat_canvas_shape_activated');
                cy.get('body').type('{shift}n');
                const redrawn = { ...original, x: 450, angle: 60 };
                placePoints(contour(shapeType, redrawn));
                finishDrawing();
                expectGeometry(shapeType, redrawn);
                cy.get(shape).should('have.attr', 'id', id);
            });
        });

        [90, -90, 180].forEach((degrees) => {
            it(`Changes ${shapeType} orientation by ${degrees}° without changing its occupied area`, () => {
                startDrawing(shapeType);
                placePoints(contour(shapeType));
                finishDrawing();
                expectGeometry(shapeType);
                cy.get('.cvat-objects-sidebar-state-item [aria-label="more"]').click();
                cy.get('.cvat-object-item-menu-orientation').trigger('mouseover');
                cy.get(`.cvat-object-item-menu-orientation-${degrees}`).should('be.visible').click();
                expectGeometry(shapeType, {
                    ...original,
                    width: Math.abs(degrees) === 90 ? original.height : original.width,
                    height: Math.abs(degrees) === 90 ? original.width : original.height,
                    angle: original.angle + degrees,
                }, 'after orientation change');
                // Use the toolbar so focus left in the object menu cannot consume the shortcut.
                cy.get('.cvat-annotation-header-undo-button').click();
                if (Math.abs(degrees) === 90) {
                    // CVAT records the axis swap and rotation as separate history entries.
                    expectGeometry(shapeType, { ...original, angle: original.angle + degrees }, 'after undoing axes');
                    cy.get('.cvat-annotation-header-undo-button').click();
                }
                expectGeometry(shapeType, original, 'after undoing orientation');
            });
        });

        it(`Saves and reloads a rotated ${shapeType} track`, () => {
            startDrawing(shapeType, 'Track');
            placePoints(contour(shapeType));
            finishDrawing();
            expectGeometry(shapeType);
            // Clearing previously saved annotations uses PUT; incremental saves use PATCH.
            cy.intercept({
                method: '+(PUT|PATCH)',
                pathname: '/api/jobs/*/annotations',
            }).as('saveRotatedAnnotations');
            cy.clickSaveAnnotationView();
            cy.wait('@saveRotatedAnnotations').its('response.statusCode').should('equal', 200);
            cy.intercept('GET', '/api/jobs/**/annotations**').as('reloadAnnotations');
            cy.reload();
            cy.wait('@reloadAnnotations');
            expectGeometry(shapeType);
            cy.goCheckFrameNumber(1);
            expectGeometry(shapeType);
            cy.get('.cvat-objects-sidebar-state-item').should('contain', `${shapeType.toUpperCase()} TRACK`);
        });
    });
});
