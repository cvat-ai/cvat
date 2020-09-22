/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if image was scaled to ROI', () => {

    const caseId = '7'
    const labelName = `Case ${caseId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`
    const image = `${imageFileName}.png`
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

    describe(`Testing "${labelName}"`, () => {
        it('Create ROI', () => {
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'scale(1.065)')
            cy.get('.cvat-resize-control')
            .click()
            cy.get('.cvat-canvas-container')
            .trigger('mousedown', 309, 431, {which: 1})
            .trigger('mousemove', 616, 671)
            .trigger('mouseup', 616, 671)
        })
        it('Image scaled to ROI', () => {
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('not.contain', 'scale(1.065)')
        })
    })
})
