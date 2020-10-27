/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Merge/split features', () => {
    const caseId = '13';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: createRectangleShape2Points.firstX + 300,
        firstY: createRectangleShape2Points.firstY,
        secondX: createRectangleShape2Points.secondX + 300,
        secondY: createRectangleShape2Points.secondY,
    };
    let iconStarCss = '';
    const frameNum = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    function checkFrameNumber(frameNum) {
        cy.get('.cvat-player-frame-selector').within(() => {
            cy.get('input[role="spinbutton"]').should('have.value', frameNum);
        });
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Create rectangle shape on first frame', () => {
            cy.createRectangle(createRectangleShape2Points);
            checkFrameNumber(frameNum)
        });
        it('Create rectangle shape on third frame with another position', () => {
            cy.get('.cvat-player-next-button').click().click();
            checkFrameNumber(frameNum + 2)
            cy.createRectangle(createRectangleShape2PointsSecond);
        });
        it('Merge the objects with "Merge button"', () => {
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('.cvat-player-previous-button').click().click();
            checkFrameNumber(frameNum)
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('.cvat-merge-control').click();
        });
        it('Get a track with keyframes on first and third frame', () => {
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-3').should('contain', '3').and('contain', 'RECTANGLE TRACK');
            cy.get('#cvat-objects-sidebar-state-item-3').within(() => {
                cy.get('.ant-row-flex').within(() => {
                    cy.get('.anticon-star').should('have.css', 'color').then($iconStarCss => {
                        iconStarCss = $iconStarCss
                        expect(iconStarCss).to.be.eq('rgb(36, 36, 36)')
                    });
                });
            });
            cy.get('.cvat-player-next-button').click().click();
            checkFrameNumber(frameNum + 2)
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-3').should('contain', '3').and('contain', 'RECTANGLE TRACK');
            cy.get('#cvat-objects-sidebar-state-item-3').within(() => {
                cy.get('.ant-row-flex').within(() => {
                    cy.get('.anticon-star').should('have.css', 'color', iconStarCss)
                });
            });
        });
        it('On the second frame and on the fourth frame the track is invisible', () => {
            cy.get('.cvat-player-previous-button').click();
            checkFrameNumber(frameNum + 1)
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.hidden');
            cy.get('.cvat-player-next-button').click().click();
            checkFrameNumber(frameNum + 3)
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.hidden');
        });
    });
});
