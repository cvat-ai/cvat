// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// /// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Mutable attribute.', () => {
    const caseId = '70';
    const labelTrack = `Case ${caseId}`;
    const additionalAttrsLabelShape = [
        { additionalAttrName: 'tree', additionalValue: 'birch tree', typeAttribute: 'Text', mutable: true },
    ];

    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelTrack,
        firstX: 260,
        firstY: 200,
        secondX: 360,
        secondY: 250,
    };

    const attrValueSecondFrame = 'aspen';
    const attrValueThirdFrame = 'oak';

    function testChangingAttributeValue(expectedValue, value) {
        cy.get('.cvat-player-next-button').click();
        cy.get('.attribute-annotation-sidebar-attr-elem-wrapper')
            .find('[type="text"]')
            .should('have.value', expectedValue)
            .clear()
            .type(value);
    }

    function checkObjectDetailValue(frameNum, expectedValue) {
        cy.get('.cvat-player-next-button').click();
        cy.goCheckFrameNumber(frameNum);
        cy.contains(expectedValue).should('exist').and('be.visible');
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(labelTrack, additionalAttrsLabelShape);
        cy.openJob();
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Go to AAM. For the 2nd and 3rd frames, change the attribute value.', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(labelTrack);
            testChangingAttributeValue(additionalAttrsLabelShape[0].additionalValue, attrValueSecondFrame);
            testChangingAttributeValue(attrValueSecondFrame, attrValueThirdFrame);
        });

        it('Go to Standard mode. The object details have correct values on the corresponding frames.', () => {
            cy.changeWorkspace('Standard');
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', { scrollBehavior: false })
                .should('have.class', 'cvat_canvas_shape_activated');
            [
                [
                    0,
                    `${additionalAttrsLabelShape[0].additionalAttrName}: ${additionalAttrsLabelShape[0].additionalValue}`,
                ],
                [1, `${additionalAttrsLabelShape[0].additionalAttrName}: ${attrValueSecondFrame}`],
                [2, `${additionalAttrsLabelShape[0].additionalAttrName}: ${attrValueThirdFrame}`],
                [3, `${additionalAttrsLabelShape[0].additionalAttrName}: ${attrValueThirdFrame}`],
            ].forEach(([num, val]) => {
                checkObjectDetailValue(num, val);
            });
        });
    });
});
