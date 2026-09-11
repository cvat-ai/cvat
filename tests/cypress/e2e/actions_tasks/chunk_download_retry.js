// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Retry chunk downloads on annotation page', () => {
    const taskName = 'Test retry chunk download';
    const labelName = 'car';
    const serverFiles = ['images/image_1.jpg'];
    const failedAttempts = 3;

    let taskId = null;
    let jobId = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.url().should('contain', '/tasks');
    });

    beforeEach(() => {
        taskId = null;
        jobId = null;
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskId = response.taskId;
            [jobId] = response.jobIds;
        });
    });

    afterEach(() => {
        if (taskId) {
            cy.headlessDeleteTask(taskId);
        }
    });

    it('loads the annotation frame after several network errors during chunk download', () => {
        let chunkRequests = 0;

        cy.intercept({
            method: 'GET',
            pathname: `/api/jobs/${jobId}/data`,
            query: {
                type: 'chunk',
            },
        }, (req) => {
            chunkRequests++;
            expect(req.headers.range).to.be.undefined;

            if (chunkRequests <= failedAttempts) {
                req.reply({
                    forceNetworkError: true,
                });
            } else {
                req.continue();
            }
        }).as('getJobChunk');
        cy.intercept('GET', `/tasks/${taskId}/jobs/${jobId}`).as('visitAnnotationView');

        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.wait('@visitAnnotationView');
        for (let attempt = 0; attempt < failedAttempts; attempt++) {
            cy.wait('@getJobChunk').its('error').should('exist');
        }
        cy.wait('@getJobChunk').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('#cvat_canvas_background').should('exist').and('be.visible');
        cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('not.exist');
        cy.then(() => {
            expect(chunkRequests).to.be.at.least(failedAttempts + 1);
        });
    });

    it('resumes a chunk download after a cleanly truncated response', () => {
        let chunkRequests = 0;
        let truncatedSize = 0;

        cy.intercept({
            method: 'GET',
            pathname: `/api/jobs/${jobId}/data`,
            query: {
                type: 'chunk',
            },
        }, (req) => {
            chunkRequests++;

            if (chunkRequests === 1) {
                expect(req.headers.range).to.be.undefined;
                req.continue((res) => {
                    const responseSize = res.body.byteLength ?? res.body.length;
                    truncatedSize = Math.floor(responseSize / 2);
                    res.send({
                        statusCode: res.statusCode,
                        body: res.body.slice(0, truncatedSize),
                        headers: {
                            ...res.headers,
                            'content-length': `${truncatedSize}`,
                        },
                    });
                });
            } else {
                expect(req.headers.range).to.equal(`bytes=${truncatedSize}-`);
                req.continue();
            }
        }).as('getTruncatedJobChunk');
        cy.intercept('GET', `/tasks/${taskId}/jobs/${jobId}`).as('visitAnnotationView');

        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.wait('@visitAnnotationView');
        cy.wait('@getTruncatedJobChunk').its('response.statusCode').should('equal', 200);
        cy.wait('@getTruncatedJobChunk').its('response.statusCode').should('equal', 206);

        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('#cvat_canvas_background').should('exist').and('be.visible');
        cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('not.exist');
        cy.then(() => {
            expect(chunkRequests).to.equal(2);
        });
    });

    it('restarts a chunk download when the chunk changes before resuming', () => {
        let chunkRequests = 0;
        let truncatedSize = 0;

        cy.intercept({
            method: 'GET',
            pathname: `/api/jobs/${jobId}/data`,
            query: {
                type: 'chunk',
            },
        }, (req) => {
            chunkRequests++;

            if (chunkRequests === 1) {
                expect(req.headers.range).to.be.undefined;
                req.continue((res) => {
                    const responseSize = res.body.byteLength ?? res.body.length;
                    truncatedSize = Math.floor(responseSize / 2);
                    res.send({
                        statusCode: res.statusCode,
                        body: res.body.slice(0, truncatedSize),
                        headers: {
                            ...res.headers,
                            'content-length': `${truncatedSize}`,
                        },
                    });
                });
            } else if (chunkRequests === 2) {
                expect(req.headers.range).to.equal(`bytes=${truncatedSize}-`);
                req.continue((res) => {
                    // eslint-disable-next-line no-param-reassign
                    res.headers['x-checksum'] = `${res.headers['x-checksum']}-changed`;
                });
            } else {
                expect(req.headers.range).to.be.undefined;
                req.continue();
            }
        }).as('getChangedJobChunk');
        cy.intercept('GET', `/tasks/${taskId}/jobs/${jobId}`).as('visitAnnotationView');

        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.wait('@visitAnnotationView');
        cy.wait('@getChangedJobChunk').its('response.statusCode').should('equal', 200);
        cy.wait('@getChangedJobChunk').its('response.statusCode').should('equal', 206);
        cy.wait('@getChangedJobChunk').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('#cvat_canvas_background').should('exist').and('be.visible');
        cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('not.exist');
        cy.then(() => {
            expect(chunkRequests).to.equal(3);
        });
    });

    it('restarts a chunk download when a proxy removes the Range header', () => {
        let chunkRequests = 0;
        let truncatedSize = 0;

        cy.intercept({
            method: 'GET',
            pathname: `/api/jobs/${jobId}/data`,
            query: {
                type: 'chunk',
            },
        }, (req) => {
            chunkRequests++;

            if (chunkRequests === 1) {
                expect(req.headers.range).to.be.undefined;
                req.continue((res) => {
                    const responseSize = res.body.byteLength ?? res.body.length;
                    truncatedSize = Math.floor(responseSize / 2);
                    res.send({
                        statusCode: res.statusCode,
                        body: res.body.slice(0, truncatedSize),
                        headers: {
                            ...res.headers,
                            'content-length': `${truncatedSize}`,
                        },
                    });
                });
            } else {
                expect(req.headers.range).to.equal(`bytes=${truncatedSize}-`);
                // Simulate an intermediary proxy removing Range before forwarding the request.
                // eslint-disable-next-line no-param-reassign
                delete req.headers.range;
                req.continue();
            }
        }).as('getJobChunkWithoutRange');
        cy.intercept('GET', `/tasks/${taskId}/jobs/${jobId}`).as('visitAnnotationView');

        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.wait('@visitAnnotationView');
        cy.wait('@getJobChunkWithoutRange').its('response.statusCode').should('equal', 200);
        cy.wait('@getJobChunkWithoutRange').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('#cvat_canvas_background').should('exist').and('be.visible');
        cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('not.exist');
        cy.then(() => {
            expect(chunkRequests).to.equal(2);
        });
    });
});
