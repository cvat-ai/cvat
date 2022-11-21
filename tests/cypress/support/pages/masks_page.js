import { nameTask, serverFiles } from '../const';
import { globalTheme as theme } from '../theme';

let taskID = null;
let jobID = null;

export function beforeMask() {
    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: 'mask label', attributes: [], type: 'any' }],
            name: nameTask,
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
            taskID = response.taskID;
            [jobID] = response.jobID;
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get(`${theme.toolCanvasContainer}`).should('exist').and('be.visible');
        });
    });
}

export function afterMask() {
    after(() => {
        cy.logout();
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
    });
}

export function drawingMaskContinue() {
    cy.get(`${theme.toolBrushFinish}`).click();
    cy.get(`${theme.toolBrushContinue}`).click();
    cy.get(`${theme.toolBrushToolbox}`).should('exist').and('be.visible');
    cy.get(`${theme.shape1}`).should('exist').and('be.visible');
}

export function checkAfterSave() {
    cy.get(`${theme.toolBrushToolbox}`).should('not.be.visible');

    cy.saveJob();
    cy.reload();

    for (const id of [1, 2]) {
        cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
    }
    cy.removeAnnotations();
}

export function moveMask() {
    cy.get(`${theme.sidebarStateItem1}`).find('[aria-label="more"]').trigger('mouseover');
    cy.get(`${theme.objectItemMenu}`).within(() => {
        cy.contains('button', 'Propagate').click();
    });
    cy.get(`${theme.confirmObject}`).find('input')
        .should('have.attr', 'value', serverFiles.length - 1);
    cy.contains('button', 'Yes').click();
    for (let i = 1; i < serverFiles.length; i++) {
        cy.goCheckFrameNumber(i);
        cy.get(`${theme.shape}`).should('exist').and('be.visible');
    }
}

export function copyMask() {
    cy.get(`${theme.sidebarStateItem1}`).within(() => {
        cy.get('[aria-label="more"]').trigger('mouseover');
    });
    cy.get(`${theme.objectItemMenu}`).last().should('be.visible').contains('button', 'Make a copy').click();
    cy.goCheckFrameNumber(serverFiles.length - 1);
    cy.get(`${theme.toolCanvasContainer}`).click();
    cy.get(`${theme.shape2}`).should('exist').and('be.visible');
}

export function editMask() {
    cy.get(`${theme.sidebarStateItem1}`).within(() => {
        cy.get('[aria-label="more"]').trigger('mouseover');
    });
    cy.get(`${theme.objectItemMenu}`).last().should('be.visible').contains('button', 'Edit').click();
}
