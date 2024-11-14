// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

function defaultTaskSpec({
    labelName,
    taskName,
    serverFiles,
    validationParams,
}) {
    const taskSpec = {
        labels: [
            { name: labelName, attributes: [], type: 'any' },
        ],
        name: taskName,
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: (validationParams && validationParams.mode === 'gt_pool') ? 'random' : 'lexicographical',
    };

    const extras = validationParams ? {
        validation_params: {
            frames: validationParams.frames,
            frame_selection_method: validationParams.frameSelectionMethod,
            frame_count: validationParams.frameCount,
            frames_per_job_count: validationParams.framesPerJobCount,
            mode: validationParams.mode,
            ...(validationParams.randomSeed ? {
                random_seed: validationParams.randomSeed,
            } : {}),
        },
    } : {};

    return {
        taskSpec,
        dataSpec,
        extras,
    };
}

function defaultGTJobSpec({
    frameCount = 3,
    seed = null,
}) {
    return {
        frame_count: frameCount,
        type: 'ground_truth',
        frame_selection_method: 'random_uniform',
        ...(seed ? {
            seed,
        } : {}),
    };
}

module.exports = {
    defaultTaskSpec,
    defaultGTJobSpec,
};
