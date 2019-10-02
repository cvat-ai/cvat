/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported HistoryModel HistoryController HistoryView */

/* global
    Listener:false
    Logger:false
    Mousetrap:false
*/
"use strict";

class HistoryModel extends Listener {
    constructor(playerModel) {
        super('onHistoryUpdate', () => this );

        this._deep = 128;
        this._id = 0;
        this._undo_stack = [];
        this._redo_stack = [];
        this._locked = false;
        this._player = playerModel;

        window.cvat.addAction = (name, undo, redo, frame) => this.addAction(name, undo, redo, frame);
    }

    undo() {
        let frame = window.cvat.player.frames.current;
        let undo = this._undo_stack.pop();

        if (undo) {
            try {
                Logger.addEvent(Logger.EventType.undoAction, {
                    name: undo.name,
                    frame: undo.frame,
                });

                if (undo.frame != frame) {
                    this._player.shift(undo.frame, true);
                }
                this._locked = true;
                undo.undo();
            }
            catch(err) {
                this.notify();
                throw err;
            }
            finally {
                this._locked = false;
            }

            this._redo_stack.push(undo);
        }

        this.notify();
    }

    redo() {
        let frame = window.cvat.player.frames.current;
        let redo = this._redo_stack.pop();

        if (redo) {
            try {
                Logger.addEvent(Logger.EventType.redoAction, {
                    name: redo.name,
                    frame: redo.frame,
                });

                if (redo.frame != frame) {
                    this._player.shift(redo.frame, true);
                }
                this._locked = true;
                redo.redo();
            }
            catch(err) {
                this.notify();
                throw err;
            }
            finally {
                this._locked = false;
            }

            this._undo_stack.push(redo);
        }

        this.notify();
    }

    addAction(name, undo, redo, frame) {
        if (this._locked) return;
        if (this._undo_stack.length >= this._deep) {
            this._undo_stack.shift();
        }

        this._undo_stack.push({
            name: name,
            undo: undo,
            redo: redo,
            frame: frame,
            id: this._id++,
        });
        this._redo_stack = [];
        this.notify();
    }

    empty() {
        this._undo_stack = [];
        this._redo_stack = [];
        this._id = 0;
        this.notify();
    }

    get undoLength() {
        return this._undo_stack.length;
    }

    get redoLength() {
        return this._redo_stack.length;
    }

    get lastUndoText() {
        let lastUndo = this._undo_stack[this._undo_stack.length - 1];
        if (lastUndo) {
            return `${lastUndo.name} [Frame ${lastUndo.frame}] [Id ${lastUndo.id}]`;
        }
        else return 'None';
    }

    get lastRedoText() {
        let lastRedo = this._redo_stack[this._redo_stack.length - 1];
        if (lastRedo) {
            return `${lastRedo.name} [Frame ${lastRedo.frame}] [Id ${lastRedo.id}]`;
        }
        else return 'None';
    }
}


class HistoryController {
    constructor(model) {
        this._model = model;
        setupCollectionShortcuts.call(this);

        function setupCollectionShortcuts() {
            let undoHandler = Logger.shortkeyLogDecorator(function(e) {
                this.undo();
                e.preventDefault();
            }.bind(this));

            let redoHandler = Logger.shortkeyLogDecorator(function(e) {
                this.redo();
                e.preventDefault();
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["undo"].value, undoHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["redo"].value, redoHandler.bind(this), 'keydown');
        }
    }

    undo() {
        if (!window.cvat.mode) {
            this._model.undo();
        }
    }

    redo() {
        if (!window.cvat.mode) {
            this._model.redo();
        }
    }
}


class HistoryView {
    constructor(controller, model) {
        this._controller = controller;
        this._undoButton = $('#undoButton');
        this._redoButton = $('#redoButton');
        this._lastUndoText = $('#lastUndoText');
        this._lastRedoText = $('#lastRedoText');

        let shortkeys = window.cvat.config.shortkeys;
        this._undoButton.attr('title', `${shortkeys['undo'].view_value} - ${shortkeys['undo'].description}`);
        this._redoButton.attr('title', `${shortkeys['redo'].view_value} - ${shortkeys['redo'].description}`);

        this._undoButton.on('click', () => {
            this._controller.undo();
        });

        this._redoButton.on('click', () => {
            this._controller.redo();
        });

        model.subscribe(this);
    }

    onHistoryUpdate(model) {
        if (model.undoLength) {
            this._undoButton.prop('disabled', false);
        }
        else {
            this._undoButton.prop('disabled', true);
        }

        if (model.redoLength) {
            this._redoButton.prop('disabled', false);
        }
        else {
            this._redoButton.prop('disabled', true);
        }

        this._lastUndoText.text(model.lastUndoText);
        this._lastRedoText.text(model.lastRedoText);
    }
}
