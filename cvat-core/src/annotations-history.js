/*
* Copyright (C) 2019-2020 Intel Corporation
* SPDX-License-Identifier: MIT
*/

const MAX_HISTORY_LENGTH = 128;

class AnnotationHistory {
    constructor() {
        this.clear();
    }

    get() {
        return {
            undo: this._undo.map((undo) => undo.action),
            redo: this._redo.map((redo) => redo.action),
        };
    }

    do(action, undo, redo, clientIDs) {
        const actionItem = {
            clientIDs,
            action,
            undo,
            redo,
        };

        this._undo = this._undo.slice(-MAX_HISTORY_LENGTH + 1);
        this._undo.push(actionItem);
        this._redo = [];
    }

    undo(count) {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._undo.pop();
            if (action) {
                action.undo();
                this._redo.push(action);
                affectedObjects.push(...action.clientIDs);
            } else {
                break;
            }
        }

        return affectedObjects;
    }

    redo(count) {
        const affectedObjects = [];
        for (let i = 0; i < count; i++) {
            const action = this._redo.pop();
            if (action) {
                action.redo();
                this._undo.push(action);
                affectedObjects.push(...action.clientIDs);
            } else {
                break;
            }
        }

        return affectedObjects;
    }

    clear() {
        this._undo = [];
        this._redo = [];
    }
}

module.exports = AnnotationHistory;
