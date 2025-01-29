// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context("Object can't be draggable/resizable in AAM", () => {
    const issueId = '2486';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    let shapeXPos = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it.skip('Create, acttivate a object', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });

        it.skip('Go to AAM', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(labelName);
            cy.get('#cvat_canvas_shape_1')
                .then((shape) => {
                    shapeXPos = Math.floor(shape.attr('x'));
                });
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');
            cy.get('circle').then((circle) => {
                for (let i = 0; i < circle.length; i++) {
                    if (circle[i].id.match(/^SvgjsCircle\d+$/)) {
                        cy.get(circle[i]).should('not.exist'); // id='SvgjsCircleNNNN' should not exist. Because of this can't change the object size.
                    }
                }
            });
        });

        it.skip('Try to move/resize the object', () => {
            cy.get('.cvat-canvas-container').trigger('mousedown', { button: 0 });
            cy.get('.cvat-canvas-container').trigger('mousemove', 550, 251);
            cy.get('.cvat-canvas-container').trigger('mouseup');
            cy.get('#cvat_canvas_shape_1').then((shapeAam) => {
                expect(shapeXPos).to.be.equal(Math.floor(shapeAam.attr('x'))); // The object didn't move.
            });
        });
    });
});
