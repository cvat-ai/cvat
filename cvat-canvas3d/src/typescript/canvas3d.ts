// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import '../scss/canvas.scss';
import pjson from '../../package.json';
import { Configuration } from './canvas3dModel';
import { Canvas3dModelImpl, Canvas3dModel } from './canvas3dModel';
import { Master } from './master';
import { Canvas3dController, Canvas3dControllerImpl } from './canvas3dController';
import { Canvas3dView, Canvas3dViewImpl } from './canvas3dView';

const Canvas3dVersion = pjson.version;

interface Canvas3d {
    html(): any;
    setup(frameData: any, objectStates: any[], zLayer?: number): void;
    configure(configuration: Configuration): void;
    isAbleToChangeFrame(): boolean;
    fitCanvas(): void;
}

class Canvas3dImpl implements Canvas3d {
    private model: Canvas3dModel & Master;
    private controller: Canvas3dController;
    private view: Canvas3dView;

    public constructor() {
        this.model = new Canvas3dModelImpl();
        this.controller = new Canvas3dControllerImpl(this.model);
        this.view = new Canvas3dViewImpl(this.model, this.controller);
    }

    public html(): any {
        return this.view.html();
    }

    public render(): any {
        return this.view.render();
    }

    public setup(frameData: any, objectStates: any[], zLayer = 0): void {
        this.model.setup(frameData, objectStates, zLayer);
    }

    configure(configuration: Configuration): void {
        this.model.configure(configuration);
    }

    public isAbleToChangeFrame(): boolean {
        return this.model.isAbleToChangeFrame();
    }

    public fitCanvas(): void {
        this.model.fitCanvas(this.view.html().clientWidth, this.view.html().clientHeight);
    }
}

export { Canvas3dImpl as Canvas3d, Canvas3dVersion };
