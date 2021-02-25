// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Object propagate.', () => {
    const caseId = '53';
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    let maxFrameNumber = 0;
    const propagateOnOneFrame = 1;
    const propagateOnTwoFrame = 2;

    function startPropagation() {
        cy.get('#cvat-objects-sidebar-state-item-1').find('[aria-label="more"]').trigger('mouseover');
        cy.get('.cvat-object-item-menu').within(() => {
            cy.contains('button', 'Propagate').click();
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.get('.cvat-player-last-button').click();
        cy.get('.cvat-player-frame-selector')
            .find('input')
            .then((frameSelector) => {
                maxFrameNumber = Number(frameSelector.val());
            });
        cy.get('.cvat-player-first-button').click();
        cy.createCuboid(createCuboidShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('On the 1st frame propagate object on 1 frame.', () => {
            startPropagation();
            cy.get('.cvat-propagate-confirm-object-on-frames')
                .find('input')
                .should('have.attr', 'value', maxFrameNumber)
                .clear()
                .type(maxFrameNumber + 1) // Checking to specify the number of frames more than in the current job.
                .tab()
                .should('have.attr', 'value', maxFrameNumber) //Must be equal to the maximum value of the number of frames
                .clear()
                .type(propagateOnOneFrame);
            cy.get('.cvat-propagate-confirm-object-up-to-frame')
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
            cy.get('.cvat-propagate-confirm-object-on-frames')
                .find('input')
                .should('have.attr', 'value', propagateOnOneFrame)
                .clear()
                .type(propagateOnTwoFrame)
                .tab()
                .should('have.attr', 'value', propagateOnTwoFrame);
            cy.get('.cvat-propagate-confirm-object-up-to-frame')
                .find('input')
                .should('have.attr', 'value', propagateOnTwoFrame);
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
