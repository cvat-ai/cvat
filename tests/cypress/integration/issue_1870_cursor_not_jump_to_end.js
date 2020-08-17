/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Checks that the cursor doesn\'t automatically jump to the end of a word when the attribute value changes', () => {

    const issueId = '1870'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'text'
    const image = `image_${issueId}.png`
    const newLabelAttrValue = 'teeext'
    const width = 800
    const height = 800
    const posX=10
    const posY=10
    const color='gray'

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
        cy.createShape(309, 431, 616, 671)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Enter 2 characters in the middle of the word attribute value and check the result', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
            .find('.ant-collapse-item')
            .click()
            .find('.cvat-object-item-text-attribute')
            .type('{leftarrow}{leftarrow}ee')
            .should('have.value', newLabelAttrValue)
        })
    })
})
