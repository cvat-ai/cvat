/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Create and delete a annotation task', () => {

    const caseId = '1'
    const labelName = `Case ${caseId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const image = `image_${labelName.replace(' ', '_').toLowerCase()}.png`
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    let taskID = ''

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
    })

    describe(`Testing "${labelName}"`, () => {
        it('Create a task', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        })
        it('Delete the created task', () => {
            cy.getTaskID(taskName).then($taskID => {
                cy.deleteTask(taskName, $taskID)
                taskID = $taskID
            })
        })
        it('Deleted task not exist', () => {
            cy.contains('strong', `#${taskID}: `)
            .parents('.cvat-tasks-list-item')
            .should('have.attr', 'style', 'pointer-events: none; opacity: 0.5;')
        })
    })
})
