/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Dump annotation if cuboid created', () => {

    const issueId = '1568'
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
        it('Create a cuboid', () => {
            cy.createCuboid('Shape', 309, 431, 616, 671)
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'CUBOID SHAPE')
        })
        it('Dump an annotation', () => {
            cy.get('.cvat-annotation-header-left-group').within(() => {
                cy.get('[title="Save current changes [Ctrl+S]"]')
                cy.get('button').contains('Save')
                .click({force: true})
                cy.get('button').contains('Menu')
                .trigger('mouseover',{force: true})
            })
            cy.get('.cvat-annotation-menu').within(() => {
                cy.get('[title="Dump annotations"]')
                .trigger('mouseover')
            })
            cy.get('.cvat-menu-dump-submenu-item').within(() => {
                cy.contains('Datumaro')
                .click()
            })
        })
        it('Error notification is ot exists', () => {
            cy.wait(5000)
            cy.get('.ant-notification-notice')
            .should('not.exist')
        })
    })
})
