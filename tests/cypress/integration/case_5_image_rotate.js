/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Check if the image is rotated', () => {

    const caseId = '5'
    const labelName = `Case ${caseId}`
    const taskName = `New annotation task for ${labelName}`
    const attrName = `Attr for ${labelName}`
    const textDefaultValue = 'Some default value for type Text'
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`
    const image = `${imageFileName}.png`
    const width = 800
    const height = 800
    const posX = 10
    const posY = 10
    const color = 'gray'
    function rotateClockwise() {
        cy.get('.cvat-canvas-container')
        .trigger('keydown', {key: 'Control'})
        .trigger('keydown', {key: 'r'})
        .trigger('keyup', {key: 'r'})
        .trigger('keyup', {key: 'Control'})
    }
    function rotateAnticlockwise() {
        cy.get('.cvat-canvas-container')
        .trigger('keydown', {key: 'Control'})
        .trigger('keydown', {key: 'Shift'})
        .trigger('keydown', {key: 'r'})
        .trigger('keyup', {key: 'r'})
        .trigger('keyup', {key: 'Control'})
        .trigger('keyup', {key: 'Shift'})
    }

    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.imageGenerator('cypress/fixtures', image, width, height, color, posX, posY, labelName)
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, image)
        cy.openTaskJob(taskName)
    })

    describe(`Testing "${labelName}"`, () => {
        it('Rotate image clockwise 90deg', () => {
            rotateClockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(90deg);')
        })
        it('Rotate image clockwise 180deg', () => {
            rotateClockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(180deg);')
        })
        it('Rotate image clockwise 270deg', () => {
            rotateClockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(270deg);')
        })
        it('Rotate image clockwise 360deg', () => {
            rotateClockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(0deg);')
        })
        it('Rotate image anticlockwise 90deg', () => {
            rotateAnticlockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(270deg);')
        })
        it('Rotate image anticlockwise 180deg', () => {
            rotateAnticlockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(180deg);')
        })
        it('Rotate image anticlockwise 270deg', () => {
            rotateAnticlockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(90deg);')
        })
        it('Rotate image anticlockwise 360deg', () => {
            rotateAnticlockwise()
            cy.get('#cvat_canvas_background')
            .should('have.attr', 'style').and('contain', 'rotate(0deg);')
        })
    })
})
