// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

function defaultTaskSpec({
    labelName,
    labelType,
    attributes,
    taskName,
    serverFiles,
    startFrame,
    stopFrame,
    frameFilter,
    segmentSize,
    validationParams,
    projectID,
    chunkSize,
}) {
    const convertedAttrs = [];
    if (attributes !== undefined) {
        for (const attr of attributes) {
            convertedAttrs.push({
                name: attr.name,
                default_value: attr.values,
                input_type: attr.type.toLowerCase(),
                mutable: false,
                values: [],
            });
            // TODO: segregate all field mapping logic to a separate interface
        }
    }
    const taskSpec = {
        labels: [{ name: labelName, attributes: convertedAttrs, type: labelType || 'any' }],
        name: taskName,
        project_id: projectID || null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    if (segmentSize) {
        taskSpec.segment_size = segmentSize;
    }
    if (chunkSize) {
        taskSpec.data_chunk_size = chunkSize;
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
    if (stopFrame) {
        dataSpec.stop_frame = stopFrame;
    }
    if (frameFilter) {
        dataSpec.frame_filter = frameFilter;
    }

    const extras = {};
    if (validationParams) {
        const convertedParams = {};
        if (validationParams.mode) {
            convertedParams.mode = validationParams.mode;
        }
        if (validationParams.frameSelectionMethod) {
            convertedParams.frame_selection_method = validationParams.frameSelectionMethod;
        }
        if (validationParams.randomSeed) {
            convertedParams.random_seed = validationParams.randomSeed;
        }
        if (validationParams.frames) {
            convertedParams.frames = validationParams.frames;
        }
        if (validationParams.frameCount) {
            convertedParams.frame_count = validationParams.frameCount;
        }
        if (validationParams.frameShare) {
            convertedParams.frame_share = validationParams.frameShare;
        }
        if (validationParams.framesPerJobCount) {
            convertedParams.frames_per_job_count = validationParams.framesPerJobCount;
        }
        if (validationParams.framesPerJobShare) {
            convertedParams.frames_per_job_share = validationParams.framesPerJobShare;
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
