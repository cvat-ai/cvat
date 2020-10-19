/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if the UI not to crash after remove a tag', () => {

    const issueId = '1540'
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
        it('Add a tag', () => {
            cy.changeAnnotationMode('Tag annotation')
            cy.get('.cvat-tag-annotation-sidebar-buttons').within(() => {
                cy.get('button')
                .contains('Add tag')
                .click({force: true})
            })
            cy.changeAnnotationMode('Standard')
        })
        it('Remove the tag', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'TAG')
            .trigger('mouseover')
            .trigger('keydown', {key: 'Delete'})
        })
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong')
            .should('not.exist')
        })
    })
})
