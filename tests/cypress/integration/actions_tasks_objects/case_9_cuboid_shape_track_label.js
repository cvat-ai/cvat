/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import {taskName, labelName} from '../../support/const'

context('Actions on Cuboid', () => {

    const caseId = '9'
    const newLabelName = `New label for case ${caseId}`
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450
    }
    const createCuboidShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 350,
        thirdX: 500,
        thirdY: 450,
        fourthX: 400,
        fourthY: 450
    }
    const createCuboidTrack2Points = {
        points: 'From rectangle',
        type: 'Track',
        switchLabel: false,
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY - 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY -150
    }
    const createCuboidTrack4Points = {
        points: 'By 4 Points',
        type: 'Track',
        switchLabel: false,
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY - 150,
        secondX: createCuboidShape4Points.secondX - 100,
        secondY: createCuboidShape4Points.secondY - 50,
        thirdX: createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY - 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY - 150
    }
    const createCuboidShape2PointsNewLabel = {
        labelName: newLabelName,
        points: 'From rectangle',
        type: 'Shape',
        switchLabel: true,
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY + 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY + 150
    }
    const createCuboidShape4PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 4 Points',
        type: 'Shape',
        switchLabel: true,
        firstX: createCuboidShape4Points.firstX,
        firstY: createCuboidShape4Points.firstY + 150,
        secondX: createCuboidShape4Points.secondX,
        secondY: createCuboidShape4Points.secondY + 150,
        thirdX:  createCuboidShape4Points.thirdX,
        thirdY: createCuboidShape4Points.thirdY + 150,
        fourthX: createCuboidShape4Points.fourthX,
        fourthY: createCuboidShape4Points.fourthY + 150
    }

    before(() => {
        cy.openTask(taskName)
    })

    describe(`Testing case "${caseId}"`, () => {
        it('Add new label', () => {
            cy.contains('button', 'Add label').click()
            cy.get('[placeholder="Label name"]').type(newLabelName)
            cy.contains('button', 'Done').click()
        })
        it('Open a job', () => {
            cy.openJob()
        })
        it('Draw a Cuboid shape in two ways (From rectangle, by 4 points)', () => {
            cy.createCuboid(createCuboidShape2Points)
            cy.get('#cvat_canvas_shape_1')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'CUBOID SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createCuboid(createCuboidShape4Points)
            cy.get('#cvat_canvas_shape_2')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'CUBOID SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a Cuboid track in two ways (From rectangle, by 4 points)', () => {
            cy.createCuboid(createCuboidTrack2Points)
            cy.get('#cvat_canvas_shape_3')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'CUBOID TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createCuboid(createCuboidTrack4Points)
            cy.get('#cvat_canvas_shape_4')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-4')
            .should('contain', '4').and('contain', 'CUBOID TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a new Cuboid shape in two ways (From rectangle, by 4 points) with second label', () => {
            cy.createCuboid(createCuboidShape2PointsNewLabel)
            cy.get('#cvat_canvas_shape_5')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-5')
            .should('contain', '5').and('contain', 'CUBOID SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
            cy.createCuboid(createCuboidShape4PointsNewLabel)
            cy.get('#cvat_canvas_shape_6')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-6')
            .should('contain', '6').and('contain', 'CUBOID SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })

        })
    })
})
