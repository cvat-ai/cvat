/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Points track it is still invisible on next frames', () => {

    const issueId = '1368'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const images = [`image_${issueId}_1.png`,
                    `image_${issueId}_2.png`,
                    `image_${issueId}_3.png`]
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'white'
    const archiveName = `images_issue_${issueId}.zip`
    const archivePath = `cypress/fixtures/${archiveName}`
    const imagesFolder = `cypress/fixtures/image_issue_${issueId}`
    const directoryToArchive = imagesFolder

    before(() => {
        cy.visit('auth/login')
        cy.login()
        for (let img of images) {
            cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
        }
        cy.createZipArchive(directoryToArchive, archivePath)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName)
        cy.openTaskJob(taskName)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a points track', () => {
            cy.createPoint(300, 410, 'Track')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'POINTS TRACK')
        })
        it('Switch outside property', () => {
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove')
            .trigger('mouseover')
            cy.get('body')
            .type('o')
            cy.get('#cvat_canvas_shape_1')
            .should('be.hidden')
        })
        it('Point track on the next frame should not exist', () => {
            cy.get('.cvat-player-next-button')
            .click()
            cy.get('#cvat_canvas_shape_1')
            .should('not.exist')
        })
    })
})
