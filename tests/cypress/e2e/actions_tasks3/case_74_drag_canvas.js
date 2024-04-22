// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Drag canvas.', () => {
    const caseId = '74';
    let topBefore;
    let leftBefore;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Drag canvas', () => {
            cy.get('#cvat_canvas_background')
                .invoke('attr', 'style')
                .then(($style) => {
                    topBefore = +$style.split(';').find((el) => el.includes('top')).split(':')[1].replace('px', '').trim();
                    leftBefore = +$style.split(';').find((el) => el.includes('left')).split(':')[1].replace('px', '').trim();
                });
            cy.get('.cvat-move-control').click(); // Without this action, the function is not covered
            cy.get('.cvat-canvas-container').trigger('mousedown', { button: 0 });
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 500);
        });

        it('Top and left style perameters is changed.', () => {
            cy.get('#cvat_canvas_background')
                .invoke('attr', 'style')
                .then(($style) => {
                    const newTop = +$style.split(';').find((el) => el.includes('top')).split(':')[1].replace('px', '').trim();
                    const newLeft = +$style.split(';').find((el) => el.includes('left')).split(':')[1].replace('px', '').trim();
                    expect(topBefore).not.equal(newTop); // expected 27 to not equal 96
                    expect(leftBefore).not.equal(newLeft); // expected 73 to not equal 96
                });
        });

        it('Duble click on canvas. Parameters returned to their original value', () => {
            cy.get('.cvat-canvas-container').dblclick();
            cy.get('#cvat_canvas_background')
                .invoke('attr', 'style')
                .then(($style) => {
                    const newTop = +$style.split(';').find((el) => el.includes('top')).split(':')[1].replace('px', '').trim();
                    const newLeft = +$style.split(';').find((el) => el.includes('left')).split(':')[1].replace('px', '').trim();
                    expect(topBefore).equal(newTop); // expected 27 to equal 20
                    expect(leftBefore).equal(newLeft); // expected 73 to equal 73
                });
        });
    });
});
