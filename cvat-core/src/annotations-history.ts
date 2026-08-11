// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { HistoryActions } from './enums';

const MAX_HISTORY_LENGTH = 32;

interface ActionItem {
    action: HistoryActions;
    clientIds: number[];
    frame: number | null;
    undo: () => void;
    redo: () => void;
}

class HistoryTransaction implements ActionItem {
    public action: HistoryActions;
    public frame: number | null = null;
    private actions: ActionItem[] = [];

    constructor(action: HistoryActions) {
        this.action = action;
    }

    public get clientIds(): number[] {
        return [...new Set(this.actions.flatMap((action) => action.clientIds))];
    }

    public get empty(): boolean {
        return !this.actions.length;
    }

    public add(action: ActionItem): void {
        this.actions.push(action);
    }

    public async undo(): Promise<void> {
        for (let index = this.actions.length - 1; index >= 0; index--) {
            await this.actions[index].undo();
        }
    }

    public async redo(): Promise<void> {
        for (const action of this.actions) {
            await action.redo();
        }
    }
}

export default class AnnotationHistory {
    private frozen: boolean;
    private _undo: ActionItem[];
    private _redo: ActionItem[];
    private transaction: HistoryTransaction | null;

    constructor() {
        this.frozen = false;
        this.transaction = null;
        this.clear();
    }

    public freeze(frozen: boolean): void {
        this.frozen = frozen;
    }

    public get(): {
        undo: [HistoryActions, number | null][],
        redo: [HistoryActions, number | null][],
    } {
        return {
            undo: this._undo.map((undo) => [undo.action, undo.frame]),
            redo: this._redo.map((redo) => [redo.action, redo.frame]),
        };
    }

    public do(
        action: HistoryActions,
        undo: () => void,
        redo: () => void,
        clientIds: number[],
        frame: number | null,
    ): void {
        if (this.frozen) return;

        const actionItem: ActionItem = {
            clientIds,
            action,
            undo,
            redo,
            frame,
        };

        if (this.transaction) {
            this.transaction.add(actionItem);
            return;
        }

        this._undo = this._undo.slice(-MAX_HISTORY_LENGTH + 1);
        this._undo.push(actionItem);
        this._redo = [];
    }

    public beginTransaction(action: HistoryActions): void {
        if (this.transaction) throw new Error('Another history transaction is already active');
        this.transaction = new HistoryTransaction(action);
    }

    public endTransaction(): void {
        const { transaction } = this;
        this.transaction = null;
        if (!transaction || transaction.empty) return;

        this._undo = this._undo.slice(-MAX_HISTORY_LENGTH + 1);
        this._undo.push(transaction);
        this._redo = [];
    }

    public async undo(count: number): Promise<number[]> {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._undo.pop();
            if (action) {
                await action.undo();
                this._redo.push(action);
                affectedObjects.push(...action.clientIds);
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
                affectedObjects.push(...action.clientIds);
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
