// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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

        this._undo = this._undo.slice(-MAX_HISTORY_LENGTH + 1);
        this._undo.push(actionItem);
        this._redo = [];
    }

    public async undo(count: number): Promise<number[]> {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._undo.pop();
            if (action) {
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
    }
}
