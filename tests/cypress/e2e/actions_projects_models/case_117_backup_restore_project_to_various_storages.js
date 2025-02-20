// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Tests source & target storage for backups.', () => {
    const backupArchiveName = 'project_backup';
    let projectID = '';
    let createdCloudStorageId;
    const caseId = '117';
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

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: Cypress.config('minioUrl'),
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

    function getProjectID() {
        cy.url().then((url) => {
            projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);
        });
    }

    before(() => {
        cy.visit('/auth/login');
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
        cy.openProject(project.name);
        getProjectID();
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
        it('Export project to custom local storage', () => {
            cy.goToProjectsList();
            cy.backupProject(
                project.name,
                backupArchiveName,
                { location: 'Local' },
                false,
            );
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
            cy.goBack();
        });

        it('Export project to default minio bucket', () => {
            cy.goToProjectsList();
            cy.backupProject(
                project.name,
                backupArchiveName,
                project.advancedConfiguration.targetStorage,
            );
            cy.waitForFileUploadToCloudStorage();
            cy.deleteProject(project.name, projectID);
        });

        it('Import project from minio bucket', () => {
            cy.restoreProject(
                `${backupArchiveName}.zip`,
                project.advancedConfiguration.sourceStorage,
            );
        });
    });
});
