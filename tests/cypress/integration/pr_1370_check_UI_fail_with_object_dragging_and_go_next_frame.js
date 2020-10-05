/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if the UI fails by moving to the next frame while dragging the object', () => {

    const prId = '1370'
    const labelName = `PR ${prId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imagesCount = 3
    let images = []
    for ( let i = 1; i <= imagesCount; i++) {
        images.push(`image_${prId}_${i}.png`)
    }
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    const archiveName = `images_issue_${prId}.zip`
    const archivePath = `cypress/fixtures/${archiveName}`
    const imagesFolder = `cypress/fixtures/image_issue_${prId}`
    const directoryToArchive = imagesFolder
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450
    }

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

    describe(`Testing PR "${prId}"`, () => {
        it('Create object', () => {
            cy.createRectangle(createRectangleShape2Points)
        })
        it('Start object dragging and go to next frame (F).', () => {
            cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove')
            .trigger('mouseover')
            .trigger('mousedown', {which: 1})
            cy.get('body')
            .type('f')
        })
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong')
            .should('not.exist')
        })
    })
})
