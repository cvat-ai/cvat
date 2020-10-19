/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import {labelName, taskName, attrName, textDefaultValue, images, imagesFolder,
    width, height, posX, posY, color, directoryToArchive, archivePath, archiveName, imageFileName,
    advancedConfigurationParams, multiAttrParams} from '../support/const'

it('Login and create a main task', () => {
    cy.visit('auth/login')
    cy.login()
    cy.get('.cvat-text-color').then(($annotationTask) => {
        if ( ! $annotationTask.contents('strong', taskName)) {
            for (let img of images) {
                cy.imageGenerator(imagesFolder, img, width, height, color, posX, posY, labelName)
            }
            cy.createZipArchive(directoryToArchive, archivePath)
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName,
                multiAttrParams, advancedConfigurationParams)
        }
    })
})

// after(() => {
//     cy.getTaskID(taskName).then($taskID => {
//         cy.deleteTask(taskName, $taskID)
//     })
// })

// import './actions_tasks_objects/issue_1216_Check_if_UI_not_fails_with_shape_dragging_over_sidebar'
// import './actions_tasks_objects/issue_1368_points_track_invisible_next_frame.js'
// import './actions_tasks_objects/issue_1391_delete_point'
// import './actions_tasks_objects/issue_1425_highlighted_attribute_correspond_chosen_attribute.js'
// import './actions_tasks_objects/issue_1429_check_new_label.js'
// import './actions_tasks_objects/issue_1433_hide_functionality.js'
// import './actions_tasks_objects/issue_1438_cancel_multiple_paste_ui_not_lock.js'
// import './actions_tasks_objects/issue_1439_blocked_object_info.js'
// import './actions_tasks_objects/issue_1444_filter_property_shape.js'
// import './actions_tasks_objects/issue_1498_message_ui_raw_labels_wrong.js'
// import './actions_tasks_objects/issue_1540_add_remove_tag.js'
// import './actions_tasks_objects/issue_1568_cuboid_dump_annotation.js'
// import './actions_tasks_objects/issue_1750_err_aam_switch_frames'
// import './actions_tasks_objects/issue_1785_propagation_latest_frame.js'
// import './actions_tasks_objects/issue_1819_first_part_splitted_track_visible.js'
// import './actions_tasks_objects/issue_1825_tooltip_hidden_mouseout.js'
// import './actions_tasks_objects/issue_1841_hidden_points_cuboids_grouping.js'
// import './actions_tasks_objects/issue_1870_cursor_not_jump_to_end.js'
// import './actions_tasks_objects/issue_1882_polygon_interpolation.js'
// import './actions_tasks_objects/issue_1886_point_coordinates_not_duplicated.js'
// import './actions_tasks_objects/issue_1919_check_text_attr.js'
// import './actions_tasks_objects/issue_1944_loading_screen_switch_job.js'
// import './actions_tasks_objects/pr_1370_check_UI_fail_with_object_dragging_and_go_next_frame.js'
