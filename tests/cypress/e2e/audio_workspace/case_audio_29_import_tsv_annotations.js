// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Import transcriptions from a TSV file.', () => {
    const caseId = 'audio_29';
    const tsvFile = 'audio_transcriptions.tsv';
    // Tab-separated transcription annotations generated at runtime, since
    // cypress/fixtures is not version-controlled. Columns: start, stop (ms),
    // label, transcription.
    const tsvContent = [
        ['start', 'stop', 'label', 'transcription'].join('\t'),
        ['00:00:00.000000', '00:00:01.000000', firstLabelName, 'hello world'].join('\t'),
        ['00:00:01.000000', '00:00:02.000000', firstLabelName, 'second line'].join('\t'),
        '',
    ].join('\n');
    // The 1D audio transcription importer (registered with ext="TSV").
    const format = 'Generic TSV 1.0';

    before(() => {
        cy.writeFile(`cypress/fixtures/${tsvFile}`, tsvContent);
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Upload annotations offers the TSV format, accepts a .tsv file, and imports it', () => {
            cy.removeAnnotations();
            cy.intercept('GET', '/api/jobs/**/annotations?**').as('uploadAnnotationsGet');

            cy.interactMenu('Upload annotations');
            cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
            cy.contains('.cvat-modal-import-dataset-option-item', format).click();
            cy.get('.cvat-modal-import-select').should('contain.text', format);

            // The branch under test drives the dragger `accept` attribute from
            // the selected loader's format, so the TSV importer accepts `.tsv`
            // instead of the previously hard-coded `.zip,.json,.xml`.
            cy.get('.cvat-modal-import-dataset input[type="file"]')
                .should('have.attr', 'accept', '.tsv');

            // cvat-core now allows the `.tsv` extension, so the file is accepted
            // by the picker (the annotation-upload path validates against the
            // selected format's extension) rather than rejected.
            cy.get('input[type="file"]').attachFile(tsvFile, { subjectType: 'drag-n-drop' });
            cy.get(`[title="${tsvFile}"]`).should('be.visible');

            cy.contains('button', 'OK').click();
            cy.confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.closeNotification('.ant-notification-notice-info');

            // The imported transcription intervals are now present on the job.
            cy.get('.cvat-audio-region-item', { timeout: 10000 }).should('have.length.greaterThan', 0);
        });
    });
});
