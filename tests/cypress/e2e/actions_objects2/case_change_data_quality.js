// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Change data quality switch.', () => {
    const labelName = 'Change data quality test';
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = `image_${labelName.replace(/ /g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = {
        chunkSize: 1,
    };

    before(() => {
        cy.visit('/');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist');
        cy.document().then((doc) => {
            const tasks = Array.from(doc.querySelectorAll('.cvat-item-task-name')).map((el) => el.innerText);
            if (!tasks.includes(taskName)) {
                cy.task('log', 'Task does not exist. Creating.');
                cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
                cy.createZipArchive(directoryToArchive, archivePath);
                cy.createAnnotationTask(
                    taskName, labelName, attrName, textDefaultValue, archiveName,
                    null, advancedConfigurationParams,
                );
            } else {
                cy.task('log', 'Task already exists. Skipping creation.');
            }
        });
        cy.openTaskJob(taskName);
    });

    describe('Tests feature to switch between downloading original and compressed chunks.', () => {
        it('Check switching to show original changes query to quality=original.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-data-quality-checkbox').within(() => {
                cy.get('[type="checkbox"]').should('not.be.checked').check();
            });
            cy.closeSettings();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.goToNextFrame(1);
            cy.wait('@chunkGet');
            cy.goToNextFrame(2);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url).to.include('quality=original');
            });
        });

        it('Change back to compressed and check next chunk.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-data-quality-checkbox').within(() => {
                cy.get('[type="checkbox"]').should('be.checked').uncheck();
            });
            cy.closeSettings();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.goToNextFrame(3);
            cy.wait('@chunkGet');
            cy.goToNextFrame(4);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url).to.include('quality=compressed');
            });
        });
    });
});
