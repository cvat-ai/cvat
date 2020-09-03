/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check hide functionality (H)', () => {

    const issueId = '1433'
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
        cy.createShape(309, 431, 616, 671)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Object is hidden', () => {
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove')
            .trigger('mouseover')
            .trigger('keydown', {key: 'h'})
            .should('be.hidden')
        })
    })
})
