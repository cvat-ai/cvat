// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Canvas color feature', () => {
    const caseId = '100';
    const createOpencvShape = {
        labelName: labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 200, y: 250 },
            { x: 250, y: 300 },
            { x: 300, y: 350 },
        ],
    };
    const keyCodeN = 78;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Load OpenCV.', () => {
            cy.get('.cvat-tools-control').click();
            cy.get('.cvat-opencv-control-popover-visible').find('.cvat-opencv-initialization-button').click();
            // Intelligent cissors button be visible
            cy.get('.cvat-opencv-drawing-tool').should('exist').and('be.visible');
        });

        it('Create a shape via "Intelligent cissors".', () => {
            cy.opencvCreateShape(createOpencvShape);
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', {scrollBehavior: false})
                .trigger('mouseover', {scrollBehavior: false})
                .should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, shiftKey: true }).trigger('keyup');
            cy.get('.cvat-draw-polygon-control').should('have.attr', 'tabindex');
            cy.get('.cvat-tools-control').should('have.attr', 'tabindex');
            createOpencvShape.pointsMap.forEach((el) => {
                cy.get('.cvat-canvas-container')
                    .click(el.x + 100, el.y + 50)
            });
            cy.get('body').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
        });
    });
});
