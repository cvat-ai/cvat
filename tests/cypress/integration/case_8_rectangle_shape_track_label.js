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
            cy.createShape(250, 350, 350, 450)
            cy.get('#cvat_canvas_shape_1')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createShape(400, 350, 500, 350, 'By 4 Points', 500, 450, 400, 350)
            cy.get('#cvat_canvas_shape_2')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a rectangle track in two ways (by 2 points, by 4 points)', () => {
            cy.createTrack(250, 150, 350, 250)
            cy.get('#cvat_canvas_shape_3')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'RECTANGLE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createTrack(400, 150, 500, 150, 'By 4 Points', 500, 250, 400, 250)
            cy.get('#cvat_canvas_shape_4')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-4')
            .should('contain', '4').and('contain', 'RECTANGLE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a new rectangle shape in two ways (by 2 points, by 4 points) with second label', () => {
            cy.createShape(250, 550, 350, 650, 'By 2 Points', '', '', '', '', true, newLabelName)
            cy.get('#cvat_canvas_shape_5')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-5')
            .should('contain', '5').and('contain', 'RECTANGLE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
            cy.createShape(400, 550, 500, 550, 'By 4 Points', 500, 650, 400, 650, true, newLabelName)
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
