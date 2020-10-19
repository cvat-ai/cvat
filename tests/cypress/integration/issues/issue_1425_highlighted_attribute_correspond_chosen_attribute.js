/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('The highlighted attribute in AAM should correspond to the chosen attribute', () => {

    const issueId = '1425'
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
    const multiAttrParams = {
        additionalAttrName: `Attr 2`,
        additionalValue: `Attr value 2`,
        typeAttribute: 'Text'
    }
    let textValue = ''
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
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a task with multiple attributes, create a object', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image, multiAttrParams)
            cy.openTaskJob(taskName)
            cy.createRectangle(createRectangleShape2Points)
        })
        it('Go to AAM', () => {
            cy.changeAnnotationMode('Attribute annotation')
        })
        it('Check if highlighted attribute correspond to the chosen attribute in right panel', () => {
            cy.get('.cvat_canvas_text').within(() => {
                cy.get('[style="fill: red;"]').then($textValue => {
                    textValue = $textValue.text().split(': ')[1]
                })
            })
            cy.get('.attribute-annotation-sidebar-attr-editor').within(() => {
                cy.get('[type="text"]').should('have.value', textValue)
            })
        })
        it('Go to next attribute and check again', () => {
            cy.get('.attribute-annotation-sidebar-attribute-switcher')
            .find('.anticon-right')
            .click({force: true})
            cy.get('.cvat_canvas_text').within(() => {
                cy.get('[style="fill: red;"]').then($textValue => {
                    textValue = $textValue.text().split(': ')[1]
                })
            })
            cy.get('.attribute-annotation-sidebar-attr-editor').within(() => {
                cy.get('[type="text"]').should('have.value', textValue)
            })
        })
    })
})
