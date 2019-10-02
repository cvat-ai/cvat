/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AAMModel AAMController AAMView AAMUndefinedKeyword */

/* global
    Listener:false
    Logger:false
    Mousetrap:false
    PolyShapeModel:false
    SVG:false
*/

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

        function getHelp(attrId) {
            const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            const help = [];
            switch (attrInfo.type) {
            case 'checkbox':
                help.push(`0 - ${attrInfo.values[0]}`);
                help.push(`1 - ${!attrInfo.values[0]}`);
                break;
            default:
                for (let idx = 0; idx < attrInfo.values.length; idx += 1) {
                    if (idx > 9) {
                        break;
                    }
                    if (attrInfo.values[0] === AAMUndefinedKeyword) {
                        if (!idx) {
                            continue;
                        }
                        help.push(`${idx - 1} - ${attrInfo.values[idx]}`);
                    } else {
                        help.push(`${idx} - ${attrInfo.values[idx]}`);
                    }
                }
            }

            return help;
        }

        const labels = window.cvat.labelsInfo.labels();
        for (const labelId in labels) {
            if (Object.prototype.hasOwnProperty.call(labels, labelId)) {
                const labelAttributes = window.cvat.labelsInfo.labelAttributes(labelId);
                if (Object.keys(labelAttributes).length) {
                    this._attrNumberByLabel[labelId] = {
                        current: 0,
                        end: Object.keys(labelAttributes).length,
                    };

                    for (const attrId in labelAttributes) {
                        if (Object.prototype.hasOwnProperty.call(labelAttributes, attrId)) {
                            this._helps[attrId] = {
                                title: `${window.cvat.labelsInfo.labels()[labelId]}, ${window.cvat.labelsInfo.attributes()[attrId]}`,
                                help: getHelp(attrId),
                            };
                        }
                    }
                }
            }
        }

        shapeCollection.subscribe(this);
    }

    _bbRect(pos) {
        if ('points' in pos) {
            const points = PolyShapeModel.convertStringToNumberArray(pos.points);
            let xtl = Number.MAX_SAFE_INTEGER;
            let ytl = Number.MAX_SAFE_INTEGER;
            let xbr = Number.MIN_SAFE_INTEGER;
            let ybr = Number.MIN_SAFE_INTEGER;
            for (const point of points) {
                xtl = Math.min(xtl, point.x);
                ytl = Math.min(ytl, point.y);
                xbr = Math.max(xbr, point.x);
                ybr = Math.max(ybr, point.y);
            }
            return [xtl, ytl, xbr, ybr];
        }
        return [pos.xtl, pos.ytl, pos.xbr, pos.ybr];
    }

    _updateCollection() {
        this._currentShapes = [];

        for (const shape of this._shapeCollection.currentShapes) {
            const labelAttributes = window.cvat.labelsInfo.labelAttributes(shape.model.label);
            if (Object.keys(labelAttributes).length
                && !shape.model.removed && !shape.interpolation.position.outside) {
                this._currentShapes.push({
                    model: shape.model,
                    interpolation: shape.model.interpolate(window.cvat.player.frames.current),
                });
            }
        }

        if (this._currentShapes.length) {
            this._activeIdx = 0;
            this._active = this._currentShapes[0].model;
        } else {
            this._activeIdx = null;
            this._active = null;
        }
    }

    _attrIdByIdx(labelId, attrIdx) {
        return Object.keys(window.cvat.labelsInfo.labelAttributes(labelId))[attrIdx];
    }

    _activate() {
        if (this._activeAAM && this._active) {
            const { label } = this._active;


            const [xtl, ytl, xbr, ybr] = this._bbRect(this._currentShapes[this._activeIdx]
                .interpolation.position);
            this._focus(xtl - this._margin, xbr + this._margin,
                ytl - this._margin, ybr + this._margin);
            this.notify();

            if (typeof (this._attrNumberByLabel[label]) !== 'undefined') {
                const attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
                this._active.activeAttribute = attrId;
            }
        } else {
            this.notify();
        }
    }

    _deactivate() {
        if (this._activeAAM && this._active) {
            this._active.activeAttribute = null;
        }
    }

    _enable() {
        if (window.cvat.mode === null) {
            window.cvat.mode = 'aam';
            this._shapeCollection.resetActive();
            this._activeAAM = true;
            this._updateCollection();
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
        } else {
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
            this._activeIdx += 1;
            if (this._activeIdx >= this._currentShapes.length) {
                this._activeIdx = 0;
            }
        } else {
            // prev
            this._activeIdx -= 1;
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

        const curAttr = this._attrNumberByLabel[this._active.label];
        if (typeof (curAttr) === 'undefined') {
            return;
        }

        if (curAttr.end < 2) {
            return;
        }

        if (Math.sign(direction) > 0) {
            // next
            curAttr.current += 1;
            if (curAttr.current >= curAttr.end) {
                curAttr.current = 0;
            }
        } else {
            // prev
            curAttr.current -= 1;
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
        const { label } = this._active;
        const frame = window.cvat.player.frames.current;
        if (typeof (this._attrNumberByLabel[label]) === 'undefined') {
            return;
        }

        const attrId = this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
        const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
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
            key += 1;
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
            const { label } = this._active;
            if (typeof (this._attrNumberByLabel[label]) !== 'undefined') {
                const attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
                return [this._helps[attrId].title, this._helps[attrId].help, `${this._activeIdx + 1}/${this._currentShapes.length}`];
            }
            return ['No Attributes Found', '', `${this._activeIdx + 1}/${this._currentShapes.length}`];
        }
        return ['No Shapes Found', '', '0/0'];
    }

    get activeAAM() {
        return this._activeAAM;
    }

    get active() {
        return this._active;
    }

    set margin(value) {
        this._margin = value;
    }
}


class AAMController {
    constructor(aamModel) {
        this._model = aamModel;

        function setupAAMShortkeys() {
            const switchAAMHandler = Logger.shortkeyLogDecorator(() => {
                this._model.switchAAMMode();
            });

            const nextAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveAttr(1);
                e.preventDefault();
            });

            const prevAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveAttr(-1);
                e.preventDefault();
            });

            const nextShapeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveShape(1);
                e.preventDefault();
            });

            const prevShapeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveShape(-1);
                e.preventDefault();
            });

            const selectAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                let key = e.keyCode;
                if (key >= 48 && key <= 57) {
                    key -= 48; // 0 and 9
                } else if (key >= 96 && key <= 105) {
                    key -= 96; // num 0 and 9
                } else {
                    return;
                }
                this._model.setupAttributeValue(key);
            });

            const { shortkeys } = window.cvat.config;
            Mousetrap.bind(shortkeys.switch_aam_mode.value, switchAAMHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_next_attribute.value, nextAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_prev_attribute.value, prevAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_next_shape.value, nextShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_prev_shape.value, prevShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys.select_i_attribute.value, selectAttributeHandler, 'keydown');
        }

        setupAAMShortkeys.call(this);
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
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._controller = aamController;

        this._zoomMargin.on('change', (e) => {
            const value = +e.target.value;
            this._controller.setMargin(value);
        }).trigger('change');
        aamModel.subscribe(this);
    }

    _setupAAMView(active, type, pos) {
        const oldRect = $('#outsideRect');
        const oldMask = $('#outsideMask');

        if (active) {
            if (oldRect.length) {
                oldRect.remove();
                oldMask.remove();
            }

            const size = window.cvat.translate.box.actualToCanvas({
                x: 0,
                y: 0,
                width: window.cvat.player.geometry.frameWidth,
                height: window.cvat.player.geometry.frameHeight,
            });

            const excludeField = this._frameContent.rect(size.width, size.height).move(size.x, size.y).fill('#666');
            let includeField = null;

            if (type === 'box') {
                pos = window.cvat.translate.box.actualToCanvas(pos);
                includeField = this._frameContent.rect(pos.xbr - pos.xtl,
                    pos.ybr - pos.ytl).move(pos.xtl, pos.ytl);
            } else {
                pos.points = window.cvat.translate.points.actualToCanvas(pos.points);
                includeField = this._frameContent.polygon(pos.points);
            }

            this._frameContent.mask().add(excludeField)
                .add(includeField).fill('black')
                .attr('id', 'outsideMask');
            this._frameContent.rect(size.width, size.height)
                .move(size.x, size.y).attr({
                    mask: 'url(#outsideMask)',
                    id: 'outsideRect',
                });

            const content = $(this._frameContent.node);
            const texts = content.find('.shapeText');
            for (const text of texts) {
                content.append(text);
            }
        } else {
            oldRect.remove();
            oldMask.remove();
        }
    }

    onAAMUpdate(aam) {
        this._setupAAMView(Boolean(aam.active),
            aam.active ? aam.active.type.split('_')[1] : '',
            aam.active ? aam.active.interpolate(window.cvat.player.frames.current).position : 0);

        if (aam.activeAAM) {
            if (this._aamMenu.hasClass('hidden')) {
                this._trackManagement.addClass('hidden');
                this._aamMenu.removeClass('hidden');
            }

            const [title, help, counter] = aam.generateHelps();
            this._aamHelpContainer.empty();
            this._aamCounter.text(counter);
            this._aamTitle.text(title);

            for (const helpRow of help) {
                $(`<label> ${helpRow} <label> <br>`).appendTo(this._aamHelpContainer);
            }
        } else if (this._trackManagement.hasClass('hidden')) {
            this._aamMenu.addClass('hidden');
            this._trackManagement.removeClass('hidden');
        }
    }
}
