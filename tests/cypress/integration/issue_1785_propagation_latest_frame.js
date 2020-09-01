/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check propagation work from the latest frame', () => {

    const issueId = '1785'
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
    const color = 'gray'
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
        it('Go to the last frame', () => {
            cy.get('.cvat-player-last-button')
            .click()
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '2')
            })
        })
        it('Create a shape', () => {
            cy.createShape(309, 431, 616, 671)
        })
        it('Try to propagate', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove')
            cy.get('body').type('{ctrl}b')
            cy.get('.ant-modal-content')
            .find('.ant-btn-primary')
            .click()
            cy.get('.ant-notification-notice').should('not.exist')
        })
    })
})
