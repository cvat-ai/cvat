// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('OpenCV. Intelligent cissors. Basic actions.', () => {
    const caseId = '101';
    const createOpencvShape = {
        labelName: labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 300, y: 250 },
            { x: 350, y: 300 },
            { x: 300, y: 350 },
        ],
    };
    const newLabel = `${createOpencvShape.labelName} new`
    const createOpencvShapeSecondLabel = {
        labelName: newLabel,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 400, y: 250 },
            { x: 450, y: 300 },
            { x: 400, y: 350 },
        ],
    };
    const keyCodeN = 78;

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabel);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Load OpenCV.', () => {
            cy.get('.cvat-tools-control').click();
            cy.get('.cvat-opencv-control-popover-visible').find('.cvat-opencv-initialization-button').click();
            // Intelligent cissors button be visible
            cy.get('.cvat-opencv-drawing-tool').should('exist').and('be.visible');
        });

        it('Create a shape with "Intelligent cissors".', () => {
            cy.opencvCreateShape(createOpencvShape);
        });

        it('Create a shape with "Intelligent cissors".', () => {
            cy.opencvCreateShape(createOpencvShapeSecondLabel);
        });

        // Waiting for fix https://github.com/openvinotoolkit/cvat/issues/3474
        it.skip('Redraw the shape created with "Intelligent cissors".', () => {
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', {scrollBehavior: false})
                .trigger('mouseover', {scrollBehavior: false})
                .should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, shiftKey: true }).trigger('keyup');
            cy.get('.cvat-tools-control').should('have.attr', 'tabindex');
            createOpencvShape.pointsMap.forEach((el) => {
                cy.get('.cvat-canvas-container')
                    .click(el.x + 150, el.y + 50)
            });
            cy.get('body').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
        });
    });
});
