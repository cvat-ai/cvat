// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// /// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Mutable attribute.', () => {
    const labelName = 'car';
    const additionalAttrsLabelShape = [
        {
            name: 'tree', values: 'birch tree', type: 'Text', mutable: true,
        },
    ];

    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName,
        firstX: 260,
        firstY: 200,
        secondX: 360,
        secondY: 250,
    };

    const attrValueSecondFrame = 'aspen';
    const attrValueThirdFrame = 'oak';

    function testChangingAttributeValue(expectedValue, value) {
        cy.get('.cvat-player-next-button').click();
        cy.get('.attribute-annotation-sidebar-attr-elem-wrapper').find('textarea');
        cy.get('.attribute-annotation-sidebar-attr-elem-wrapper').find('textarea').should('have.value', expectedValue);
        cy.get('.attribute-annotation-sidebar-attr-elem-wrapper').find('textarea').clear();
        cy.get('.attribute-annotation-sidebar-attr-elem-wrapper').find('textarea').type(value);
    }

    function checkObjectDetailValue(frameNum, expectedValue) {
        cy.get('.cvat-player-next-button').click();
        cy.goCheckFrameNumber(frameNum);
        cy.contains(expectedValue).should('exist').and('be.visible');
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel({ name: labelName }, additionalAttrsLabelShape);
        cy.openJob();
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe('Check different use-cases with mutable attributes', () => {
        it('Go to AAM. For the 2nd and 3rd frames, change the attribute value.', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(labelName);
            testChangingAttributeValue(additionalAttrsLabelShape[0].values, attrValueSecondFrame);
            testChangingAttributeValue(attrValueSecondFrame, attrValueThirdFrame);
        });

        it('Go to Standard mode. The object details have correct values on the corresponding frames.', () => {
            cy.changeWorkspace('Standard');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { scrollBehavior: false });
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            [
                [0, `${additionalAttrsLabelShape[0].name}: ${additionalAttrsLabelShape[0].values}`],
                [1, `${additionalAttrsLabelShape[0].name}: ${attrValueSecondFrame}`],
                [2, `${additionalAttrsLabelShape[0].name}: ${attrValueThirdFrame}`],
                [3, `${additionalAttrsLabelShape[0].name}: ${attrValueThirdFrame}`],
            ].forEach(([num, val]) => {
                checkObjectDetailValue(num, val);
            });
        });

        it('Test attribute can be changed between two keyframes and can be selected after', () => {
            cy.goCheckFrameNumber(0);
            cy.removeAnnotations();
            cy.createRectangle(createRectangleTrack2Points);
            cy.goCheckFrameNumber(2);

            cy.get('#cvat-objects-sidebar-state-item-1')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe').click();
                    cy.get('span').contains('DETAILS').click();
                });

            cy.goCheckFrameNumber(1);

            cy.get('#cvat-objects-sidebar-state-item-1')
                .within(() => {
                    cy.get('.cvat-object-item-text-attribute').should('exist').and('be.visible').clear();
                    cy.get('.cvat-object-item-text-attribute').type('new attribute value');
                });

            cy.get('body').click(); // deactivate
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });
    });
});
