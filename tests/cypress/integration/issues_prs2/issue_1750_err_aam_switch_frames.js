// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('An error occurs in AAM when switching to 2 frames, if the frames have objects created in shape mode', () => {
    const issueId = '1750';
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
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY - 150,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create multiple objects', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
        });
        it('Go to AAM', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(labelName);
        });
        it('Go to next frame', () => {
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', '1');
            });
        });
        it('Go to previous frame', () => {
            cy.get('.cvat-player-previous-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', '0');
            });
        });
        it('Go to next object', () => {
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher-right').click();
        });
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong', { timeout: 1000 }).should('not.exist');
            cy.changeLabelAAM(labelName);
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher').should('contain', `${labelName} 2 [2/2]`);
        });
    });
});
