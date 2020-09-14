/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Being able to return to the job list for a task and start a new job without an infinite loading screen.', () => {

    const issueId = '1944'
    const labelName = `Issue ${issueId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imagesCount = 4
    let images = []
    for ( let i = 1; i <= imagesCount; i++) {
        images.push(`image_${issueId}_${i}.png`)
    }
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    const archiveName = `images_issue_${issueId}.zip`
    const archivePath = `cypress/fixtures/${archiveName}`
    const imagesFolder = `cypress/fixtures/image_issue_${issueId}`
    const directoryToArchive = imagesFolder
    const advancedConfigurationParams = {
        multiJobs: true,
        segmentSize: 1
    }

    before(() => {
        cy.visit('auth/login')
        cy.login()
        for (let img of images) {
            cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
        }
        cy.createZipArchive(directoryToArchive, archivePath)
    })

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a multijob task', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName,
                null, advancedConfigurationParams)
        })
        it('Open the task. Open first job', () => {
            cy.openTaskJob(taskName)
            cy.get('input[role="spinbutton"]')
            .should('have.value', '0')
        })
        it('Return to tasks page', () => {
            cy.get('[value="tasks"]').click()
            cy.url().should('include', '/tasks').and('not.contain', '/jobs')
        })
        it('Open the task. Open second job', () => {
            cy.openTaskJob(taskName, 1)
            cy.get('.cvat-annotation-header')
            .should('exist')
            cy.get('input[role="spinbutton"]')
            .should('have.value', '1')
        })
    })
})
