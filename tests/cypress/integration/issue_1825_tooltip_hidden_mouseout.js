/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Tooltip does not interfere with interaction with elements.', () => {

    const issueId = '1825'
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
        it('Mouseover to "Shape" button when draw new rectangle. The tooltip open.', () => {
            cy.get('.cvat-draw-rectangle-control').click()
            cy.get('.cvat-draw-shape-popover-content')
            cy.contains('Shape')
            .invoke('show')
            .trigger('mouseover', 'top')
            .should('have.class', 'ant-tooltip-open')
        })
        it('The radio element was clicked successfully', () => {
            /*Before the fix, cypress can't click on the radio element
            due to its covered with the tooltip. After the fix, cypress
            successfully clicks on the element, but the tooltip does not
            disappear visually.*/
            cy.contains('By 4 Points')
            .click()
        })
    })
})
