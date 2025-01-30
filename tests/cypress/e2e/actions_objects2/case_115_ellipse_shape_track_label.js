// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';
import { decomposeMatrix } from '../../support/utils';

context('Actions on ellipse.', () => {
    const caseId = '115';
    const newLabelName = `Case ${caseId}`;
    const createEllipseShape = {
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 450,
        secondY: 280,
    };
    const createEllipseTrack = {
        type: 'Track',
        labelName,
        firstX: createEllipseShape.firstX,
        firstY: createEllipseShape.firstY - 150,
        secondX: createEllipseShape.secondX,
        secondY: createEllipseShape.secondY - 150,
    };
    const createEllipseShapeSwitchLabel = {
        type: 'Shape',
        labelName: newLabelName,
        firstX: createEllipseShape.firstX + 250,
        firstY: createEllipseShape.firstY,
        secondX: createEllipseShape.secondX + 250,
        secondY: createEllipseShape.secondY,
    };
    const createEllipseTrackSwitchLabel = {
        type: 'Track',
        labelName: newLabelName,
        firstX: createEllipseShape.firstX + 250,
        firstY: createEllipseShape.firstY - 150,
        secondX: createEllipseShape.secondX + 250,
        secondY: createEllipseShape.secondY - 150,
    };

    function testCompareRotate(shape, toFrame) {
        for (let frame = 8; frame >= toFrame; frame--) {
            cy.document().then((doc) => {
                const shapeTranformMatrix = decomposeMatrix(doc.getElementById(shape).getCTM());
                cy.goToPreviousFrame(frame);
                cy.document().then((doc2) => {
                    const shapeTranformMatrix2 = decomposeMatrix(doc2.getElementById(shape).getCTM());
                    expect(shapeTranformMatrix).not.deep.eq(shapeTranformMatrix2);
                });
            });
        }
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel({ name: newLabelName });
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a ellipse shape, track, second label.', () => {
            cy.createEllipse(createEllipseShape);
            cy.createEllipse(createEllipseTrack);
            cy.createEllipse(createEllipseShapeSwitchLabel);
            cy.createEllipse(createEllipseTrackSwitchLabel);
        });

        it('Ellipse rotation/interpolation.', () => {
            Cypress.config('scrollBehavior', false);
            cy.get('.cvat-player-last-button').click();
            cy.shapeRotate('#cvat_canvas_shape_4', '19.7');
            testCompareRotate('cvat_canvas_shape_4', 0);
            // Rotation with shift
            cy.shapeRotate('#cvat_canvas_shape_4', '15.0', true);
        });
    });
});
