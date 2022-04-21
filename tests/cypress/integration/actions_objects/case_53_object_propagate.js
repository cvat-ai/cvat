// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Object propagate.', () => {
    const caseId = '53';
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const propagateOnOneFrame = 1;
    const propagateOnTwoFrames = 2;

    function startPropagation() {
        cy.get('#cvat-objects-sidebar-state-item-1').find('[aria-label="more"]').trigger('mouseover');
        cy.get('.cvat-object-item-menu').within(() => {
            cy.contains('button', 'Propagate').click();
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createCuboid(createCuboidShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('On the 1st frame propagate object on 1 frame.', () => {
            startPropagation();
            cy.get('.cvat-propagate-confirm-object-on-frames') // Change value in the "copy of the object on frame" field
                .find('input')
                .clear()
                .should('have.value', 1);
            cy.get('.cvat-propagate-confirm-object-up-to-frame') // Value of "up to the frame" field should be same
                .find('input')
                .should('have.attr', 'value', propagateOnOneFrame);
            cy.contains('button', 'Yes').click();
        });

        it('On the 1st and 2nd frames, the number of objects is equal to 1. On the 3rd frame is 0.', () => {
            cy.get('.cvat_canvas_shape_cuboid').then(($cuboidCountFirstFrame) => {
                cy.goCheckFrameNumber(1); // Go to 2nd frame
                cy.get('.cvat_canvas_shape_cuboid').then(($cuboidCountSecondFrame) => {
                    expect($cuboidCountFirstFrame.length).to.be.equal($cuboidCountSecondFrame.length);
                });
            });
            cy.goCheckFrameNumber(2); // Go to 3rd frame
            cy.get('.cvat_canvas_shape_cuboid').should('not.exist');
            cy.get('.cvat-player-first-button').click();
        });

        it('From the 1st frame propagate again on 2 frames.', () => {
            startPropagation();
            cy.get('.cvat-propagate-confirm-object-up-to-frame') // Change value in the "up to the frame" field
                .find('input')
                .clear()
                .type(propagateOnTwoFrames)
                .should('have.attr', 'value', propagateOnTwoFrames);
            cy.get('.cvat-propagate-confirm-object-on-frames') // Value of "copy of the object on frames" field should be same
                .find('input')
                .should('have.attr', 'value', propagateOnTwoFrames);
            cy.contains('button', 'Yes').click();
        });

        it('On the 1st and 3rd frames the number of objects is equal to 1. On the 2nd frame equal to 2. On the 4th frame equal to 0', () => {
            cy.get('.cvat_canvas_shape_cuboid').then(($cuboidCountFirstFrame) => {
                cy.goCheckFrameNumber(2); // Go to 3rd frame
                cy.get('.cvat_canvas_shape_cuboid').then(($cuboidCountThirdFrame) => {
                    expect($cuboidCountFirstFrame.length).to.be.equal($cuboidCountThirdFrame.length);
                });
            });
            cy.goCheckFrameNumber(1); // Go to 2nd frame
            cy.get('.cvat_canvas_shape_cuboid').then(($cuboidCountSecondFrame) => {
                expect($cuboidCountSecondFrame.length).to.be.equal(2);
            });
            cy.goCheckFrameNumber(3); // Go to 4th frame
            cy.get('.cvat_canvas_shape_cuboid').should('not.exist');
        });
    });
});
