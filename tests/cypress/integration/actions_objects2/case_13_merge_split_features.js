// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Merge/split features', () => {
    const caseId = '13';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: createRectangleShape2Points.firstX + 300,
        firstY: createRectangleShape2Points.firstY,
        secondX: createRectangleShape2Points.secondX + 300,
        secondY: createRectangleShape2Points.secondY,
    };
    const frameNum = 0;
    // Check the 'X' coordinate. 'Y' coordinate is the same.
    let xCoordinatesObjectFirstFrame = 0;
    let xCoordinatesObjectThirdFrame = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create rectangle shape on first frame', () => {
            cy.goCheckFrameNumber(frameNum);
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1')
                .should('have.attr', 'x')
                .then((xCoords) => {
                    xCoordinatesObjectFirstFrame = Math.floor(xCoords);
                });
        });
        it('Create rectangle shape on third frame with another position', () => {
            cy.goCheckFrameNumber(frameNum + 2);
            cy.createRectangle(createRectangleShape2PointsSecond);
            cy.get('#cvat_canvas_shape_2')
                .should('have.attr', 'x')
                .then((xCoords) => {
                    xCoordinatesObjectThirdFrame = Math.floor(xCoords);
                });
        });
        it('Merge the objects with "Merge button"', () => {
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('.cvat-merge-control').click(); // Cancel merge
            cy.get('.cvat-merge-control').click(); // Starting merge again
            cy.get('#cvat_canvas_shape_2').click(); // Select the shape
            cy.get('#cvat_canvas_shape_2').click(); // Unselect the shape
            cy.get('#cvat_canvas_shape_2').click(); // Repeat select the shape
            cy.get('.cvat-objects-sidebar-states-header').find('[aria-label="eye"]').click(); // To cover "this.highlightedShapes[objectState.clientID] = shape;"
            cy.get('.cvat-objects-sidebar-states-header').find('[aria-label="eye-invisible"]').click(); // Unhide
            cy.goCheckFrameNumber(frameNum);
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('.cvat-merge-control').click();
        });
        it('Get a track with keyframes on first and third frame', () => {
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('exist');
                });
            cy.goCheckFrameNumber(frameNum + 2);
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('exist');
                });
        });
        it('On the second frame and on the fourth frame the track is invisible', () => {
            cy.goCheckFrameNumber(frameNum + 1);
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.hidden');
            cy.goCheckFrameNumber(frameNum + 3);
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.hidden');
        });
        it('Go to the second frame and remove "outside" flag from the track. The track now visible.', () => {
            cy.goCheckFrameNumber(frameNum + 1);
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-outside').click();
                    cy.get('.cvat-object-item-button-outside-enabled').should('not.exist');
                });
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
        });
        it('Remove "keyframe" flag from the track. Track now interpolated between position on the first and the third frames.', () => {
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe').click();
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('not.exist');
                });
            cy.get('#cvat_canvas_shape_3')
                .should('have.attr', 'x')
                .then((xCoords) => {
                    // expected 9785 to be within 9642..9928
                    expect(Math.floor(xCoords)).to.be.within(
                        xCoordinatesObjectFirstFrame,
                        xCoordinatesObjectThirdFrame,
                    );
                });
        });
        it('On the fourth frame remove "keyframe" flag from the track. The track now visible and "outside" flag is disabled.', () => {
            cy.goCheckFrameNumber(frameNum + 3);
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe').click();
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('not.exist');
                    cy.get('.cvat-object-item-button-outside-enabled').should('not.exist');
                });
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
        });
        it('Split a track with "split" button. Previous track became invisible (has "outside" flag). One more track and it is visible.', () => {
            cy.get('.cvat-split-track-control').click();
            // A single click does not reproduce the split a track scenario in cypress test.
            cy.get('#cvat_canvas_shape_3').click().click();
            cy.get('#cvat_canvas_shape_4').should('exist').and('be.hidden');
            cy.get('#cvat-objects-sidebar-state-item-4')
                .should('contain', '4')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-outside-enabled').should('exist');
                });
            cy.get('#cvat_canvas_shape_5').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-5')
                .should('contain', '5')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-outside-enabled').should('not.exist');
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('exist');
                });
        });
    });
});
