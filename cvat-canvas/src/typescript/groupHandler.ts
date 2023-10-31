// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { GroupData } from './canvasModel';
import { ObjectSelector } from './objectSelector';

export interface GroupHandler {
    group(groupData: GroupData): void;
    select(state: any): void;
    cancel(): void;
}

export class GroupHandlerImpl implements GroupHandler {
    private onSelectDone: (objects?: any[]) => void;
    private selector: ObjectSelector;
    private initialized: boolean;
    private statesToBeGroupped: any[];

    private release(): void {
        this.selector.disable();
        this.initialized = false;
    }

    private initGrouping(): void {
        this.statesToBeGroupped = [];
        this.selector.enable((selected) => {
            this.statesToBeGroupped = selected;
        });
        this.initialized = true;
    }

    private closeGrouping(): void {
        if (this.initialized) {
            const { statesToBeGroupped } = this;
            this.release();
            this.onSelectDone(statesToBeGroupped.length ? statesToBeGroupped : undefined);
        }
    }

    public constructor(onSelectDone: (objects?: any[]) => void, selector: ObjectSelector) {
        this.onSelectDone = onSelectDone;
        this.selector = selector;
        this.statesToBeGroupped = [];
        this.initialized = false;
    }

    public group(groupData: GroupData): void {
        if (groupData.enabled) {
            this.initGrouping();
        } else {
            this.closeGrouping();
        }
    }

    public select(objectState: any): void {
        this.selector.push(objectState);
    }

    public cancel(): void {
        this.release();
        this.onSelectDone();
    }
}
