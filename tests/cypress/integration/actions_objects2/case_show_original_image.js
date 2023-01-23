// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Change switch between compressed and original images.', () => {
    const labelName = 'Show Original Test';
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
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
        const listItems = [];
        cy.document().then((doc) => {
            const collection = Array.from(doc.querySelectorAll('.cvat-item-task-name'));
            for (let i = 0; i < collection.length; i++) {
                listItems.push(collection[i].innerText);
            }
            if (listItems.indexOf(taskName) === -1) {
                cy.task('log', 'A task doesn\'t exist. Creating.');
                cy.imageGenerator(
                    imagesFolder,
                    imageFileName,
                    width,
                    height,
                    color,
                    posX,
                    posY,
                    labelName,
                    imagesCount
                );
                cy.createZipArchive(directoryToArchive, archivePath);
                cy.createAnnotationTask(
                    taskName,
                    labelName,
                    attrName,
                    textDefaultValue,
                    archiveName,
                    null,
                    advancedConfigurationParams,
                );
            } else {
                cy.task('log', 'The task exist. Skipping creation.');
            }
        });
        cy.openTaskJob(taskName);
    });

    describe('Tests feature to switch between downloading original and compressed chunks.', () => {
        it('Check switching to show original changes query to quality=original.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-show-original').within(() => {
                cy.get('[type="checkbox"]').should('not.be.checked').check();
            });
            cy.closeSettings();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.goToNextFrame(1);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url.includes('quality=original')).to.eq(true);
            });
        });

        it('Change back to compressed and check next chunk.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-show-original').within(() => {
                cy.get('[type="checkbox"]').should('be.checked').uncheck();
            });
            cy.closeSettings();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.goToNextFrame(2);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url.includes('quality=compressed')).to.eq(true);
            });
        });

        it('Change to show original and check initial chunk load.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-show-original').within(() => {
                cy.get('[type="checkbox"]').should('not.be.checked').check();
            });
            cy.saveSettings();
            cy.closeSettings();
            cy.visit('/tasks');
            cy.login();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.openTaskJob(taskName);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url.includes('quality=original')).to.eq(true);
            });
        });

        it('Change back to compressed and check initial chunk load.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-show-original').within(() => {
                cy.get('[type="checkbox"]').should('be.checked').uncheck();
            });
            cy.saveSettings();
            cy.closeSettings();
            cy.visit('/tasks');
            cy.login();
            cy.intercept('GET', '/api/jobs/**/data**').as('chunkGet');
            cy.openTaskJob(taskName);
            cy.wait('@chunkGet').then((req) => {
                expect(req.request.url.includes('quality=compressed')).to.eq(true);
            });
        });
    });
});
