// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import pjson from '../../package.json';
import { Canvas3dController, Canvas3dControllerImpl } from './canvas3dController';
import { Canvas3dModel, Canvas3dModelImpl, Mode } from './canvas3dModel';
import { Canvas3dView, Canvas3dViewImpl } from './canvas3dView';
import { Master } from './master';

const Canvas3dVersion = pjson.version;

interface Canvas3d {
    html(): any;
    setup(frameData: any): void;
    isAbleToChangeFrame(): boolean;
    fitCanvas(): void;
    mode(): Mode;
    render(): void;
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

    public render(): void {
        this.view.render();
    }

    public setup(frameData: any): void {
        this.model.setup(frameData);
    }

    public mode(): Mode {
        return this.model.mode;
    }

    public isAbleToChangeFrame(): boolean {
        return this.model.isAbleToChangeFrame();
    }

    public fitCanvas(): void {
        this.model.fitCanvas(this.view.html().clientWidth, this.view.html().clientHeight);
    }
}

export { Canvas3dImpl as Canvas3d, Canvas3dVersion };
