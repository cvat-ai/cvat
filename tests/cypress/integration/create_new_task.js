/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

context('Create an annotation task', () => {
    before(() => {
        cy.visit('auth/login')
        cy.login()
        cy.get('[type="submit"]').click()
    })

    describe('Creation a new task', () => {
        it('Click to "Create new task" button', () => {
            cy.contains('button', 'Create new task').click()
            cy.url().should('include', 'tasks/create')
        })
        it('tasks/create is reachiable', () => {
            cy.url().should('include', 'tasks/create')
        })
        it('Filling in the "Name" field', () => {
            cy.get('[id="name"]').type('New annotation task for testing')
        })
        it('Click to "Add label" button', () => {
            cy.contains('button', 'Add label').click()
        })
        it('Filling in the plaseholder "Label name"', () => {
            cy.get('[placeholder="Label name"]').type('Car')
        })
        it('Click to "Done" button', () => {
            cy.contains('button', 'Done').click()
        })
        it('Upload file', () => {
            const image = 'image.jpg'
            cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' });
        })
        it('Click to "Submit" button', () => {
            cy.contains('button', 'Submit').click()
            cy.contains('The task has been created', {timeout: '8000'})
        })
        it('Return to the list of annotation tasks', () => {
            cy.get('button[value="tasks"]').click()
            cy.url().should('include', 'tasks?page=')
        })
        it('Created annotation task present in the list', () => {
            cy.contains('strong', 'New annotation task for testing')
            cy.contains('a', 'Open')
        })
    })
})
