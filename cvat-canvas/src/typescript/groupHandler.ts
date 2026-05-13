// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { GroupData } from './canvasModel';
import { ObjectSelector, SelectionFilter } from './objectSelector';

export interface GroupHandler {
    group(groupData: GroupData, selectionFilter: SelectionFilter): void;
    select(state: any): void;
    cancel(): void;
}

export class GroupHandlerImpl implements GroupHandler {
    private onSelectDone: (objects?: any[], duration?: number) => void;
    private selector: ObjectSelector;
    private initialized: boolean;
    private statesToBeGrouped: any[];
    private startTimestamp: number;

    private release(): void {
        this.selector.disable();
        this.initialized = false;
    }

    private initGrouping(selectionFilter: SelectionFilter): void {
        this.statesToBeGrouped = [];
        this.selector.enable((selected) => {
            this.statesToBeGrouped = selected;
        }, selectionFilter);
        this.initialized = true;
        this.startTimestamp = Date.now();
    }

    private closeGrouping(): void {
        if (this.initialized) {
            const { statesToBeGrouped } = this;
            this.release();
            if (statesToBeGrouped.length) {
                this.onSelectDone(statesToBeGrouped, Date.now() - this.startTimestamp);
            } else {
                this.onSelectDone();
            }
        }
    }

    public constructor(
        onSelectDone: GroupHandlerImpl['onSelectDone'],
        selector: ObjectSelector,
    ) {
        this.onSelectDone = onSelectDone;
        this.selector = selector;
        this.statesToBeGrouped = [];
        this.initialized = false;
        this.startTimestamp = Date.now();
    }

    public group(groupData: GroupData, selectionFilter: SelectionFilter): void {
        if (groupData.enabled) {
            this.initGrouping(selectionFilter);
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
