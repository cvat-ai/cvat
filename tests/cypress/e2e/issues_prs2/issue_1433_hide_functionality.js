// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check hide functionality (H)', () => {
    const issueId = '1433';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Object is hidden', () => {
            const keyCodeH = 72;
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').trigger('keydown', { keyCode: keyCodeH, code: 'KeyH' });
            cy.get('#cvat_canvas_shape_1').should('be.hidden');
        });
    });
});
