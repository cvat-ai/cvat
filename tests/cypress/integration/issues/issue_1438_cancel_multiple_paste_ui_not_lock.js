/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Cancel "multiple paste". UI is not locked.', () => {

    const issueId = '1438'
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
        it('Copy, paste opject. Cancel pasting.', () => {
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove')
            .trigger('mouseover')
            cy.get('body')
            .type('{ctrl}c')
            .type('{ctrl}v')
            .click({ctrlKey: true})
            .type('{esc}')
        })
        it('UI is not locked.', () => {
            cy.get('.cvat-draw-rectangle-control').click()
            cy.get('.cvat-draw-shape-popover-content')
            .should('be.visible')
        })
    })
})
