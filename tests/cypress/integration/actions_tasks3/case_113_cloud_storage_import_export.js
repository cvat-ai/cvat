// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Cloud storage.', () => {
    let taskId;
    let taskBackupArchiveFullName;
    let ctmBeforeExport;
    let archiveWithAnnotations;
    let createdCloudStorageId;

    const caseId = '113';

    const taskName = `Case ${caseId}`;
    const labelName = 'car';
    const attrName = 'color';
    const textDefaultValue = 'red';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const format = 'CVAT for images';

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const serverHost = Cypress.config('baseUrl').includes('localhost') ? 'localhost' : 'minio';

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: `http://${serverHost}:9000`,
    };

    const storageConnectedToCloud = {
        location: 'Cloud storage',
        cloudStorageId: undefined,
    };

    const defaultProject = {
        name: `Case ${caseId}`,
        label: labelName,
        attrName: 'color',
        attrVaue: 'red',
        multiAttrParams: false,
    };

    const firstProject = {
        ...defaultProject,
        name: `${defaultProject.name}_1`,
        advancedConfiguration: {
            sourceStorage: {
                ...storageConnectedToCloud,
                displayName: cloudStorageData.displayName,
            },
            targetStorage: {
                ...storageConnectedToCloud,
                displayName: cloudStorageData.displayName,
            },
        },
    };

    const secondProject = {
        ...defaultProject,
        name: `${defaultProject}_2`,
    };

    const firstTask = {
        name: taskName,
        label: labelName,
        attrName,
        textDefaultValue,
        archiveName,
        multiAttrParams: false,
        forProject: true,
        attachToProject: true,
        projectName: firstProject.name,
    };

    function attachS3Bucket(data) {
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
        cy.get('#display_name')
            .type(data.displayName)
            .should('have.attr', 'value', data.displayName);
        cy.get('#provider_type').click();
        cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
        cy.get('#resource')
            .should('exist')
            .type(data.resource)
            .should('have.attr', 'value', data.resource);
        cy.get('#credentials_type').should('exist').click();
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden')
            .get('[title="Anonymous access"]')
            .should('be.visible')
            .click();
        cy.get('#endpoint_url')
            .type(data.endpointUrl)
            .should('have.attr', 'value', data.endpointUrl);

        cy.get('.cvat-add-manifest-button').should('be.visible').click();
        cy.get('[placeholder="manifest.jsonl"]')
            .should('exist')
            .should('have.attr', 'value', '')
            .type(data.manifest)
            .should('have.attr', 'value', data.manifest);
        cy.intercept('POST', /\/api\/cloudstorages.*/).as('createCloudStorage');
        cy.get('.cvat-cloud-storage-form').within(() => {
            cy.contains('button', 'Submit').click();
        });
        cy.wait('@createCloudStorage').then((interseption) => {
            console.log(interseption);
            expect(interseption.response.statusCode).to.be.equal(201);
            createdCloudStorageId = interseption.response.body.id;
        });
        cy.verifyNotification();
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        attachS3Bucket(cloudStorageData);
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    after(() => {
        cy.goToCloudStoragesPage();
        cy.deleteCloudStorage(cloudStorageData.displayName);
        cy.logout();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Use project source & target storage for exporting/importing job annotations', () => {
            cy.goToProjectsList();

            firstProject.advancedConfiguration.sourceStorage.cloudStorageId = createdCloudStorageId;
            firstProject.advancedConfiguration.targetStorage.cloudStorageId = createdCloudStorageId;

            cy.createProjects(
                firstProject.name,
                firstProject.label,
                firstProject.attrName,
                firstProject.attrVaue,
                firstProject.multiAttrParams,
                firstProject.advancedConfiguration,
            );
            cy.goToTaskList();
            cy.createAnnotationTask(
                firstTask.name,
                firstTask.label,
                firstTask.attrName,
                firstTask.textDefaultValue,
                archiveName,
                firstTask.multiAttrParams,
                null,
                firstTask.forProject,
                firstTask.attachToProject,
                firstTask.projectName,

            );
            cy.goToTaskList();
            cy.openTask(firstTask.name);
            cy.url().then((link) => {
                taskId = Number(link.split('/').slice(-1)[0]);
            });
            cy.openJob();
            cy.createRectangle(createRectangleShape2Points).then(() => {
                Cypress.config('scrollBehavior', false);
            });
            cy.document().then((doc) => {
                ctmBeforeExport = doc.getElementById('cvat_canvas_shape_1').getCTM();
            });
            cy.saveJob('PATCH', 200, 'saveJobDump');
            const exportParams = {
                type: 'annotations',
                format,
                archiveName: 'job_annotations',
            };
            cy.exportJob(exportParams);
            cy.waitForFileUploadToCloudStorage();
            cy.goToTaskList();
            cy.deleteTask(firstTask.name);
        });

        // test cases:
        // 1. create a project with source & target storages,
        // create a task in a project with default source & target storages
        // export annotations, dataset, task backup, project backup to "public" bucket,
        // import annotations, dataset, restore task & project backups from "public" bucket
        // 2. create a project with source & target storages,
        // create a task in a project with another source & target storages, do all previous actions
        // 3. do all previous actions with specifying source & target storages via query params
    });
});
