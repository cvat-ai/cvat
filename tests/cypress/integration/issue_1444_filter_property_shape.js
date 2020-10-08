/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Filter property "shape" work correctly', () => {

    const issueId = '1444'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${issueId}.png`
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'white'
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450
    }

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a rectangle shape', () => {
            cy.createRectangle(createRectangleShape2Points)
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'RECTANGLE SHAPE')
        })
        it('Create a polygon', () => {
            cy.createPolygon('Shape', [
                                        {x: 300, y: 100},
                                        {x: 400, y: 400},
                                        {x: 400, y: 250},
                                      ])
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'POLYGON SHAPE')
        })
        it('Input filter "shape == "polygon""', () => {
            cy.get('.cvat-annotations-filters-input')
            .type('shape == "polygon"{Enter}')
        })
        it('Only polygon is visible', () => {
            cy.get('#cvat_canvas_shape_2')
            .should('exist')
            cy.get('#cvat_canvas_shape_1')
            .should('not.exist')
        })
    })
})
