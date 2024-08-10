// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Requests page', () => {
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const projectName = 'Project for testing requests page';
    const mainLabelName = 'requests_page_label';
    const secondLabelName = 'requests_page_label_2';
    const projectLabels = [
        { name: mainLabelName, attributes: [], type: 'any' },
        { name: secondLabelName, attributes: [], type: 'any' },
    ];

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: Cypress.config('minioUrl'),
    };

    const attrName = 'requests_attr';
    const imagesCount = 1;
    const imageFileName = `image_${mainLabelName}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const badArchiveName = `${imageFileName}_empty.zip`;
    const badArchivePath = `cypress/fixtures/${badArchiveName}`;
    const badAnnotationsName = `${imageFileName}_incorrect.xml`;
    const badAnnotationsPath = `cypress/fixtures/${badAnnotationsName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const emptyDirectoryToArchive = `${imagesFolder}_empty`;
    const annotationsArchiveNameLocal = 'requests_annotations_archive_local';
    const annotationsArchiveNameCloud = 'requests_annotations_archive_cloud';
    const exportFormat = 'CVAT for images';
    let exportFileName;

    const taskName = 'Annotation task for testing requests page';

    const data = {
        projectID: null,
        taskID: null,
        jobID: null,
        cloudStorageID: null,
    };

    function checkRequestStatus(requestAction, innerCheck, shouldOpenTask = true) {
        cy.contains('.cvat-header-button', 'Requests').click();
        cy.contains('.cvat-requests-card', requestAction)
            .within(() => {
                innerCheck();
                cy.get('.cvat-requests-name').click();
            });
        cy.get('.cvat-spinner').should('not.exist');

        if (shouldOpenTask) {
            cy.url().should('include', `/tasks/${data.taskID}`);
        } else {
            cy.url().should('include', '/requests');
        }
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.headlessCreateProject({
            labels: projectLabels,
            name: projectName,
        }).then((response) => {
            data.projectID = response.projectID;

            cy.headlessCreateTask({
                name: taskName,
                project_id: data.projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, {
                server_files: serverFiles,
                image_quality: 70,
                use_zip_chunks: true,
                use_cache: true,
                sorting_method: 'lexicographical',
            }).then((taskResponse) => {
                data.taskID = taskResponse.taskID;
                [data.jobID] = taskResponse.jobIDs;

                const cuboidPayload = {
                    frame: 0,
                    objectType: 'shape',
                    shapeType: 'cuboid',
                    labelName: mainLabelName,
                    points: [
                        38, 58, 38, 174, 173,
                        58, 173, 174, 186, 46,
                        186, 162, 52, 46, 52, 162,
                    ],
                    occluded: false,
                };

                cy.headlessCreateObjects([cuboidPayload], data.jobID);
            });
        });

        data.cloudStorageID = cy.attachS3Bucket(cloudStorageData);

        cy.createZipArchive(emptyDirectoryToArchive, badArchivePath);

        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, mainLabelName, imagesCount);
        cy.createZipArchive(directoryToArchive, badAnnotationsPath);
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

        it('Creating a task creates a request. Incorrect task cant be opened.', () => {
            cy.createAnnotationTask(
                taskName,
                mainLabelName,
                attrName,
                attrName,
                badArchiveName,
                false,
                false,
                false,
                false,
                false,
                'fail',
            );
            checkRequestStatus('Create Task', () => {
                cy.get('.cvat-request-item-progress-failed').should('exist');
            }, false);
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
    });
});
