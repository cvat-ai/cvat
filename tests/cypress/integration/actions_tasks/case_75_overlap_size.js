// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Overlap size.', () => {
    const caseId = '75';
    const labelName = `Case ${caseId}`;
    const taskName = labelName;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = {
        multiJobs: true,
        segmentSize: 5,
        overlapSize: 3,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName, false, advancedConfigurationParams);
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('The task parameters is correct.', () => {
            cy.get('.cvat-task-parameters').within(() => {
                cy.get('table').find('tr').last().find('td').then(($taskParameters) => {
                    expect(Number($taskParameters[0].innerText)).equal(advancedConfigurationParams.segmentSize - advancedConfigurationParams.overlapSize);
                    expect(Number($taskParameters[1].innerText)).equal(advancedConfigurationParams.segmentSize);
                });
            });
        });

        it('The range of frame values corresponds to the parameters.', () => {
            cy.getJobNum(0).then(($job) => {
                cy.contains('a', `Job #${$job}`).parents('tr').find('.cvat-job-item-frames').then(($frameRange) => {
                    expect(Number($frameRange.text().split('-')[1])).equal(advancedConfigurationParams.segmentSize - 1); // expected 4 to equal 4
                });
            });
            cy.getJobNum(1).then(($job) => {
                cy.contains('a', `Job #${$job}`).parents('tr').find('.cvat-job-item-frames').then(($frameRange) => {
                    expect(Number($frameRange.text().split('-')[0])).equal(advancedConfigurationParams.segmentSize - 2); // expected 3 to equal 3
                });
            });
        });
    });
});
