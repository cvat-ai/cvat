/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Actions on rectangle', () => {

    const caseId = '8'
    const labelName = `Case ${caseId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`
    const image = `${imageFileName}.png`
    const newLabelName = `New ${labelName}`
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450
    }
    const createRectangleShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 350,
        thirdX:  500,
        thirdY: 450,
        fourthX: 400,
        fourthY: 450
    }
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        switchLabel: false,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY -150
    }
    const createRectangleTrack4Points = {
        points: 'By 4 Points',
        type: 'Track',
        switchLabel: false,
        firstX: createRectangleShape4Points.firstX,
        firstY: createRectangleShape4Points.firstY - 150,
        secondX: createRectangleShape4Points.secondX - 100,
        secondY: createRectangleShape4Points.secondY - 50,
        thirdX: createRectangleShape4Points.thirdX,
        thirdY: createRectangleShape4Points.thirdY - 150,
        fourthX: createRectangleShape4Points.fourthX,
        fourthY: createRectangleShape4Points.fourthY - 150
    }
    const createRectangleShape2PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: true,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY + 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY + 150
    }
    const createRectangleShape4PointsNewLabel = {
        labelName: newLabelName,
        points: 'By 4 Points',
        type: 'Shape',
        switchLabel: true,
        firstX: createRectangleShape4Points.firstX,
        firstY: createRectangleShape4Points.firstY + 150,
        secondX: createRectangleShape4Points.secondX,
        secondY: createRectangleShape4Points.secondY + 150,
        thirdX:  createRectangleShape4Points.thirdX,
        thirdY: createRectangleShape4Points.thirdY + 150,
        fourthX: createRectangleShape4Points.fourthX,
        fourthY: createRectangleShape4Points.fourthY + 150
    }

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
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
        it('Draw a rectangle shape in two ways (by 2 points, by 4 points)', () => {
            cy.createRectangle(createRectangleShape2Points)
            cy.get('#cvat_canvas_shape_1')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createRectangle(createRectangleShape4Points)
            cy.get('#cvat_canvas_shape_2')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a rectangle track in two ways (by 2 points, by 4 points)', () => {
            cy.createRectangle(createRectangleTrack2Points)
            cy.get('#cvat_canvas_shape_3')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'RECTANGLE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createRectangle(createRectangleTrack4Points)
            cy.get('#cvat_canvas_shape_4')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-4')
            .should('contain', '4').and('contain', 'RECTANGLE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a new rectangle shape in two ways (by 2 points, by 4 points) with second label', () => {
            cy.createRectangle(createRectangleShape2PointsNewLabel)
            cy.get('#cvat_canvas_shape_5')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-5')
            .should('contain', '5').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
            cy.createRectangle(createRectangleShape4PointsNewLabel)
            cy.get('#cvat_canvas_shape_6')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-6')
            .should('contain', '6').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })

        })
    })
})
