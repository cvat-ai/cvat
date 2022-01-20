// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on ellipse.', () => {
    const caseId = '115';
    const newLabelName = `Case ${caseId}`;
    const createEllipseShape = {
        type: 'Shape',
        labelName,
        cx: 250,
        cy: 350,
        rightX: 450,
        topY: 280,
    };
    const createEllipseTrack = {
        type: 'Track',
        labelName,
        cx: createEllipseShape.cx,
        cy: createEllipseShape.cy - 150,
        rightX: createEllipseShape.rightX,
        topY: createEllipseShape.topY - 150,
    };
    const createEllipseShapeSwitchLabel = {
        type: 'Shape',
        labelName: newLabelName,
        cx: createEllipseShape.cx + 250,
        cy: createEllipseShape.cy,
        rightX: createEllipseShape.rightX + 250,
        topY: createEllipseShape.topY,
    };
    const createEllipseTrackSwitchLabel = {
        type: 'Track',
        labelName: newLabelName,
        cx: createEllipseShape.cx + 250,
        cy: createEllipseShape.cy - 150,
        rightX: createEllipseShape.rightX + 250,
        topY: createEllipseShape.topY - 150,
    };

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabelName);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a ellipse shape, track, second label.', () => {
            cy.createEllipse(createEllipseShape);
            cy.createEllipse(createEllipseTrack);
            cy.createEllipse(createEllipseShapeSwitchLabel);
            cy.createEllipse(createEllipseTrackSwitchLabel);
        });

        it('Ellipse rotation.', () => {
            Cypress.config('scrollBehavior', false);
            cy.shapeRotate(
                '#cvat_canvas_shape_1',
                (createEllipseShape.rightX + createEllipseShape.cx) / 2,
                createEllipseShape.topY + 20,
                '53.1',
            );
        });
    });
});
