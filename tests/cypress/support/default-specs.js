// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

function defaultTaskSpec({
    labelName,
    labelType,
    taskName,
    serverFiles,
    startFrame,
    frameFilter,
    segmentSize,
    validationParams,
}) {
    const taskSpec = {
        labels: [
            { name: labelName, attributes: [], type: labelType || 'any' },
        ],
        name: taskName,
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    if (segmentSize) {
        taskSpec.segment_size = segmentSize;
    }

    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: (validationParams && validationParams.mode === 'gt_pool') ? 'random' : 'lexicographical',
    };
    if (startFrame) {
        dataSpec.start_frame = startFrame;
    }
    if (frameFilter) {
        dataSpec.frame_filter = frameFilter;
    }

    const extras = {};
    if (validationParams) {
        const convertedParams = {};
        if (validationParams.frames) {
            convertedParams.frames = validationParams.frames;
        }
        if (validationParams.frameSelectionMethod) {
            convertedParams.frame_selection_method = validationParams.frameSelectionMethod;
        }
        if (validationParams.frameCount) {
            convertedParams.frame_count = validationParams.frameCount;
        }
        if (validationParams.framesPerJobCount) {
            convertedParams.frames_per_job_count = validationParams.framesPerJobCount;
        }
        if (validationParams.mode) {
            convertedParams.mode = validationParams.mode;
        }
        if (validationParams.randomSeed) {
            convertedParams.random_seed = validationParams.randomSeed;
        }

        extras.validation_params = convertedParams;
    }

    return {
        taskSpec,
        dataSpec,
        extras,
    };
}

module.exports = {
    defaultTaskSpec,
};
