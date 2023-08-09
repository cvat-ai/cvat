// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Ground truth jobs', () => {
    const caseId = 'Ground truth jobs';
    const labelName = 'car';
    const taskName = `New annotation task for Case ${caseId}`;
    const attrName = `Attr for Case ${caseId}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = 'ground_truth_1';
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const jobOptions = {
        jobType: 'Ground truth',
        frameSelectionMethod: 'Random',
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create ground truth job from task page', () => {
            cy.openTask(taskName);
            cy.createJob({
                ...jobOptions,
                quantity: 15,
            });
            // todo save job id
        });

        // todo delete job by id
        it('Delete ground truth job', () => {
        });

        it('Create ground truth job from quality page', () => {
        });
    });
});
