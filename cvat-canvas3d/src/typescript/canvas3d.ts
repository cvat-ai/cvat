// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import pjson from '../../package.json';
import { Canvas3dController, Canvas3dControllerImpl } from './canvas3dController';
import { Canvas3dModel, Canvas3dModelImpl, Mode } from './canvas3dModel';
import { Canvas3dView, Canvas3dViewImpl, ViewsDOM } from './canvas3dView';
import { Master } from './master';

const Canvas3dVersion = pjson.version;

interface Canvas3d {
    html(): ViewsDOM;
    setup(frameData: any): void;
    isAbleToChangeFrame(): boolean;
    mode(): Mode;
    render(): void;
    keyControls(keys: KeyboardEvent): void;
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

    public html(): ViewsDOM {
        return this.view.html();
    }

    public keyControls(keys: KeyboardEvent): void {
        this.view.keyControls(keys);
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
}

export { Canvas3dImpl as Canvas3d, Canvas3dVersion };
