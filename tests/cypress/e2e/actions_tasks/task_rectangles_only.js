// Copyright (C) CVAT.ai Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Creating a task with only bounding boxes', () => {
    const taskName = 'A task with bounding boxes';
    const imagesFolder = `cypress/fixtures/${taskName}`;
    const archiveName = `${taskName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imageParams = {
        width: 800,
        height: 800,
        color: 'gray',
        textOffset: { x: 10, y: 10 },
        text: 'skeletons pipeline',
        count: 1,
    };
    const labelSpecification = {
        name: 'car',
        type: 'rectangle',
    };
    let taskID = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(
            imagesFolder,
            taskName,
            imageParams.width,
            imageParams.height,
            imageParams.color,
            imageParams.textOffset.x,
            imageParams.textOffset.y,
            imageParams.text,
            imageParams.count,
        );
        cy.createZipArchive(imagesFolder, archivePath);
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

    describe('Creating a task with only bounding boxes', () => {
        it('Task created, UI allows to create only bounding boxes', () => {
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-create-task-button').click({ force: true });
            cy.url().should('include', '/tasks/create');
            cy.get('[id="name"]').type(taskName);

            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type(labelSpecification.name);
            if (labelSpecification.type) {
                cy.get('.cvat-label-type-input').click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`.cvat-label-type-option-${labelSpecification.type}`).click();
                    });
            }
            cy.contains('Continue').scrollIntoView();
            cy.contains('Continue').click();
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });

            cy.intercept('/api/tasks?**').as('taskPost');
            cy.contains('Submit & Open').scrollIntoView();
            cy.contains('Submit & Open').click();

            cy.wait('@taskPost').then((interception) => {
                taskID = interception.response.body.id;
                expect(interception.response.statusCode).to.be.equal(201);
                cy.intercept(`/api/tasks/${taskID}`).as('getTask');
                cy.wait('@getTask');
                cy.get('.cvat-job-item').should('exist').and('be.visible');
                cy.openJob();

                cy.get('.cvat-canvas-container').should('exist').and('be.visible');
                cy.get('.cvat-draw-rectangle-control').should('exist').and('be.visible');
                cy.get('.cvat-draw-polygon-control').should('not.exist');
                cy.get('.cvat-draw-polyline-control').should('not.exist');
                cy.get('.cvat-draw-points-control').should('not.exist');
                cy.get('.cvat-draw-cuboid-control').should('not.exist');
                cy.get('.cvat-draw-skeleton-control').should('not.exist');
                cy.get('.cvat-draw-ellipse-control').should('not.exist');
                cy.get('.cvat-setup-tag-control').should('not.exist');
            });
        });
    });
});
