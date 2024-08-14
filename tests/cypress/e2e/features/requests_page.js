// Copyright (C) 2024 CVAT.ai Corporation
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
        frame: 0,
        objectType: 'shape',
        shapeType: 'rectangle',
        points: [250, 64, 491, 228],
        occluded: false,
        labelName: mainLabelName,
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
    const badArchiveName = `${imageFileName}_empty.zip`;
    const badArchivePath = `cypress/fixtures/${badArchiveName}`;
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

    const data = {
        projectID: null,
        taskID: null,
        cloudStorageID: null,
    };

    function checkRequestStatus(
        requestAction,
        innerCheck,
        { checkResourceLink, resourceLink } = { checkResourceLink: true, resourceLink: `/tasks/${data.taskID}` },
    ) {
        cy.contains('.cvat-header-button', 'Requests').click();
        cy.contains('.cvat-requests-card', requestAction)
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

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, mainLabelName, imagesCount);
        cy.createZipArchive(directoryToArchive, badAnnotationsPath);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createZipArchive(emptyDirectoryToArchive, badArchivePath);

        data.cloudStorageID = cy.attachS3Bucket(cloudStorageData);

        const project = {
            name: projectName,
            label: mainLabelName,
            attrName,
            attrVaue: 'Requests attr',
            multiAttrParams: false,
            advancedConfiguration: false,
        };
        cy.goToProjectsList();
        cy.createProjects(
            project.name,
            project.label,
            project.attrName,
            project.attrVaue,
            project.multiAttrParams,
            project.advancedConfiguration,
        );
        cy.openProject(project.name);
        cy.url().then((url) => {
            data.projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);

            const task = {
                name: taskName,
                label: mainLabelName,
                attrName,
                textDefaultValue: 'Requests attr',
                dataArchiveName: `${imageFileName}.zip`,
                multiAttrParams: false,
                forProject: true,
                attachToProject: true,
                projectName,
            };
            cy.goToTaskList();
            cy.createAnnotationTask(
                task.name,
                task.label,
                task.attrName,
                task.textDefaultValue,
                archiveName,
                task.multiAttrParams,
                null,
                task.forProject,
                task.attachToProject,
                task.projectName,
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

    beforeEach(() => {
        cy.visit('/tasks');
        cy.get('.cvat-spinner').should('not.exist');
    });

    describe('Requests page', () => {
        it('Creating a task creates a request. Correct task can be opened.', () => {
            cy.visit('/requests');
            cy.get('.cvat-spinner').should('not.exist');
            checkRequestStatus('Create Task', () => {
                cy.contains('Finished').should('exist');
            });
        });

        it('Creating a task creates a request. Incorrect task can not be opened.', () => {
            const defaultAttrValue = 'Requests attr';
            const multiAttrParams = false;
            const advancedConfigurationParams = false;
            const forProject = false;
            const attachToProject = false;
            const expectedResult = 'fail';

            cy.createAnnotationTask(
                taskName,
                mainLabelName,
                attrName,
                defaultAttrValue,
                badArchiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject,
                projectName,
                expectedResult,
            );
            checkRequestStatus('Create Task', () => {
                cy.get('.cvat-request-item-progress-failed').should('exist');
            }, { resourceLink: '' });
        });

        it('Export creates a request. Task can be opened from request. Export can be downloaded after page reload.', () => {
            cy.openTask(taskName);
            const exportParams = {
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: annotationsArchiveNameLocal,
            };
            cy.exportTask(exportParams);

            checkRequestStatus('Export Annotations', () => {
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

        it('Export on cloud storage creates a request. Expire field does not exist', () => {
            cy.openTask(taskName);
            const exportParams = {
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: annotationsArchiveNameCloud,
                targetStorage: {
                    location: 'Cloud storage',
                    cloudStorageId: data.cloudStorageID,
                },
                useDefaultLocation: false,
            };
            cy.exportTask(exportParams);
            cy.waitForFileUploadToCloudStorage();

            checkRequestStatus('Export Annotations', () => {
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.contains('Expires').should('not.exist');
                cy.contains(exportFormat).should('exist');
            });
        });

        it('Import creates a request. Task can be opened from request.', () => {
            cy.openTask(taskName);
            cy.clickInTaskMenu('Upload annotations', true);
            cy.uploadAnnotations({
                format: exportFormat.split(' ')[0],
                filePath: exportFileName,
                confirmModalClassName: '.cvat-modal-content-load-task-annotation',
                waitAnnotationsGet: false,
            });

            checkRequestStatus('Import Annotations', () => {
                cy.get('.cvat-request-item-progress-success').should('exist');
            });
        });

        it('Import creates a request. Task can be opened from incorrect request.', () => {
            cy.openTask(taskName);
            cy.clickInTaskMenu('Upload annotations', true);
            cy.uploadAnnotations({
                format: exportFormat.split(' ')[0],
                filePath: badAnnotationsName,
                confirmModalClassName: '.cvat-modal-content-load-task-annotation',
                waitAnnotationsGet: false,
                expectedResult: 'fail',
            });

            checkRequestStatus('Import Annotations', () => {
                cy.get('.cvat-request-item-progress-failed').should('exist');
            });
        });

        it('Export backup creates a request. Project can be opened.', () => {
            cy.visit('/projects');
            cy.get('.cvat-spinner').should('not.exist');
            cy.backupProject(
                projectName,
                backupArchiveName,
            );

            checkRequestStatus('Export Backup', () => {
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.contains('Expires').should('exist');
            }, `/projects/${data.projectID}`);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
        });

        it('Import backup creates a request. Project  can not be opened.', () => {
            cy.visit('/projects');
            cy.get('.cvat-spinner').should('not.exist');
            cy.restoreProject(
                `${backupArchiveName}.zip`,
            );

            checkRequestStatus('Import Backup', () => {
                cy.get('.cvat-request-item-progress-success').should('exist');
                cy.get('.cvat-requests-name').should('not.exist');
            }, { checkResourceLink: false });
        });
    });

    describe('Regression tests', () => {
        it('Export job in different formats from task page simultaneously.', () => {
            cy.openTask(taskName);
            cy.intercept('GET', '/api/requests/**', (req) => {
                req.on('response', (res) => {
                    res.setDelay(5000);
                });
            });
            cy.getJobIDFromIdx(0).then((jobID) => {
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

                cy.contains('Export is finished').should('be.visible');
                cy.closeNotification('.ant-notification-notice-info');

                cy.contains('.cvat-header-button', 'Requests').should('be.visible').click();
                cy.url().should('include', '/requests');

                cy.get(`.cvat-requests-card:contains("Job #${jobID}")`)
                    .should('have.length', 2)
                    .each((card) => {
                        cy.wrap(card).within(() => {
                            cy.get('.cvat-request-item-progress-success').should('exist');
                            cy.contains('Expires').should('exist');
                        });
                    });
            });
        });
    });
});
