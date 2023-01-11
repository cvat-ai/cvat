// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Tests for source and target storage.', () => {
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
    const dataArchiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${dataArchiveName}`;
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

    const serverHost = Cypress.config('baseUrl').includes('3000') ? 'localhost' : 'minio';

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

    const project = {
        name: `Case ${caseId}`,
        label: labelName,
        attrName: 'color',
        attrVaue: 'red',
        multiAttrParams: false,
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

    const task = {
        name: taskName,
        label: labelName,
        attrName,
        textDefaultValue,
        dataArchiveName,
        multiAttrParams: false,
        forProject: true,
        attachToProject: true,
        projectName: project.name,
        advancedConfiguration: {
            sourceStorage: {
                disableSwitch: true,
                location: 'Local',
                cloudStorageId: null,
            },
            targetStorage: {
                disableSwitch: true,
                location: 'Local',
                cloudStorageId: null,
            },
        },
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        createdCloudStorageId = cy.attachS3Bucket(cloudStorageData);
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToProjectsList();
        project.advancedConfiguration.sourceStorage.cloudStorageId = createdCloudStorageId;
        project.advancedConfiguration.targetStorage.cloudStorageId = createdCloudStorageId;

        cy.createProjects(
            project.name,
            project.label,
            project.attrName,
            project.attrVaue,
            project.multiAttrParams,
            project.advancedConfiguration,
        );
    });

    after(() => {
        cy.goToCloudStoragesPage();
        cy.deleteCloudStorage(cloudStorageData.displayName);
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteProjects(authKey, [project.name]);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export job annotations to default minio bucket that was attached to the project.', () => {
            // create an annotation task with default project source and target storages
            cy.goToTaskList();
            cy.createAnnotationTask(
                task.name,
                task.label,
                task.attrName,
                task.textDefaultValue,
                dataArchiveName,
                task.multiAttrParams,
                null,
                task.forProject,
                task.attachToProject,
                task.projectName,
            );
            cy.goToTaskList();
            cy.openTask(task.name);

            // create dummy annotations and export them to "public" minio bucket
            cy.openJob();
            cy.createRectangle(createRectangleShape2Points).then(() => {
                Cypress.config('scrollBehavior', false);
            });
            cy.saveJob('PATCH', 200, 'saveJobDump');
            const exportParams = {
                type: 'annotations',
                format,
                archiveCustomName: 'job_annotations',
                targetStorage: project.advancedConfiguration.targetStorage,
            };
            cy.exportJob(exportParams);
            cy.waitForFileUploadToCloudStorage();

            // remove annotations
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Import job annotations from default minio bucket that was attached to the project.', () => {
            // upload annotations from "public" minio bucket
            cy.interactMenu('Upload annotations');
            cy.intercept('GET', '/api/jobs/**/annotations?**').as('uploadAnnotationsGet');

            cy.uploadAnnotations(
                format.split(' ')[0],
                'job_annotations.zip',
                '.cvat-modal-content-load-job-annotation',
                project.advancedConfiguration.sourceStorage,
            );

            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');

            cy.goToTaskList();
            cy.deleteTask(task.name);
        });
    });
});
