// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if image was scaled to ROI', () => {
    const caseId = '7';
    let scaleBefore = 0;
    let scaleAfter = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create ROI', () => {
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($scale) => {
                    scaleBefore = Number($scale.match(/scale\((\d\.\d+)\)/m)[1]);
                });
            cy.get('.cvat-resize-control').click();
            cy.get('.cvat-canvas-container')
                .trigger('mousedown', 309, 431, { which: 1 })
                .trigger('mousemove', 616, 671)
                .trigger('mouseup', 616, 671);
        });
        it('Image scaled to ROI', () => {
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($scale) => {
                    scaleAfter = Number($scale.match(/scale\((\d\.\d+)\)/m)[1]);
                    cy.expect(scaleAfter).to.be.greaterThan(scaleBefore);
                });
            cy.get('body').type('{Esc}'); // cvat-canvas/src/typescript/zoomHandler.ts "public cancel():"
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        });
    });
});
