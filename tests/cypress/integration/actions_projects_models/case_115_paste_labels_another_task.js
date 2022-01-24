// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Paste labels from another task.', { browser: '!firefox' }, () => {
    const caseID = '115';
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
    };

    const project = {
        name: `Case ${caseID}`,
        label: 'Car',
        attrName: 'Color',
        attrVaue: 'Red',
    };

    const imagesCount = 1;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    before(() => {
        cy.visit('/');
        cy.login();
        // cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        // cy.createZipArchive(directoryToArchive, archivePath);
        // cy.goToTaskList();
        // cy.createAnnotationTask(task.name, task.label, task.attrName, task.attrValue, archiveName);
    });

    // after(() => {
    //     cy.goToProjectsList();
    //     cy.deleteProject(project.name);
    //     cy.goToTaskList();
    //     cy.deleteTask(task.name);
    // });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Copying a label from a task via the raw editor.', () => {
            cy.openTask(task.name);
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer').focus().type('{selectall}');
            cy.document().then((doc) => {
                // this currently doesn't work unless you manually put focus
                //  into the AUT preview window (e.g. by clicking)
                doc.execCommand('copy');
            });
            cy.get('.cvat-raw-labels-viewer').focus().type('{del}');
            cy.document().then((doc) => {
                // this currently doesn't work unless you manually put focus
                //  into the AUT preview window (e.g. by clicking)
                doc.execCommand('paste');
            });
        });

        it.skip('Creating a project with copying labels from the task.', () => {
            cy.goToProjectsList();
            cy.get('.cvat-create-project-button').click();
        });
    });
});
