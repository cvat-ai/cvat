/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if parameters "startFrame", "stopFrame", "frameStep" works as expected', () => {

    const caseId = '3'
    const labelName = `Case ${caseId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imagesCount = 10
    let images = []
    for ( let i = 1; i <= imagesCount; i++) {
        images.push(`image_${labelName.replace(' ', '_').toLowerCase()}_${i}.png`)
    }
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    const archiveName = `images_${labelName.replace(' ', '_').toLowerCase()}.zip`
    const archivePath = `cypress/fixtures/${archiveName}`
    const imagesFolder = `cypress/fixtures/image_${labelName.replace(' ', '_').toLowerCase()}`
    const directoryToArchive = imagesFolder
    const advancedConfiguration = true
    const multiJobs = false
    const sssFrame = true
    const startFrame = 2
    const stopFrame = 8
    const frameStep = 2

    before(() => {
        cy.visit('auth/login')
        cy.login()
        for (let img of images) {
            cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
        }
        cy.createZipArchive(directoryToArchive, archivePath)
    })

    describe(`Testing "${labelName}"`, () => {
        it('Create a task. Open the task.', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName,
                false, '', '', '', advancedConfiguration, multiJobs, '', sssFrame, startFrame, stopFrame, frameStep)
            cy.openTaskJob(taskName)
        })
        it('Parameters "startFrame", "stopFrame", "frameStep" works as expected ', () => {
            cy.get('.cvat-player-filename-wrapper')
            .should('contain', `image_${labelName.replace(' ', '_').toLowerCase()}_${startFrame}.png`)
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '0')
            })
            cy.get('.cvat-player-next-button')
            .click()
            cy.get('.cvat-player-filename-wrapper')
            .should('contain', `image_${labelName.replace(' ', '_').toLowerCase()}_${startFrame + frameStep}.png`)
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '1')
            })
            cy.get('.cvat-player-last-button')
            .click()
            cy.get('.cvat-player-filename-wrapper')
            .should('contain', `image_${labelName.replace(' ', '_').toLowerCase()}_${stopFrame}.png`)
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '3')
            })
        })
    })
})
