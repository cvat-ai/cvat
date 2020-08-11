/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if the new label reflects in the options', () => {

    const issueId='1429'
    const labelName=`Issue ${issueId}`
    const taskName=`New annotation task for ${labelName}`
    const attrName=`Attr for ${labelName}`
    const textDefaultValue='Some default value for type Text'
    const image=`image_${issueId}.png`
    const newLabelName = `New ${labelName}`
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
        it('Return to task page using browser button "previous page"', () => {
            cy.go('back')
            cy.url({ timeout: 7000 }).should('include', '/tasks')
            cy.url().should('not.contain', '/jobs')
        })
        it('Add new label', () => {
            cy.contains('button', 'Add label').click()
            cy.get('[placeholder="Label name"]').type(newLabelName)
            cy.contains('button', 'Done').click()
        })
        it('Open the job again', () => {
            cy.contains('a', 'Job #').click()
            cy.url().should('include', '/jobs')
        })
        it('Create a shape', () => {
            cy.createShape(309, 431, 616, 671)
        })
        it('Check if the new label presents', () => {
            cy.get('.ant-select-sm > .ant-select-selection').click()
            cy.get('li').contains(newLabelName)
        })
    })
})
