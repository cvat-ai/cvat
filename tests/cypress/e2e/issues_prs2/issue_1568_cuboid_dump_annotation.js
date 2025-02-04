// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Dump annotation if cuboid created.', () => {
    const issueId = '1568';
    const exportFormat = 'Datumaro';

    let taskID = null;
    let jobID = null;
    const labelName = 'label';

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'cuboid' }],
            name: 'Dump annotation if cuboid created',
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: ['images/image_1.jpg'],
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            const cuboidPayload = {
                objectType: 'shape',
                labelName,
                frame: 0,
                type: 'cuboid',
                points: [
                    38, 58, 38, 174, 173,
                    58, 173, 174, 186, 46,
                    186, 162, 52, 46, 52, 162,
                ],
                occluded: false,
            };

            cy.headlessCreateObjects([cuboidPayload], jobID);
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Dump an annotation.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: exportFormat,
            };
            cy.exportJob(exportAnnotation);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
            cy.goBack();
        });

        it('Error notification does not exists.', () => {
            cy.get('.ant-notification-notice-error').should('not.exist');
        });
    });

    after(() => {
        cy.logout();
        if (taskID) {
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
        }
    });
});
