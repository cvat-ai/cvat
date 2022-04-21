// Copyright (C) 2022 Intel Corporation
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

        it('Ellipse rotation/interpolation.', () => {
            Cypress.config('scrollBehavior', false);
            cy.get('.cvat-player-last-button').click();
            cy.shapeRotate(
                '#cvat_canvas_shape_4',
                (createEllipseTrackSwitchLabel.rightX + createEllipseTrackSwitchLabel.cx) / 2,
                createEllipseTrackSwitchLabel.topY + 20,
                '53.1',
            );
            testCompareRotate('cvat_canvas_shape_4', 0);
            // Rotation with shift
            cy.shapeRotate(
                '#cvat_canvas_shape_4',
                (createEllipseTrackSwitchLabel.rightX + createEllipseTrackSwitchLabel.cx) / 2,
                createEllipseTrackSwitchLabel.topY + 20,
                '60.0',
                true,
            );
        });
    });
});
