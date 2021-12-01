// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Export task dataset.', () => {
    const caseId = '47';
    const exportFormat = 'CVAT for images';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
        cy.saveJob('PATCH', 200, 'saveJobExportDataset');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export a task as dataset.', () => {
            const exportDataset = {
                as: 'exportDataset',
                type: 'dataset',
                format: exportFormat,
            };
            cy.exportTask(exportDataset);
            cy.waitForDownload();
        });

        it('Export a task as dataset with renaming the archive.', () => {
            const exportDataset = {
                as: 'exportDatasetRenameArchive',
                type: 'dataset',
                format: exportFormat,
                archiveCustomeName: 'task_export_dataset_custome_name',
            };
            cy.exportTask(exportDataset);
            cy.waitForDownload();
        });
    });
});
