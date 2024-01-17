// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { HistoryActions } from './enums';

const MAX_HISTORY_LENGTH = 128;

interface ActionItem {
    action: HistoryActions;
    undo: Function;
    redo: Function;
    clientIDs: number[];
    frame: number;
}

export default class AnnotationHistory {
    private frozen: boolean;
    private _undo: ActionItem[];
    private _redo: ActionItem[];
    private actionsRestrictions: Partial<Record<HistoryActions, { indexes: number[]; max: number }>> = {
        [HistoryActions.CREATE_MASK_WITH_REMOVE_UNDERLYING_PIXELS]: {
            indexes: [],
            max: 20,
        },
    };

    constructor() {
        this.frozen = false;
        this.clear();
    }

    public freeze(frozen: boolean): void {
        this.frozen = frozen;
    }

    public get(): { undo: [HistoryActions, number][], redo: [HistoryActions, number][] } {
        return {
            undo: this._undo.map((undo) => [undo.action, undo.frame]),
            redo: this._redo.map((redo) => [redo.action, redo.frame]),
        };
    }

    public do(action: HistoryActions, undo: Function, redo: Function, clientIDs: number[], frame: number): void {
        if (this.frozen) return;

        const actionItem = {
            clientIDs,
            action,
            undo,
            redo,
            frame,
        };
        if (this._undo.length >= MAX_HISTORY_LENGTH) {
            const elementsToBeRemoved = this._undo.length - MAX_HISTORY_LENGTH + 1;
            for (let i = 0; i < elementsToBeRemoved; i++) {
                const actionToRemove = this._undo[i].action;
                if (actionToRemove in this.actionsRestrictions) {
                    this.actionsRestrictions[actionToRemove].indexes.shift();
                }
            }

            for (const state of Object.values(this.actionsRestrictions)) {
                state.indexes = state.indexes.map((index) => index - elementsToBeRemoved);
            }
        }
        this._undo = this._undo.slice(-MAX_HISTORY_LENGTH + 1);

        if (action in this.actionsRestrictions) {
            const { max, indexes } = this.actionsRestrictions[action];
            if (indexes.length >= max) {
                this._undo.splice(indexes[0], 1);
                this.actionsRestrictions[action].indexes.shift();
            }

            this.actionsRestrictions[action].indexes.push(this._undo.length);
        }

        this._undo.push(actionItem);
        this._redo = [];
    }

    public async undo(count: number): Promise<number[]> {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._undo.pop();
            if (action) {
                if (action.action in this.actionsRestrictions) {
                    this.actionsRestrictions[action.action].indexes.pop();
                }

                await action.undo();
                this._redo.push(action);
                affectedObjects.push(...action.clientIDs);
            } else {
                break;
            }
        }

        return affectedObjects;
    }

    public async redo(count: number): Promise<number[]> {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._redo.pop();
            if (action) {
                await action.redo();

                if (action.action in this.actionsRestrictions) {
                    const { max, indexes } = this.actionsRestrictions[action.action];
                    if (indexes.length >= max) {
                        this._undo.splice(indexes[0], 1);
                    }

                    this.actionsRestrictions[action.action].indexes.push(this._undo.length);
                }

                this._undo.push(action);
                affectedObjects.push(...action.clientIDs);
            } else {
                break;
            }
        }

        return affectedObjects;
    }

    public clear(): void {
        this._undo = [];
        this._redo = [];
        for (const state of Object.values(this.actionsRestrictions)) {
            state.indexes = [];
        }
    }
}
