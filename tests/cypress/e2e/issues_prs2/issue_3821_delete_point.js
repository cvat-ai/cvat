// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('When delete a point, the required point is deleted.', () => {
    const issueId = '3821';

    const pointsShapes = [];
    for (let i = 0; i < 4; i++) {
        pointsShapes.push({
            labelName,
            type: 'Shape',
            pointsMap: [
                { x: 300 + i * 50, y: 250 },
                { x: 300 + i * 50, y: 350 },
                { x: 300 + i * 50, y: 450 },
            ],
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        pointsShapes.forEach((shape) => {
            cy.createPoint(shape);
        });
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Remove point holding Alt key from each shape. Point must be removed from first shape, second one should stay the same', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true });
            cy.get('#cvat_canvas_shape_1').trigger('mouseover', { force: true });
            cy.get('body').type('{alt}', { release: false });
            cy.get('#cvat_canvas_shape_1')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((point) => {
                            cy.get(point).click();
                        });
                });
            cy.get('#cvat_canvas_shape_2')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((point) => {
                            cy.get(point).click();
                        });
                });
            cy.get('#cvat_canvas_shape_1')
                .children()
                .should('have.length', 2);
            cy.get('#cvat_canvas_shape_2')
                .children()
                .should('have.length', 3);
        });

        it('Remove point holding Ctrl key from each shape. Point must be removed from first shape, second one should stay the same', () => {
            cy.get('#cvat_canvas_shape_3').trigger('mousemove', { force: true });
            cy.get('#cvat_canvas_shape_3').trigger('mouseover', { force: true });
            cy.get('body').type('{ctrl}', { release: false });
            cy.get('#cvat_canvas_shape_3')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((point) => {
                            cy.get(point).rightclick();
                        });
                });
            cy.contains('Delete point').click();
            cy.get('#cvat_canvas_shape_4')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((point) => {
                            cy.get(point).rightclick();
                        });
                });
            cy.contains('Delete point').should('not.exist');
            cy.get('#cvat_canvas_shape_3')
                .children()
                .should('have.length', 2);
            cy.get('#cvat_canvas_shape_4')
                .children()
                .should('have.length', 3);
        });
    });
});
