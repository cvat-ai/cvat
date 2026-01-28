// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export const labelName = 'Main task';
export const taskName = `New annotation task for ${labelName}`;
export const CLIPBOARD_ALIAS = 'copyTextToClipboard';
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const imagesCount = 50;
export const imageFileName = `image_${labelName.replace(/\s+/g, '_').toLowerCase()}`;
export const width = 800;
export const height = 800;
export const posX = 10;
export const posY = 10;
export const color = 'gray';
export const archiveName = `${imageFileName}.zip`;
export const archivePath = `cypress/fixtures/${archiveName}`;
export const imagesFolder = `cypress/fixtures/${imageFileName}`;
export const directoryToArchive = imagesFolder;
export const advancedConfigurationParams = {
    multiJobs: true,
    segmentSize: 10,
    sssFrame: true,
    startFrame: 2,
    stopFrame: imagesCount,
    frameStep: 2,
};
export const multiAttrParams = {
    name: 'Attr 2',
    values: 'Attr value 2',
    type: 'Text',
};

export class ClipboardCtx {
    constructor(selector) {
        Cypress.automation('remote:debugger:protocol', {
            command: 'Browser.grantPermissions',
            params: {
                permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
                origin: window.location.origin,
            },
        });

        this.alias = 'copyTextToClipboard';
        this.ref = '@copyTextToClipboard';
        this.button = selector;
        this.value = null;
    }

    init() {
        cy.window().its('navigator.clipboard').then((clipboard) => {
            cy.spy(clipboard, 'writeText').as(this.alias);
        });
    }

    get spy() {
        return cy.get(this.ref);
    }

    copy() {
        cy.get(this.button).click();
        return this.spy.should('be.called').then((stub) => {
            const last = stub.args.length - 1;
            const actualValue = stub.args[last][0];
            this.value = actualValue;
            return cy.wrap(this.value);
        });
    }
}
