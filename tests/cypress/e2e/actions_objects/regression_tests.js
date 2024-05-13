// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// import { taskName, labelName } from '../../support/const';

context('Regression tests', () => {
    let taskID = null;
    let jobID = null;
    const labelName = 'Main label';
    const imagesCount = 75;
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
    const zipLevel = 0;

    const taskPayload = {
        name: 'Test annotations actions',
        labels: [{
            name: 'label 1',
            attributes: [],
            type: 'any',
        }],
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const dataPayload = {
        server_files: [archivePath],
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX,
            posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath, zipLevel);
    });

    describe('Regression tests', () => {
        it('UI does not crash if to activate an object while frame fetching', () => {
            cy.headlessCreateTask(taskPayload, dataPayload).then((response) => {
                taskID = response.taskID;
                [jobID] = response.jobIDs;

                cy.visit(`/tasks/${taskID}/jobs/${jobID}`);

                cy.get('.cvat-player-last-button').click();
                cy.createRectangle(createRectangleShape2Points);
                cy.get('#cvat_canvas_shape_1').trigger('mousemove');
                cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
                cy.saveJob();

                cy.reload();
                cy.get('.cvat-player-last-button').click();

                cy.intercept('GET', '/api/jobs/**/data?**', (req) => {
                    req.continue((res) => {
                        res.setDelay(3000);
                    });
                }).as('delayedRequest');

                cy.get('#cvat_canvas_shape_1').trigger('mousemove');
                cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');

                cy.wait('@delayedRequest');
                cy.get('#cvat_canvas_shape_1').trigger('mousemove');
                cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            });
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });
});
