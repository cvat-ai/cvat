/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AAMModel AAMController AAMView */
"use strict";

const AAMUndefinedKeyword = '__undefined__';

class AAMModel extends Listener {
    constructor(shapeCollection, focus, fit) {
        super('onAAMUpdate', () => this);
        this._shapeCollection = shapeCollection;
        this._focus = focus;
        this._fit = fit;
        this._activeAAM = false;
        this._activeIdx = null;
        this._active = null;
        this._margin = 100;
        this._currentShapes = [];
        this._attrNumberByLabel = {};
        this._helps = {};
        for (let labelId in window.cvat.labelsInfo.labels()) {
            let labelAttributes = window.cvat.labelsInfo.labelAttributes(labelId);
            if (Object.keys(labelAttributes).length) {
                this._attrNumberByLabel[labelId] = {
                    current: 0,
                    end: Object.keys(labelAttributes).length
                };

                for (let attrId in labelAttributes) {
                    this._helps[attrId] = {
                        title: `${window.cvat.labelsInfo.labels()[labelId]}, ${window.cvat.labelsInfo.attributes()[attrId]}`,
                        help: getHelp(attrId),
                    };
                }
            }
        }

        function getHelp(attrId) {
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            let help = [];
            switch (attrInfo.type) {
            case 'checkbox':
                help.push('0 - ' + attrInfo.values[0]);
                help.push('1 - ' + !attrInfo.values[0]);
                break;
            default:
                for (let idx = 0; idx < attrInfo.values.length; idx ++) {
                    if (idx > 9) break;
                    if (attrInfo.values[0] === AAMUndefinedKeyword) {
                        if (!idx) continue;
                        help.push(idx - 1 + ' - ' + attrInfo.values[idx]);
                    }
                    else {
                        help.push(idx + ' - ' + attrInfo.values[idx]);
                    }
                }
            }

            return help;
        }

        shapeCollection.subscribe(this);
    }

    _bbRect(pos) {
        if ('points' in pos) {
            let points = PolyShapeModel.convertStringToNumberArray(pos.points);
            let xtl = Number.MAX_SAFE_INTEGER;
            let ytl = Number.MAX_SAFE_INTEGER;
            let xbr = Number.MIN_SAFE_INTEGER;
            let ybr = Number.MIN_SAFE_INTEGER;
            for (let point of points) {
                xtl = Math.min(xtl, point.x);
                ytl = Math.min(ytl, point.y);
                xbr = Math.max(xbr, point.x);
                ybr = Math.max(ybr, point.y);
            }
            return [xtl,  ytl, xbr, ybr];
        }
        else {
            return [pos.xtl, pos.ytl, pos.xbr, pos.ybr];
        }
    }

    _updateCollection() {
        this._currentShapes = [];

        for (let shape of  this._shapeCollection.currentShapes) {
            let labelAttributes = window.cvat.labelsInfo.labelAttributes(shape.model.label);
            if (Object.keys(labelAttributes).length && !shape.model.removed && !shape.interpolation.position.outside) {
                this._currentShapes.push({
                    model: shape.model,
                    interpolation: shape.model.interpolate(window.cvat.player.frames.current),
                });
            }
        }

        if (this._currentShapes.length) {
            this._activeIdx = 0;
            this._active = this._currentShapes[0].model;
        }
        else {
            this._activeIdx = null;
            this._active = null;
        }
    }

    _attrIdByIdx(labelId, attrIdx) {
        return Object.keys(window.cvat.labelsInfo.labelAttributes(labelId))[attrIdx];
    }

    _activate() {
        if (this._activeAAM && this._active) {
            let label = this._active.label;
            let attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);

            let [xtl, ytl, xbr, ybr] = this._bbRect(this._currentShapes[this._activeIdx].interpolation.position);
            this._focus(xtl - this._margin, xbr + this._margin, ytl - this._margin, ybr + this._margin);

            this._active.activeAAM = {
                shape: true,
                attribute: attrId,
            };

            this.notify();

            if (attrInfo.type === 'text' || attrInfo.type === 'number') {
                this._active.aamAttributeFocus();
            }
        }
        else {
            this.notify();
        }
    }

    _deactivate() {
        if (this._activeAAM && this._active) {
            this._active.activeAAM = {
                shape: false,
                attribute: null
            };
        }
    }

    _enable() {
        if (window.cvat.mode === null) {
            window.cvat.mode = 'aam';
            this._shapeCollection.resetActive();
            this._activeAAM = true;
            this._updateCollection();
            this.notify();
            this._activate();
        }
    }

    _disable() {
        if (this._activeAAM && window.cvat.mode === 'aam') {
            this._deactivate();
            window.cvat.mode = null;
            this._activeAAM = false;
            this._activeIdx = null;
            this._active = null;

            // Notify for remove aam UI
            this.notify();
            this._fit();
        }
    }

    switchAAMMode() {
        if (this._activeAAM) {
            this._disable();
        }
        else {
            this._enable();
        }
    }

    moveShape(direction) {
        if (!this._activeAAM || this._currentShapes.length < 2) {
            return;
        }

        this._deactivate();
        if (Math.sign(direction) < 0) {
            // next
            this._activeIdx ++;
            if (this._activeIdx >= this._currentShapes.length) {
                this._activeIdx = 0;
            }
        }
        else {
            // prev
            this._activeIdx --;
            if (this._activeIdx < 0) {
                this._activeIdx = this._currentShapes.length - 1;
            }
        }

        this._active = this._currentShapes[this._activeIdx].model;
        this._activate();
    }

    moveAttr(direction) {
        if (!this._activeAAM || !this._active) {
            return;
        }

        let curAttr = this._attrNumberByLabel[this._active.label];

        if (curAttr.end < 2) {
            return;
        }

        if (Math.sign(direction) > 0) {
            // next
            curAttr.current ++;
            if (curAttr.current >= curAttr.end) {
                curAttr.current = 0;
            }
        }
        else {
            // prev
            curAttr.current --;
            if (curAttr.current < 0) {
                curAttr.current = curAttr.end - 1;
            }
        }
        this._activate();
    }

    setupAttributeValue(key) {
        if (!this._activeAAM || !this._active) {
            return;
        }

        let label = this._active.label;
        let frame = window.cvat.player.frames.current;
        let attrId = this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
        let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);

        if (key >= attrInfo.values.length) {
            if (attrInfo.type === 'checkbox' && key < 2) {
                this._active.updateAttribute(frame, attrId, !attrInfo.values[0]);
            }
            return;
        }

        if (attrInfo.values[0] === AAMUndefinedKeyword) {
            if (key >= attrInfo.values.length - 1) {
                return;
            }
            key ++;
        }

        this._active.updateAttribute(frame, attrId, attrInfo.values[key]);
    }

    onCollectionUpdate() {
        if (this._activeAAM) {
            // No need deactivate active view because all listeners already unsubscribed
            this._updateCollection();
            this._activate();
        }
    }

    generateHelps() {
        if (this._active) {
            let label = this._active.label;
            let attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
            return [this._helps[attrId].title, this._helps[attrId].help, `${this._activeIdx + 1}/${this._currentShapes.length}`];
        }
        else {
            return ['No Shapes Found', '', '0/0'];
        }
    }

    get activeAAM() {
        return this._activeAAM;
    }

    set margin(value) {
        this._margin = value;
    }
}



class AAMController {
    constructor(aamModel) {
        this._model = aamModel;

        setupAAMShortkeys.call(this);

        function setupAAMShortkeys() {
            let switchAAMHandler = Logger.shortkeyLogDecorator(function() {
                this._model.switchAAMMode();
            }.bind(this));

            let nextAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.moveAttr(1);
                e.preventDefault();
            }.bind(this));

            let prevAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.moveAttr(-1);
                e.preventDefault();
            }.bind(this));

            let nextShapeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.moveShape(1);
                e.preventDefault();
            }.bind(this));

            let prevShapeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.moveShape(-1);
                e.preventDefault();
            }.bind(this));

            let selectAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                let key = e.keyCode;
                if (key >= 48 && key <= 57) {
                    key -= 48;  // 0 and 9
                }
                else if (key >= 96 && key <= 105) {
                    key -= 96; // num 0 and 9
                }
                else {
                    return;
                }

                this._model.setupAttributeValue(key);
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["switch_aam_mode"].value, switchAAMHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_next_attribute"].value, nextAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_prev_attribute"].value, prevAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_next_shape"].value, nextShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_prev_shape"].value, prevShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys["select_i_attribute"].value, selectAttributeHandler, 'keydown');
        }
    }

    setMargin(value) {
        this._model.margin = value;
    }
}


class AAMView {
    constructor(aamModel, aamController) {
        this._trackManagement = $('#trackManagement');
        this._aamMenu = $('#aamMenu');
        this._aamTitle = $('#aamTitle');
        this._aamCounter = $('#aamCounter');
        this._aamHelpContainer = $('#aamHelpContainer');
        this._zoomMargin = $('#aamZoomMargin');
        this._controller = aamController;

        this._zoomMargin.on('change', (e) => {
            let value = +e.target.value;
            this._controller.setMargin(value);
        }).trigger('change');
        aamModel.subscribe(this);
    }

    onAAMUpdate(aam) {
        if (aam.activeAAM) {
            if (this._aamMenu.hasClass('hidden')) {
                this._trackManagement.addClass('hidden');
                this._aamMenu.removeClass('hidden');
            }

            let [title, help, counter] = aam.generateHelps();
            this._aamHelpContainer.empty();
            this._aamCounter.text(counter);
            this._aamTitle.text(title);

            for (let helpRow of help) {
                $(`<label> ${helpRow} <label> <br>`).appendTo(this._aamHelpContainer);
            }
        }
        else {
            if (this._trackManagement.hasClass('hidden')) {
                this._aamMenu.addClass('hidden');
                this._trackManagement.removeClass('hidden');
            }
        }
        // blur on change text attribute to other or on exit from aam
        blurAllElements();
    }
}
