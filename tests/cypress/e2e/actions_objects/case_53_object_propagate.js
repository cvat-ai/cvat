// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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

    function setupUpToFrame(value) {
        cy.get('.cvat-propagate-confirm-up-to-input').find('input').clear();
        cy.get('.cvat-propagate-confirm-up-to-input').find('input').type(value);
        cy.get('.cvat-propagate-confirm-up-to-input').find('input').blur();
        cy.get('.cvat-propagate-confirm-up-to-input').find('input').should('have.value', value);
    }

    function setupPropagateFrames(value) {
        // Change value in the "copy of the object on frame" field
        cy.get('.cvat-propagate-confirm-object-on-frames').find('input').clear();
        cy.get('.cvat-propagate-confirm-object-on-frames').find('input').type(value);
        cy.get('.cvat-propagate-confirm-object-on-frames').find('input').blur();
        cy.get('.cvat-propagate-confirm-object-on-frames').find('input').should('have.value', value);
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
        cy.createCuboid(createCuboidShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('On the 1st frame propagate object on 1 frame.', () => {
            const FROM_FRAME = 0;
            const PROPAGATE_FRAMES = 1;

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Propagate');
            setupPropagateFrames(PROPAGATE_FRAMES);
            cy.get('.cvat-propagate-confirm-up-to-input') // Value of "up to the frame" field should be same
                .find('input')
                .should('have.attr', 'value', FROM_FRAME + PROPAGATE_FRAMES);
            cy.contains('button', 'Yes').click();

            for (let i = FROM_FRAME; i <= FROM_FRAME + PROPAGATE_FRAMES; i++) {
                cy.goCheckFrameNumber(i);
                cy.get('.cvat_canvas_shape_cuboid').should('have.length', 1);
            }
            cy.goCheckFrameNumber(FROM_FRAME + PROPAGATE_FRAMES + 1);
            cy.get('.cvat_canvas_shape_cuboid').should('not.exist');
        });

        it('From the 1st frame propagate again on 2 frames.', () => {
            const FROM_FRAME = 0;
            const PROPAGATE_FRAMES = 2;

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Propagate');
            setupUpToFrame(FROM_FRAME + PROPAGATE_FRAMES);
            cy.get('.cvat-propagate-confirm-object-on-frames') // Value of "copy of the object on frames" field should be same
                .find('input')
                .should('have.attr', 'value', FROM_FRAME + PROPAGATE_FRAMES);
            cy.contains('button', 'Yes').click();

            for (let i = FROM_FRAME; i <= FROM_FRAME + PROPAGATE_FRAMES; i++) {
                cy.goCheckFrameNumber(i);
                cy.get('.cvat_canvas_shape_cuboid').should('have.length', 1);
            }
            cy.goCheckFrameNumber(FROM_FRAME + PROPAGATE_FRAMES + 1);
            cy.get('.cvat_canvas_shape_cuboid').should('not.exist');
        });

        it('Testing propagate backward', () => {
            cy.removeAnnotations();
            const FROM_FRAME = 4;
            const UP_TO_FRAME = 1;
            cy.goCheckFrameNumber(FROM_FRAME);
            cy.createCuboid(createCuboidShape2Points);
            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Propagate');
            setupUpToFrame(UP_TO_FRAME);
            cy.contains('button', 'Yes').click();

            for (let i = FROM_FRAME - 1; i >= UP_TO_FRAME; i--) {
                cy.goCheckFrameNumber(i);
                cy.get('.cvat_canvas_shape_cuboid').should('have.length', 1);
            }
            cy.goCheckFrameNumber(UP_TO_FRAME - 1);
            cy.get('.cvat_canvas_shape_cuboid').should('not.exist');
        });
    });
});
