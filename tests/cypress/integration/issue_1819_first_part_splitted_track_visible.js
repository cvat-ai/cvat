/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('First part of a splitted track is visible', () => {

    const issueId = '1819'
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
        it('Create a track', () => {
            cy.createTrack(309, 431, 616, 671)
        })
        it('Go next with a step', () => {
            cy.get('.cvat-player-forward-button')
            .click()
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '2')
            })
        })
        it('Split track', () => {
            cy.get('body')
            .type('{alt}m')
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove', {which: 1})
            .trigger('click', {which: 1})
        })
        it('Go to previous frame', () => {
            cy.get('.cvat-player-previous-button')
            .click()
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '1')
            })
        })
        it('First part of a splitted track is visible', () => {
            cy.get('#cvat_canvas_shape_2')
            .should('be.visible')
        })
    })
})
