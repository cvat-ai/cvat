// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Draw a point shape, specify one point', () => {
    const issueId = '2306';
    const createPointsShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [{ x: 500, y: 200 }],
        numberOfPoints: 1,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${issueId}"`, () => {
        it('Draw a point shape, specify one point. Drag cursor.', () => {
            cy.createPoint(createPointsShape);
            cy.get('.cvat-canvas-container').trigger('mousemove');
            // Test fail before fix with error:
            // The following error originated from your application code, not from Cypress.
            // > Cannot read property 'each' of undefined.
        });
    });
});
