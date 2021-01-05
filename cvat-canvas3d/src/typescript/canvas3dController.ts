// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    Canvas3dModel,
    Mode,
    Configuration,
} from './canvas3dModel';

export interface Canvas3dController {
    readonly configuration: Configuration;
    mode: Mode;
    fit(): void;
}

export class Canvas3dControllerImpl implements Canvas3dController {
    private model: Canvas3dModel;

    public constructor(model: Canvas3dModel) {
        this.model = model;
    }

    public fit(): void {
        this.model.fit();
    }

    public get configuration(): Configuration {
        return this.model.configuration;
    }

    public set mode(value: Mode) {
        this.model.mode = value;
    }

    public get mode(): Mode {
        return this.model.mode;
    }
}
