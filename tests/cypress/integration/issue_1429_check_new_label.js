/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if the new label reflects in the options', () => {

    const issueId = '1429'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${issueId}.png`
    const newLabelName = `New ${labelName}`
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
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Open a task. Open a job', () => {
            cy.openTaskJob(taskName)
        })
        it('Return to task page using browser button "previous page"', () => {
            cy.go('back')
            cy.url().should('include', '/tasks').and('not.contain', '/jobs')
        })
        it('Add new label', () => {
            cy.contains('button', 'Add label').click()
            cy.get('[placeholder="Label name"]').type(newLabelName)
            cy.contains('button', 'Done').click()
        })
        it('Open the job again', () => {
            cy.openJob()
        })
        it('Create a shape', () => {
            cy.createShape(309, 431, 616, 671)
        })
        it('Checking for the new label', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
            .find('.ant-select-selection')
            .click()
            cy.get('.ant-select-dropdown-menu-item')
            .should('contain', newLabelName)
        })
    })
})
