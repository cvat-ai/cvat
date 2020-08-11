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
    const width = '800'
    const height = '800'
    const posX=10
    const posY=10
    const color = 'gray'
    const archiveName = `images_issue_${issueId}.zip`
    const archivePath = `cypress/fixtures/${archiveName}`
    const imagesFolder = `cypress/fixtures/image_issue_${issueId}`
    const lastElement = images[images.length - 1];

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.get('[type="submit"]').click()
        for (let img of images) {
            cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
        }
        cy.wait(2000)
        cy.createZipArchive(imagesFolder, archivePath)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName)
    })

    describe(`Open task "${taskName}"`, () => {
        it('The annotation task present in the list', () => {
            cy.contains('strong', taskName)
            .parent()
            .parent()
            .parent()
            .contains('a', 'Open').click()
        })
        it('Open a job', () => {
            cy.contains('a', 'Job #').click()
            cy.url().should('include', '/jobs')
        })
        it('Go to the last frame', () => {
            cy.get(':nth-child(7) > svg > path', {timeout:5000}).click()
            cy.contains('span', lastElement)
        })
        it('Create a shape', () => {
            cy.createShape(309, 431, 616, 671)
        })
        it('Try to propagate', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove')
            cy.get('body').type('{ctrl}b')
            cy.contains('button', 'Yes').click()
            cy.get('.ant-notification-notice').should('not.exist')
        })
    })
})
