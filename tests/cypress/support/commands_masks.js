// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('drawMask', (instructions) => {
    for (const instruction of instructions) {
        const { method } = instruction;
        if (method === 'brush-size') {
            const { value } = instruction;
            cy.get('.cvat-brush-tools-brush').click();
            cy.get('.cvat-brush-tools-brush-size').within(() => {
                cy.get('input').clear();
                cy.get('input').type(`${value}`);
            });
        } else {
            const { coordinates } = instruction;
            if (['brush', 'eraser'].includes(method)) {
                if (method === 'eraser') {
                    cy.get('.cvat-brush-tools-eraser').click();
                } else {
                    cy.get('.cvat-brush-tools-brush').click();
                }

                cy.get('.cvat-canvas-container').then(([$canvas]) => {
                    const [initX, initY] = coordinates[0];
                    cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                    cy.wrap($canvas).trigger('mousedown', {
                        clientX: initX, clientY: initY, button: 0, bubbles: true,
                    });
                    for (const coord of coordinates) {
                        const [clientX, clientY] = coord;
                        cy.wrap($canvas).trigger('mousemove', { clientX, clientY, bubbles: true });
                    }
                    cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                    cy.wrap($canvas).trigger('mouseup', { bubbles: true });
                });
            } else if (['polygon-plus', 'polygon-minus'].includes(method)) {
                if (method === 'polygon-plus') {
                    cy.get('.cvat-brush-tools-polygon-plus').click();
                } else {
                    cy.get('.cvat-brush-tools-polygon-minus').click();
                }

                cy.get('.cvat-canvas-container').then(($canvas) => {
                    for (const [x, y] of coordinates) {
                        cy.wrap($canvas).click(x, y);
                    }
                });
            }
        }
    }
});

Cypress.Commands.add('startMaskDrawing', () => {
    cy.get('.cvat-draw-mask-control ').trigger('mouseover');
    cy.get('.cvat-draw-mask-popover').should('exist').and('be.visible').within(() => {
        cy.get('button').click();
    });
    cy.get('.cvat-brush-tools-toolbox').should('exist').and('be.visible');
});

Cypress.Commands.add('finishMaskDrawing', () => {
    cy.get('.cvat-brush-tools-brush').click();
    cy.get('.cvat-brush-tools-finish').click();
});
