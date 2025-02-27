// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Requests page', () => {
    const projectName = 'Project for testing requests page';
    const mainLabelName = 'requests_page_label';

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: Cypress.config('minioUrl'),
    };

    const rectanglePayload = {
        objectType: 'shape',
        labelName: mainLabelName,
        frame: 0,
        type: 'rectangle',
        points: [250, 64, 491, 228],
        occluded: false,
    };

    const attrName = 'requests_attr';
    const imagesCount = 3;
    const imageFileName = `image_${mainLabelName}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const brokenArchiveName = `${imageFileName}_empty.zip`;
    const brokenArchivePath = `cypress/fixtures/${brokenArchiveName}`;
    const badAnnotationsName = `${imageFileName}_incorrect.xml`;
    const badAnnotationsPath = `cypress/fixtures/${badAnnotationsName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const emptyDirectoryToArchive = `${imagesFolder}_empty`;
    const annotationsArchiveNameLocal = 'requests_annotations_archive_local';
    const annotationsArchiveNameCloud = 'requests_annotations_archive_cloud';
    const backupArchiveName = 'requests_backup';
    const exportFormat = 'CVAT for images';
    let exportFileName;

    const taskName = 'Annotation task for testing requests page';
    const brokenTaskName = 'Broken Annotation task for testing requests page';

    const data = {
        projectID: null,
        taskID: null,
        cloudStorageID: null,
    };

    function checkRequestStatus(
        selector,
        innerCheck,
        {
            checkResourceLink, resourceLink,
        } = { checkResourceLink: true, resourceLink: `/tasks/${data.taskID}` },
    ) {
        cy.contains('.cvat-header-button', 'Requests').click();
        cy.get(selector ? `.cvat-requests-card:contains("${selector}")` : '.cvat-requests-card')
            .first()
            .within(() => {
                innerCheck();
                if (checkResourceLink) {
                    cy.get('.cvat-requests-name').click();
                }
            });

        if (checkResourceLink) {
            cy.get('.cvat-spinner').should('not.exist');

            if (resourceLink) {
                cy.url().should('include', resourceLink);
            } else {
                cy.url().should('include', '/requests');
            }
        }
    }

    function openTask() {
        cy.contains('.cvat-header-button', 'Tasks').should('be.visible').click();
        cy.url().should('include', '/tasks');
        cy.openTask(taskName);
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, mainLabelName, imagesCount);
        cy.createZipArchive(directoryToArchive, badAnnotationsPath);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createZipArchive(emptyDirectoryToArchive, brokenArchivePath);

        data.cloudStorageID = cy.attachS3Bucket(cloudStorageData);

        const defaultAttrValue = 'Requests attr';
        const multiAttrParams = false;
        const advancedConfigurationParams = false;
        cy.goToProjectsList();
        cy.createProjects(
            projectName,
            mainLabelName,
            attrName,
            defaultAttrValue,
            multiAttrParams,
            advancedConfigurationParams,
        );
        cy.openProject(projectName);
        cy.url().then((url) => {
            data.projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);

            const forProject = true;
            const attachToProject = true;
            let expectedResult = 'success';
            cy.goToTaskList();
            cy.createAnnotationTask(
                taskName,
                mainLabelName,
                attrName,
                defaultAttrValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject,
                projectName,
                expectedResult,
            );

            expectedResult = 'fail';
            cy.goToTaskList();
            cy.createAnnotationTask(
                brokenTaskName,
                mainLabelName,
                attrName,
                defaultAttrValue,
                brokenArchiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject,
                projectName,
                expectedResult,
            );

            cy.goToTaskList();
            cy.openTask(taskName);
            cy.url().then((taskUrl) => {
                data.taskID = Number(taskUrl.split('/').slice(-1)[0].split('?')[0]);
                cy.getJobIDFromIdx(0).then((jobID) => {
                    cy.headlessCreateObjects([rectanglePayload], jobID);
                });
            });
        });
    });

    after(() => {
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.url().should('include', '/cloudstorages');
        cy.deleteCloudStorage(cloudStorageData.displayName);

        cy.headlessDeleteProject(data.projectID);
    });

    describe('Requests page. Create a task.', () => {
        beforeEach(() => {
            cy.contains('.cvat-header-button', 'Requests').should('be.visible').click();
            cy.url().should('include', '/requests');
        });

        it('Creating a task creates a request. Correct task can be opened.', () => {
            checkRequestStatus(`Task #${data.taskID}`, () => {
                cy.contains('Create Task').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
            });
        });

        it('Creating a task creates a request. Incorrect task can not be opened.', () => {
            checkRequestStatus('', () => {
                cy.contains('Create Task').should('exist');
                cy.get('.cvat-request-item-progress-failed').should('exist');
            }, { resourceLink: '' });
        });
    });

    describe('Requests page. Export a task.', () => {
        beforeEach(openTask);

        it('Export creates a request. Task can be opened from request. Export can be downloaded after page reload.', () => {
            cy.exportTask({
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: annotationsArchiveNameLocal,
            });

            checkRequestStatus(`Task #${data.taskID}`, () => {
                cy.contains('Export Annotations').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.contains('Expires').should('exist');
                cy.contains(exportFormat).should('exist');
            });

            cy.visit('/requests');
            cy.downloadExport({ expectNotification: false }).then((file) => {
                cy.verifyDownload(file);
                exportFileName = file;
            });
        });

        it('Export on cloud storage creates a request. Expire field does not exist.', () => {
            cy.exportTask({
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: annotationsArchiveNameCloud,
                targetStorage: {
                    location: 'Cloud storage',
                    cloudStorageId: data.cloudStorageID,
                },
                useDefaultLocation: false,
            });
            cy.waitForFileUploadToCloudStorage();

            checkRequestStatus(`Task #${data.taskID}`, () => {
                cy.contains('Export Annotations').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.contains('Expires').should('not.exist');
                cy.contains(exportFormat).should('exist');
            });
        });
    });

    describe('Requests page. Import a task.', () => {
        beforeEach(() => {
            openTask();
            cy.clickInTaskMenu('Upload annotations', true);
        });

        it('Import creates a request. Task can be opened from request.', () => {
            cy.uploadAnnotations({
                format: exportFormat.split(' ')[0],
                filePath: exportFileName,
                confirmModalClassName: '.cvat-modal-content-load-task-annotation',
                waitAnnotationsGet: false,
            });

            checkRequestStatus(`Task #${data.taskID}`, () => {
                cy.contains('Import Annotations').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
            });
        });

        it('Import creates a request. Task can be opened from incorrect request.', () => {
            cy.uploadAnnotations({
                format: exportFormat.split(' ')[0],
                filePath: badAnnotationsName,
                confirmModalClassName: '.cvat-modal-content-load-task-annotation',
                waitAnnotationsGet: false,
                expectedResult: 'fail',
            });

            checkRequestStatus(`Task #${data.taskID}`, () => {
                cy.contains('Import Annotations').should('exist');
                cy.get('.cvat-request-item-progress-failed').should('exist');
            });
        });
    });

    describe('Requests page. Project backup.', () => {
        beforeEach(() => {
            cy.contains('.cvat-header-button', 'Projects').should('be.visible').click();
            cy.url().should('include', '/projects');
        });

        it('Export backup creates a request. Project can be opened.', () => {
            cy.backupProject(
                projectName,
                backupArchiveName,
            );

            checkRequestStatus(`Project #${data.projectID}`, () => {
                cy.contains('Export Backup').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.contains('Expires').should('exist');
            }, `/projects/${data.projectID}`);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
        });

        it('Import backup creates a request. Project can not be opened.', () => {
            cy.restoreProject(
                `${backupArchiveName}.zip`,
            );

            checkRequestStatus('', () => {
                cy.contains('Import Backup').should('exist');
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.get('.cvat-requests-name').should('not.exist');
            }, { checkResourceLink: false });

            cy.goToProjectsList();
            cy.openProject(projectName);
            cy.deleteProjectViaActions(projectName);
        });
    });

    describe('Regression tests', () => {
        beforeEach(openTask);

        it('Export job in different formats from task page simultaneously.', () => {
            cy.intercept('GET', '/api/requests/**', (req) => {
                req.on('response', (res) => {
                    res.setDelay(5000);
                });
            });

            cy.getJobIDFromIdx(0).then((jobID) => {
                const closeExportNotification = () => {
                    cy.get('.ant-notification-notice').first().within((notification) => {
                        cy.contains('Export is finished').should('be.visible');
                        cy.get('span[aria-label="close"]').click();
                        cy.wrap(notification).should('not.exist');
                    });
                };

                const exportParams = {
                    type: 'dataset',
                    format: exportFormat,
                    archiveCustomName: 'job_annotations_cvat',
                    jobOnTaskPage: jobID,
                };

                cy.exportJob(exportParams);
                const newExportParams = {
                    ...exportParams,
                    format: 'COCO',
                    archiveCustomName: 'job_annotations_coco',
                };
                cy.exportJob(newExportParams);

                closeExportNotification();
                closeExportNotification();

                cy.contains('.cvat-header-button', 'Requests').should('be.visible').click();
                cy.url().should('include', '/requests');

                cy.get(`.cvat-requests-card:contains("Job #${jobID}")`)
                    .should('have.length', 2)
                    .each((card) => {
                        cy.wrap(card).within(() => {
                            cy.get('.cvat-request-item-progress-success').should('exist');
                        });
                    });
            });
        });

        it('Export task. Request for status fails, UI is not crushing', () => {
            cy.intercept('GET', '/api/requests/**', {
                statusCode: 500,
                body: 'Network error',
            });

            cy.exportTask({
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: annotationsArchiveNameLocal,
            });

            cy.contains('Could not export dataset').should('be.visible');
            cy.closeNotification('.ant-notification-notice-error');

            cy.contains('.cvat-header-button', 'Requests').should('be.visible').click();
            cy.get('.cvat-requests-page').should('be.visible');
        });
    });
});
