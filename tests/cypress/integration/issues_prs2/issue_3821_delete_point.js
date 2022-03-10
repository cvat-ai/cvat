// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('When delete a point, the required point is deleted.', () => {
    const issueId = '3821';

    const firstPointsShape = {
        labelName,
        type: 'Shape',
        pointsMap: [
            { x: 300, y: 250 },
            { x: 300, y: 350 },
            { x: 300, y: 450 },
        ],
    };
    const secondPointsShape = {
        labelName,
        type: 'Shape',
        pointsMap: [
            { x: 330, y: 250 },
            { x: 330, y: 350 },
            { x: 330, y: 450 },
        ],
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Crearte points shapes', () => {
            cy.createPoint(firstPointsShape);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'POINTS SHAPE');
            cy.createPoint(secondPointsShape);
            cy.get('#cvat-objects-sidebar-state-item-2').should('contain', '2').and('contain', 'POINTS SHAPE');
        });
        it('Remove point holding Alt key from each shape', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true }).trigger('mouseover', { force: true });
            cy.get('body').type('{alt}', { release: false });
            cy.get('#cvat_canvas_shape_1')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((elem) => {
                            cy.get(elem).click();
                        });
                });
            cy.get('#cvat_canvas_shape_2')
                .children()
                .then((children) => {
                    cy.get(children)
                        .eq(1)
                        .then((elem) => {
                            cy.get(elem).click();
                        });
                });
        });
        it('Point must be removed from first shape, second one should stay the same', () => {
            cy.get('#cvat_canvas_shape_1')
                .children()
                .should('have.length', 2);
            cy.get('#cvat_canvas_shape_2')
                .children()
                .should('have.length', 3);
        });
    });
});
