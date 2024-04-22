const { defineConfig } = require('cypress');
const plugins = require('./cypress/plugins/index');

module.exports = defineConfig({
    video: false,
    viewportWidth: 1300,
    viewportHeight: 960,
    defaultCommandTimeout: 25000,
    downloadsFolder: 'cypress/fixtures',
    env: {
        user: 'admin',
        email: 'admin@localhost.company',
        password: '12qwaszx',
        coverage: false,
    },
    e2e: {
        setupNodeEvents(on, config) {
            return plugins(on, config);
        },
        testIsolation: false,
        baseUrl: 'http://localhost:8080',
        specPattern: [
            'cypress/e2e/actions_objects2/case_108_rotated_bounding_boxes.js',
            'cypress/e2e/actions_objects2/case_10_polygon_shape_track_label_points.js',
            'cypress/e2e/actions_objects2/case_115_ellipse_shape_track_label.js',
            'cypress/e2e/actions_objects2/case_11_polylines_shape_track_label_points.js',
            'cypress/e2e/actions_objects2/case_12_points_shape_track_label.js',
            'cypress/e2e/actions_objects2/case_13_merge_split_features.js',
            'cypress/e2e/actions_objects2/case_14_appearance_features.js',
            'cypress/e2e/actions_objects2/case_15_group_features.js',
            'cypress/e2e/actions_objects2/case_16_z_order_features.js',
            'cypress/e2e/actions_objects2/case_17_lock_hide_features.js',
            'cypress/e2e/issues_prs/issue_2418_object_tag_same_labels.js',
            'cypress/e2e/issues_prs/issue_2485_navigation_empty_frames.js',
            'cypress/e2e/issues_prs/issue_2486_not_edit_object_aam.js',
            'cypress/e2e/issues_prs/issue_2487_extra_instances_canvas_grouping.js',
            'cypress/e2e/issues_prs/issue_2661_displaying_attached_files_when_creating_task.js',
            'cypress/e2e/issues_prs/issue_2753_call_HOC_component_each_render.js',
            'cypress/e2e/issues_prs/issue_2807_polyline_editing.js',
            'cypress/e2e/issues_prs/issue_2992_crop_polygon_properly.js',
            'cypress/e2e/issues_prs/pr_1370_check_UI_fail_with_object_dragging_and_go_next_frame.js',
            'cypress/e2e/issues_prs/pr_2203_error_cannot_read_property_at_saving_job.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
