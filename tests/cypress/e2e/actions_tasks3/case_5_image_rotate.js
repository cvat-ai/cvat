// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if the image is rotated', () => {
    const caseId = '5';

    function imageRotate(direction = 'anticlockwise') {
        cy.interactControlButton('rotate-canvas');
        if (direction === 'clockwise') {
            cy.get('.cvat-rotate-canvas-controls-right').click();
        } else {
            cy.get('.cvat-rotate-canvas-controls-left').click();
        }
        cy.get('.cvat-canvas-container').click(); // Hide popover
        cy.get('.cvat-rotate-canvas-popover').should('be.hidden');
    }

    function scaleFitImage() {
        let scaleBefore;
        cy.get('#cvat_canvas_background')
            .should('have.attr', 'style')
            .then(($styles) => {
                scaleBefore = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
            });
        cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
        cy.get('#cvat_canvas_background')
            .should('have.attr', 'style')
            .then(($styles) => {
                const scaleAfter = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
                cy.expect(scaleBefore).to.be.greaterThan(scaleAfter);
                cy.get('#cvat_canvas_content').dblclick();
                cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', scaleBefore);
            });
        cy.get('.cvat-rotate-canvas-popover-visible').should('not.exist');
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Rotate image clockwise 90deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(90deg);');
            scaleFitImage();
        });

        it('Rotate image clockwise 180deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(180deg);');
            scaleFitImage();
        });

        it('Rotate image clockwise 270deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(270deg);');
            scaleFitImage();
        });

        it('Rotate image clockwise 360deg', () => {
            imageRotate('clockwise');
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(0deg);');
            scaleFitImage();
        });

        it('Rotate image anticlockwise 90deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(270deg);');
            scaleFitImage();
        });

        it('Rotate image anticlockwise 180deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(180deg);');
            scaleFitImage();
        });

        it('Rotate image anticlockwise 270deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(90deg);');
            scaleFitImage();
        });

        it('Rotate image anticlockwise 360deg', () => {
            imageRotate();
            cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', 'rotate(0deg);');
            scaleFitImage();
        });
    });
});
