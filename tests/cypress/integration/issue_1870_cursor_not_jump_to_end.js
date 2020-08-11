/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Checks that the cursor doesn\'t automatically jump to the end of a word when the attribute value changes', () => {

    const issueId='1870'
    const labelName=`Issue ${issueId}`
    const taskName=`New annotation task for ${labelName}`
    const attrName=`Attr for ${labelName}`
    const textDefaultValue='text'
    const image=`image_${issueId}.png`
    const newLabelAttrValue = 'teeext'
    const width='800'
    const height='800'
    const posX=10
    const posY=10
    const color='gray'

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.get('[type="submit"]').click()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
    })

    describe(`Open task "${taskName}"`, () => {
        it('The annotation task present in the list', () => {
            cy.contains('strong', taskName)
            .parent()
            .parent()
            .parent()
            .contains('a', 'Open').click()
        })
        it('Open a job', () => {
            cy.contains('a', 'Job #').click()
            cy.url().should('include', '/jobs')
        })
        it('Create a shape', () => {
            cy.createShape(309, 431, 616, 671)
        })
        it('Check what cursor doesn\'t automatically jumps at the end of the word', () => {
            cy.get('.ant-row > .ant-collapse > .ant-collapse-item > .ant-collapse-header > span')
            .should('contain', 'Details')
            .click()
            cy.get('.ant-input')
            .type('{leftarrow}{leftarrow}ee')
            cy.get('.ant-input')
            .should('have.value', newLabelAttrValue)
        })
    })
})
