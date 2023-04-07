// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { MLModel, getCore } from 'cvat-core-wrapper';

const core = getCore();

type UpdateLambdaListCallback = (plugin: LambdaManagerPlugin, models: MLModel[]) => void;
interface LambdaManagerPlugin {
    name: string;
    description: string;
    cvat: {
        lambda: {
            updateModelList: {
                enter: UpdateLambdaListCallback;
            };
        };
    };
}

function registerLambdaManagerPlugin(callback: UpdateLambdaListCallback): void {
    const plugin = {
        name: 'Lambda',
        description: 'Plugin allows to react on model list changes',
        cvat: {
            lambda: {
                updateModelList: {
                    enter: callback,
                },
            },
        },
    };

    core.plugins.register(plugin);
}

export default registerLambdaManagerPlugin;
