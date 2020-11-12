// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if the image is scaled and then fitted', () => {
    const caseId = '6';
    let scaleBefore = 0;
    let scaleAfter = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Scale image', () => {
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($styles) => {
                    scaleBefore = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
                });
            cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($styles) => {
                    scaleAfter = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
                    cy.expect(scaleBefore).to.be.greaterThan(scaleAfter);
                });
        });
        it('Fit image', () => {
            cy.get('#cvat_canvas_content').dblclick();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', scaleBefore);
        });
    });
});
