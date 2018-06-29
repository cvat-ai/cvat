/* exported CollectionController */
"use strict";

class CollectionController {
    constructor(collectionModel) {
        this._collectionModel = collectionModel;
        this._playerScale = 1;
        this._moveMode = false;
        this._resizeMode = false;
        this._drawMode = false;
        this._pasteMode = false;
        this._AAM = false;
        this._lastMousePos = {
            x: 0,
            y: 0
        };
        this._collectionHash = this._collectionModel.getHash();
        setupInteract.call(this);
        setupCollectionShortkeys.call(this);


        function setupCollectionShortkeys() {
            let deleteHandler = Logger.shortkeyLogDecorator(function(e) {
                if (this._AAM) return;
                this._collectionModel.removeactivetrack(e.shiftKey);
            }.bind(this));

            let lockHandler = Logger.shortkeyLogDecorator(function() {
                if (this._AAM) return;
                this._collectionModel.switchLockForActive();
            }.bind(this));

            let lockAllHandler = Logger.shortkeyLogDecorator(function() {
                if (this._AAM) return;
                this._collectionModel.switchLockForAll();
            }.bind(this));

            let occludedHandler = Logger.shortkeyLogDecorator(function() {
                this._collectionModel.switchOccludedForActive();
            }.bind(this));

            let changeColorHandler = Logger.shortkeyLogDecorator(function() {
                this._collectionModel.switchColorForActive();
            }.bind(this));

            let changeLabelHandler = Logger.shortkeyLogDecorator(function(e) {
                let labelIdx = e.keyCode - '1'.charCodeAt(0);
                this._collectionModel.reinitializeActive(labelIdx);
                let fakeKeyState = {
                    ctrl: false,
                    shift: false,
                    alt: false
                };
                if (!this._AAM) this._collectionModel.onmousemove(this._lastMousePos.x, this._lastMousePos.y, fakeKeyState);
            }.bind(this));

            let shortkeys = userConfig.shortkeys;

            Mousetrap.bind(shortkeys["delete_track"].value.split(','), deleteHandler, 'keydown');
            Mousetrap.bind(shortkeys["switch_lock_property"].value, lockHandler, 'keyup');
            Mousetrap.bind(shortkeys["switch_all_lock_property"].value, lockAllHandler, 'keydown');
            Mousetrap.bind(shortkeys["switch_occluded_property"].value.split(','), occludedHandler, 'keydown');
            Mousetrap.bind(shortkeys["change_shape_color"].value, changeColorHandler, 'keydown');
            Mousetrap.bind(shortkeys["change_track_label"].value.split(','), changeLabelHandler, 'keydown');
        }

        function setupInteract() {
            interact('.highlightedShape').draggable({
                onstart: function() {
                    this._moveMode = true;
                }.bind(this),
                onmove: function(event) {
                    let scale = this._playerScale;
                    let target = $(event.target);
                    if (this._drawMode || !target.hasClass('highlightedShape') || event.shiftKey) {
                        return;
                    }
                    target.attr('x', +target.attr('x') + event.dx/scale);
                    target.attr('y', +target.attr('y') + event.dy/scale);
                    target.trigger('drag', scale);
                }.bind(this),
                onend: function () {
                    this._moveMode = false;
                }.bind(this)
            }).resizable({
                margin: 8,
                edges: { left: true, right: true, bottom: true, top: true },
                restrict: {
                    restriction: $('#frameContent')[0]
                },
                onstart: function() {
                    this._resizeMode = true;
                }.bind(this),
                onmove: function(event) {
                    if (this._drawMode) return;
                    let target = $(event.target);
                    let scale = this._playerScale;
                    if (this._drawMode || !target.hasClass('highlightedShape') || event.shiftKey) {
                        return;
                    }

                    let newX = +target.attr('x') + event.deltaRect.left / scale;
                    let newY = +target.attr('y') + event.deltaRect.top / scale;
                    let newHeight = +target.attr('height') + event.deltaRect.height / scale;
                    let newWidth = +target.attr('width') + event.deltaRect.width / scale;
                    if (newHeight < 1) newHeight = 1;
                    if (newWidth < 1) newWidth = 1;
                    target.attr('x', newX );
                    target.attr('y', newY );
                    target.attr('height', newHeight );
                    target.attr('width', newWidth);
                    target.trigger('resize', scale);
                }.bind(this),
                onend: function () {
                    this._resizeMode = false;
                }.bind(this)
            });
        }   // end of setupInteract
    }

    setShowAllInterTracks(value) {
        this._collectionModel.allInterTracks = value;
    }

    setHiddenForAll(value) {
        this._collectionModel.setHiddenForAll(value);
    }

    setHiddenLabelForAll(value) {
        this._collectionModel.setHiddenLabelForAll(value);
    }

    onchangeframe(newframe) {
        this._collectionModel.onchangeframe(newframe);
        if (this._AAM) return;
        let fakeKeyState = {
            ctrl: false,
            shift: false,
            alt: false
        };
        this._collectionModel.onmousemove(this._lastMousePos.x, this._lastMousePos.y, fakeKeyState);
    }

    updateFrame() {
        this._collectionModel.updateFrame();
    }

    resetactivetrack(e) {
        if (this._moveMode || this._resizeMode || this._AAM || e.ctrlKey) return;
        this._collectionModel.resetactivetrack();
    }

    setactivetrack(id, e) {
        if (this._pasteMode || this._AAM || e.ctrlKey) return;
        this._collectionModel.setactivetrack(id);
    }

    getmodifierkeysstate(e) {
        return {
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
        };
    }

    onmousemove(e) {
        let pos = translateSVGPos($('#frameContent')[0], e.clientX, e.clientY, this._playerScale);
        this._lastMousePos = {
            x: pos.x,
            y: pos.y
        };
        if (this._moveMode || this._resizeMode || this._drawMode || this._pasteMode || this._AAM) return;
        let modKeysState = this.getmodifierkeysstate(e);
        this._collectionModel.onmousemove(pos.x, pos.y, modKeysState);
    }

    onDrawerUpdate(drawer) {
        this._drawMode = drawer.drawMode;
        if (this._drawMode) this._collectionModel.resetactivetrack();
    }

    onBufferUpdate(buffer) {
        this._pasteMode = buffer.pasteMode;
        if (this._pasteMode) {
            this._collectionModel.resetactivetrack();
        }
    }

    onAAMUpdate(aam) {
        if (aam.activeAAM && !this._AAM) {
            this._collectionModel.resetactivetrack();
            interact('.highlightedShape').draggable(false);
            interact('.highlightedShape').resizable(false);
        }
        else if (this._AAM && !aam.activeAAM) {
            interact('.highlightedShape').draggable(true);
            interact('.highlightedShape').resizable(true);
        }
        this._AAM = aam.activeAAM;
    }

    set playerScale(value) {
        this._playerScale = value;
    }

    hasUnsavedChanges() {
        return this._collectionModel.getHash() !== this._collectionHash;
    }

    updateHash() {
        this._collectionHash = this._collectionModel.getHash();
    }
}
