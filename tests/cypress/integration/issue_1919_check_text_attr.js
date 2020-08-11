/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check label attribute changes', () => {

    const issueId='1919'
    const labelName=`Issue ${issueId}`
    const taskName=`New annotation task for ${labelName}`
    const attrName=`Attr for ${labelName}`
    const textDefaultValue='Some default value for type Text'
    const image=`image_${issueId}.png`
    const newLabelAttrValue = 'New attribute value'
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
        it('Open object menu on the created shape', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').rightclick()
        })
        it('Open object menu details', () => {
            cy.get('.cvat-canvas-context-menu > [style="display: flex; margin-bottom: 1px;"] > #cvat-objects-sidebar-state-item-1 > .ant-row > .ant-collapse > .ant-collapse-item > .ant-collapse-header > span')
            .should('contain', 'Details')
            .click()
        })
        it('Clear field of text attribute and write new value', () => {
            cy.get('.cvat-canvas-context-menu > [style="display: flex; margin-bottom: 1px;"] > #cvat-objects-sidebar-state-item-1 > .ant-row > .ant-collapse > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box > .ant-row-flex > .ant-col-16 > .ant-input')
            .clear().type(newLabelAttrValue)
        })
        it('Check what value of right panel is changed too', () => {
            cy.get('.cvat-objects-sidebar-states-list > [style="display: flex; margin-bottom: 1px;"] > #cvat-objects-sidebar-state-item-1 > .ant-row > .ant-collapse > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box > .ant-row-flex > .ant-col-16 > .ant-input')
            .should('have.value', newLabelAttrValue)
        })
    })
})
