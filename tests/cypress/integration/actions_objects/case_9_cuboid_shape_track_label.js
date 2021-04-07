// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on Cuboid', () => {
    const caseId = '9';
    const newLabelName = `New label for case ${caseId}`;
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createCuboidShape4Points = {
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
    const createCuboidTrack2Points = {
        points: 'From rectangle',
        type: 'Track',
        labelName: labelName,
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY - 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY - 150,
    };
    const createCuboidTrack4Points = {
        points: 'By 4 Points',
        type: 'Track',
        labelName: labelName,
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY - 150,
        secondX: createCuboidShape4Points.secondX - 100,
        secondY: createCuboidShape4Points.secondY - 50,
        thirdX: createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY - 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY - 150,
    };
    const createCuboidShape2PointsNewLabel = {
        labelName: newLabelName,
        points: 'From rectangle',
        type: 'Shape',
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY + 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY + 150,
    };
    const createCuboidShape4PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 4 Points',
        type: 'Shape',
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY + 150,
        secondX: createCuboidShape4Points.secondX,
        secondY: createCuboidShape4Points.secondY + 150,
        thirdX: createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY + 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY + 150,
    };

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabelName);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a Cuboid shape in two ways (From rectangle, by 4 points)', () => {
            cy.createCuboid(createCuboidShape2Points);
            cy.createCuboid(createCuboidShape4Points);
        });
        it('Draw a Cuboid track in two ways (From rectangle, by 4 points)', () => {
            cy.createCuboid(createCuboidTrack2Points);
            cy.createCuboid(createCuboidTrack4Points);
        });
        it('Draw a new Cuboid shape in two ways (From rectangle, by 4 points) with second label', () => {
            cy.createCuboid(createCuboidShape2PointsNewLabel);
            cy.createCuboid(createCuboidShape4PointsNewLabel);
        });
    });
});
