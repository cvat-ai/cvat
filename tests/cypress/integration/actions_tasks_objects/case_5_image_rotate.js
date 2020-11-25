// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if the image is rotated', () => {
    const caseId = '5';
    function imageRotate(direction = 'anticlockwise') {
        cy.get('.cvat-rotate-canvas-control').trigger('mouseover');
        if (direction === 'clockwise') {
            cy.get('.cvat-rotate-canvas-controls-right').click();
        } else {
            cy.get('.cvat-rotate-canvas-controls-left').click();
        }
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Rotate image clockwise 90deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(90deg);');
        });
        it('Rotate image clockwise 180deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(180deg);');
        });
        it('Rotate image clockwise 270deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(270deg);');
        });
        it('Rotate image clockwise 360deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(0deg);');
        });
        it('Rotate image anticlockwise 90deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(270deg);');
        });
        it('Rotate image anticlockwise 180deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(180deg);');
        });
        it('Rotate image anticlockwise 270deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(90deg);');
        });
        it('Rotate image anticlockwise 360deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(0deg);');
        });
    });
});
