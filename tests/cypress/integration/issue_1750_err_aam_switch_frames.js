/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('An error occurs in AAM when switching to 2 frames, if the frames have objects created in shape mode', () => {

    const issueId = '1750'
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
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450
    }
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY -150
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

    describe(`Testing issue "${issueId}"`, () => {
        it('Create multiple objects', () => {
            cy.createRectangle(createRectangleShape2Points)
            cy.createRectangle(createRectangleShape2PointsSecond)
        })
        it('Go to AAM', () => {
            cy.get('.cvat-workspace-selector')
            .click()
            cy.get('.ant-select-dropdown-menu-item')
            .contains('Attribute annotation')
            .click()
            .should('contain.text', 'Attribute annotation')
        })
        it('Go to next frame', () => {
            cy.get('.cvat-player-next-button')
            .click()
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '1')
            })
        })
        it('Go to previous frame', () => {
            cy.get('.cvat-player-previous-button')
            .click()
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                .should('have.value', '0')
            })
        })
        it('Go to next object', () => {
            cy.get('.attribute-annotation-sidebar-object-switcher')
            .should('contain', `${labelName} 1 [1/2]`)
            .find('.anticon-right')
            .click({force: true})
        })
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong')
            .should('not.exist')
            cy.get('.attribute-annotation-sidebar-object-switcher')
            .should('contain', `${labelName} 2 [2/2]`)
        })
    })
})
