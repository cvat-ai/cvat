/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

export const labelName = `Main task`
export const taskName = `New annotation task for ${labelName}`
export const attrName = `Attr for ${labelName}`
export const textDefaultValue = 'Some default value for type Text'
export const imagesCount = 30
export const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`
export let images = []
for ( let i = 1; i <= imagesCount; i++) {
    images.push(`${imageFileName}_${i}.png`)
}
export const width = 800
export const height = 800
export const posX = 10
export const posY = 10
export const color = 'gray'
export const archiveName = `${imageFileName}.zip`
export const archivePath = `cypress/fixtures/${archiveName}`
export const imagesFolder = `cypress/fixtures/${imageFileName}`
export const directoryToArchive = imagesFolder
export const advancedConfigurationParams = {
    multiJobs: true,
    segmentSize: 3,
    sssFrame: true,
    startFrame: 2,
    stopFrame: imagesCount,
    frameStep: 2
}
export const multiAttrParams = {
    additionalAttrName: `Attr 2`,
    additionalValue: `Attr value 2`,
    typeAttribute: 'Text'
}

it('Prepare to testing', () => {
    cy.visit('/')
    cy.login()
    cy.get('.cvat-tasks-page').then(($taskList) => {
        if ($taskList.find('.cvat-task-item-description').length === 0) {
            for (let img of images) {
                cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
            }
            cy.createZipArchive(directoryToArchive, archivePath)
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName,
                multiAttrParams, advancedConfigurationParams)
        }
    })
})
