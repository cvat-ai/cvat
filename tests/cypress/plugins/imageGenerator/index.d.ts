/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable<Subject> {
        /**
         * @example
         * cy.imageGenerator('./fixtures', 'image.png', 500, 500, 'gray', 'Hello world!')
         */
        downloadFile(directory: string, fileName: string, width: number, height: number, color: string, message: string): Chainable<any>
    }
}
