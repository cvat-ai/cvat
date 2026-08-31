// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SelectData } from './canvasModel';
import { ObjectSelector, SelectionFilter } from './objectSelector';

export interface SelectHandler {
    select(selectData: SelectData, selectionFilter: SelectionFilter, initialEvent?: MouseEvent): void;
    push(state: any): void;
    setSelected(states: any[], notify?: boolean): void;
    move(event: MouseEvent): void;
    cancel(): void;
}

export class SelectHandlerImpl implements SelectHandler {
    private onSelectDone: (objects?: any[], continueSelection?: boolean) => void;
    private selector: ObjectSelector;
    private initialized: boolean;
    private selectedStates: any[];

    private release(): void {
        this.selector.disable();
        this.initialized = false;
    }

    private initSelection(selectData: SelectData, selectionFilter: SelectionFilter, initialEvent?: MouseEvent): void {
        this.selectedStates = [];
        this.selector.enable((selected) => {
            this.selectedStates = selected;
            if (selectData.once) {
                this.closeSelection();
            } else {
                this.onSelectDone(this.selectedStates, true);
            }
        }, selectionFilter, initialEvent);
        this.initialized = true;
    }

    private closeSelection(): void {
        if (this.initialized) {
            const { selectedStates } = this;
            this.release();
            this.onSelectDone(selectedStates);
        }
    }

    public constructor(
        onSelectDone: SelectHandlerImpl['onSelectDone'],
        selector: ObjectSelector,
    ) {
        this.onSelectDone = onSelectDone;
        this.selector = selector;
        this.selectedStates = [];
        this.initialized = false;
    }

    public select(selectData: SelectData, selectionFilter: SelectionFilter, initialEvent?: MouseEvent): void {
        if (selectData.enabled) {
            this.initSelection(selectData, selectionFilter, initialEvent);
        } else {
            this.closeSelection();
        }
    }

    public push(objectState: any): void {
        this.selector.push(objectState);
    }

    public setSelected(states: any[], notify = true): void {
        this.selectedStates = states;
        this.selector.setSelected(states, notify);
    }

    public move(event: MouseEvent): void {
        this.selector.move(event);
    }

    public cancel(): void {
        this.release();
        this.onSelectDone();
    }
}
