// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on rectangle', () => {
    const caseId = '8';
    const newLabelName = `New label for case ${caseId}`;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 350,
        thirdX: 500,
        thirdY: 450,
        fourthX: 400,
        fourthY: 450,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelName,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY - 150,
    };
    const createRectangleTrack4Points = {
        points: 'By 4 Points',
        type: 'Track',
        labelName: labelName,
        firstX: createRectangleShape4Points.firstX,
        firstY: createRectangleShape4Points.firstY - 150,
        secondX: createRectangleShape4Points.secondX - 100,
        secondY: createRectangleShape4Points.secondY - 50,
        thirdX: createRectangleShape4Points.thirdX,
        thirdY: createRectangleShape4Points.thirdY - 150,
        fourthX: createRectangleShape4Points.fourthX,
        fourthY: createRectangleShape4Points.fourthY - 150,
    };
    const createRectangleShape2PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 2 Points',
        type: 'Shape',
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY + 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY + 150,
    };
    const createRectangleShape4PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 4 Points',
        type: 'Shape',
        firstX: createRectangleShape4Points.firstX,
        firstY: createRectangleShape4Points.firstY + 150,
        secondX: createRectangleShape4Points.secondX,
        secondY: createRectangleShape4Points.secondY + 150,
        thirdX: createRectangleShape4Points.thirdX,
        thirdY: createRectangleShape4Points.thirdY + 150,
        fourthX: createRectangleShape4Points.fourthX,
        fourthY: createRectangleShape4Points.fourthY + 150,
    };

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabelName);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a rectangle shape in two ways (by 2 points, by 4 points)', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape4Points);
        });
        it('Draw a rectangle track in two ways (by 2 points, by 4 points)', () => {
            cy.createRectangle(createRectangleTrack2Points);
            cy.createRectangle(createRectangleTrack4Points);
        });
        it('Draw a new rectangle shape in two ways (by 2 points, by 4 points) with second label', () => {
            cy.createRectangle(createRectangleShape2PointsNewLabel);
            cy.createRectangle(createRectangleShape4PointsNewLabel);
        });
    });
});
