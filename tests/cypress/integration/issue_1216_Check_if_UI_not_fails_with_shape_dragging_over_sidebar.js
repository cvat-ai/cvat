/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if UI not fails with shape dragging over sidebar', () => {

    const issueId = '1216'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${issueId}.png`
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
        cy.openTaskJob(taskName)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create multiple objects', () => {
            /* The error was repeated when the number of
            objects was more than or equal to 2 */
            cy.createShape(309, 431, 409, 531)
            cy.createShape(200, 300, 300, 400)
        })
        it('Shape dragging over sidebar.', () => {
            /*To reproduce the error, move the any shape under any
            #cvat-objects-sidebar-state-item-*. */
            cy.get('#cvat_canvas_shape_2')
            .trigger('mousemove')
            .trigger('mouseover')
            .trigger('mousedown', {which: 1})
        })
        it('There is no error like "Canvas is busy. Action: drag" in the console', () => {
            cy.get('body')
            /*Since cy.click () contains events such as
            mousemove, mouseover, etc. Use it to reduce lines of code.*/
            .click(1299, 300)
        })
    })
})
