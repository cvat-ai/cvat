// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
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
    private statesToBeGroupped: any[];
    private startTimestamp: number;

    private release(): void {
        this.selector.disable();
        this.initialized = false;
    }

    private initGrouping(selectionFilter: SelectionFilter): void {
        this.statesToBeGroupped = [];
        this.selector.enable((selected) => {
            this.statesToBeGroupped = selected;
        }, selectionFilter);
        this.initialized = true;
        this.startTimestamp = Date.now();
    }

    private closeGrouping(): void {
        if (this.initialized) {
            const { statesToBeGroupped } = this;
            this.release();
            if (statesToBeGroupped.length) {
                this.onSelectDone(statesToBeGroupped, Date.now() - this.startTimestamp);
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
        this.statesToBeGroupped = [];
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
