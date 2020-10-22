/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Actions on points', () => {

    const caseId = '12'
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
    const createPointsShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            {x: 200, y: 200},
            {x: 250, y: 200},
            {x: 250, y: 250},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPointsTrack = {
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            {x: 300, y: 200},
            {x: 350, y: 200},
            {x: 350, y: 350},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPointsShapePoints = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            {x: 400, y: 200},
            {x: 450, y: 200},
            {x: 450, y: 250},
            {x: 400, y: 350},
            {x: 380, y: 330},
            ],
        numberOfPoints: 5
    }
    const createPointsTrackPoints = {
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            {x: 500, y: 200},
            {x: 550, y: 200},
            {x: 550, y: 250},
            {x: 500, y: 350},
            {x: 480, y: 330},
            ],
        numberOfPoints: 5
    }
    const createPointsShapeSwitchLabel = {
        type: 'Shape',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            {x: 600, y: 200},
            {x: 650, y: 200},
            {x: 650, y: 250},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPointsTrackSwitchLabel = {
        type: 'Track',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            {x: 700, y: 200},
            {x: 750, y: 200},
            {x: 750, y: 250},
            ],
        complete: true,
        numberOfPoints: null
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
        it('Draw a points shape, track', () => {
            cy.createPoint(createPointsShape)
            cy.get('#cvat_canvas_shape_1')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'POINTS SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createPoint(createPointsTrack)
            cy.get('#cvat_canvas_shape_2')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'POINTS TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a points shape, track with use parameter "number of points"', () => {
            cy.createPoint(createPointsShapePoints)
            cy.get('#cvat_canvas_shape_3')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'POINTS SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createPoint(createPointsTrackPoints)
            cy.get('#cvat_canvas_shape_4')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-4')
            .should('contain', '4').and('contain', 'POINTS TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a points shape, track with second label', () => {
            cy.createPoint(createPointsShapeSwitchLabel)
            cy.get('#cvat_canvas_shape_5')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-5')
            .should('contain', '5').and('contain', 'POINTS SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
            cy.createPoint(createPointsTrackSwitchLabel)
            cy.get('#cvat_canvas_shape_6')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-6')
            .should('contain', '6').and('contain', 'POINTS TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
    })
})
