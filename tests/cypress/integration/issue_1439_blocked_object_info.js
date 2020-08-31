/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Information about a blocked object disappears if hover the cursor over another object', () => {

    const issueId = '1439'
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
            cy.createShape(309, 431, 409, 531)
            cy.createShape(200, 300, 300, 400)
        })
        it('Lock all objects', () => {
            cy.get('.cvat-objects-sidebar-states-header')
            .find('.anticon-unlock')
            .click()
        })
        it('Mousemove to 1st object', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove')
        })
        it('Mousemove to 2nd object', () => {
            cy.get('#cvat_canvas_shape_2').trigger('mousemove')
        })
        it('Information about 1st object not exist', () => {
            cy.get('#cvat_canvas_text_content')
            .contains(`${labelName} 1`)
            .should('not.exist')
        })
    })
})
