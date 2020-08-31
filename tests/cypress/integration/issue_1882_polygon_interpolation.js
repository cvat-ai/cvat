/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('The points of the previous polygon mustn\'t appear while polygon\'s interpolation.', () => {

    const issueId = '1882'
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

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a polygon', () => {
            cy.createPolygon('Track', [
                                        {x: 309, y: 431},
                                        {x: 360, y: 500},
                                        {x: 320, y: 300},
                                      ])
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'POLYGON TRACK')
        })
        it('Redraw the polygon', () => {
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove', {force: true})
            .trigger('keydown', {key: 'n', shiftKey: true})
            .trigger('keyup', {force: true}, {key: 'n', shiftKey: true})
            cy.createPolygon('Track', [
                                        {x: 359, y: 431},
                                        {x: 410, y: 500},
                                        {x: 370, y: 300},
                                        ],
                                        false, true)
        })
        it('Activate auto bordering mode', () => {
            cy.openSettings()
            cy.get('.ant-modal-content').within(() => {
                cy.contains('Workspace').click()
                cy.get('.cvat-workspace-settings-autoborders').within(() => {
                    cy.get('[type="checkbox"]').check()
                })
            })
            cy.closeSettings()
        })
        it('Old points invisible', () => {
            cy.get('.cvat_canvas_autoborder_point')
            .should('not.exist')
        })
    })
})
