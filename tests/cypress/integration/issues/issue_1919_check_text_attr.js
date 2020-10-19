/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check label attribute changes', () => {

    const issueId = '1919'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${issueId}.png`
    const newLabelAttrValue = 'New attribute value'
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

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
        cy.createRectangle(createRectangleShape2Points)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Open object menu', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').rightclick()
        })
        it('Open object menu details', () => {
            cy.get('.cvat-canvas-context-menu')
            .contains('Details')
            .click()
        })
        it('Clear field of text attribute and write new value', () => {
            cy.get('.cvat-canvas-context-menu')
            .find('.cvat-object-item-text-attribute')
            .should('have.value', textDefaultValue)
            .clear()
            .type(newLabelAttrValue)
        })
        it('Check what value of right panel is changed too', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
            .find('.cvat-object-item-text-attribute')
            .should('have.value', newLabelAttrValue)
        })
    })
})
