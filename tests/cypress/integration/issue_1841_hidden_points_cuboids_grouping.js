/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Hidden objects mustn\'t consider when we want to group visible objects only and use an grouping area for it.', () => {

    const issueId = '1841'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${issueId}.png`
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'white'
    let bgcolor = ''

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Change appearance to "Group"', () => {
            cy.changeAppearance('Group')
        })
        it('Create three points as different objects', () => {
            cy.createPoint(300, 410)
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'POINTS SHAPE')
            cy.createPoint(350, 410)
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'POINTS SHAPE')
            cy.createPoint(400, 410)
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'POINTS SHAPE')
            .should('have.attr', 'style').then(($bgcolor) => {
                bgcolor = $bgcolor // Get style attr "background-color"
            })
        })
        it('Hide the last point', () => {
            cy.get('#cvat-objects-sidebar-state-item-3')
            .find('.anticon-eye')
            .click()
            cy.get('#cvat-objects-sidebar-state-item-3')
            .find('.anticon-eye-invisible')
            .should('exist')
        })
        it('Group the created points', () => {
            cy.shapeGrouping(250, 380, 430, 450)
        })
        it('The hidden point is not grouping', () => {
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('have.attr', 'style', bgcolor) // "background-color" should not be changed
        })
    })
})
