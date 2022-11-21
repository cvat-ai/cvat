// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { globalTheme as theme } from './theme';

export function generateString(countPointsToMove, arrow) {
    let action = '';
    for (let i = 0; i < countPointsToMove; i++) {
        action += `{${arrow}}`;
    }
    return action;
}

export function deltaTransformPoint(matrix, point) {
    const dx = point.x * matrix.a + point.y * matrix.c;
    const dy = point.x * matrix.b + point.y * matrix.d;
    return { x: dx, y: dy };
}

export function decomposeMatrix(matrix) {
    const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
    return ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90).toFixed(1);
}

export function drawMask(instructions) {
    for (const instruction of instructions) {
        const { method } = instruction;
        if (method === `${theme.methodBrushSize}`) {
            const { value } = instruction;
            cy.get(`${theme.toolBrush}`).click();
            cy.get(`${theme.toolBrushSize}`).within(() => {
                cy.get('input').clear().type(`${value}`);
            });
        } else {
            const { coordinates } = instruction;
            if ([`${theme.methodBrush}`, `${theme.methodEraser}`].includes(method)) {
                if (method === `${theme.methodEraser}`) {
                    cy.get(`${theme.toolBrushEraser}`).click();
                } else {
                    cy.get(`${theme.toolBrush}`).click();
                }

                cy.get(`${theme.toolCanvasContainer}`).then(([$canvas]) => {
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
            } else if ([`${theme.methodPolygonPlus}`, `${theme.methodPolygonMinus}`].includes(method)) {
                if (method === `${theme.methodPolygonPlus}`) {
                    cy.get(`${theme.toolBrushPolygonPlus}`).click();
                } else {
                    cy.get(`${theme.toolBrushPolygonMinus}`).click();
                }

                cy.get(`${theme.toolCanvasContainer}`).then(($canvas) => {
                    for (const [x, y] of coordinates) {
                        cy.wrap($canvas).click(x, y);
                    }
                });
            }
        }
    }
}

export function startDrawing() {
    cy.get(`${theme.drawMaskControl}`).trigger('mouseover');
    cy.get(`${theme.drawMaskPopover}`).should('exist').and('be.visible').within(() => {
        cy.get('button').click();
    });
    cy.get(`${theme.toolBrushToolbox}`).should('exist').and('be.visible');
}

export function finishDrawing() {
    cy.get(`${theme.toolBrush}`).click();
    cy.get(`${theme.toolBrushFinish}`).click();
}
