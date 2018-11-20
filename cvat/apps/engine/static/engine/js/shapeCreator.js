/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeCreatorModel ShapeCreatorController ShapeCreatorView */
"use strict";

class ShapeCreatorModel extends Listener {
    constructor(shapeCollection) {
        super('onShapeCreatorUpdate', () => this);
        this._createMode = false;
        this._saveCurrent = false;
        this._defaultType = null;
        this._defaultMode = null;
        this._defaultLabel = null;
        this._currentFrame = null;
        this._createEvent = null;
        this._shapeCollection = shapeCollection;
    }

    finish(result) {
        let data = {};
        let frame = window.cvat.player.frames.current;

        data.label_id = this._defaultLabel;
        data.group_id = 0;
        data.frame = frame;
        data.occluded = false;
        data.outside = false;
        data.z_order = this._shapeCollection.zOrder(frame).max;
        data.attributes = [];

        if (this._createEvent) {
            this._createEvent.addValues({
                mode: this._defaultMode,
                type: this._defaultType,
                label: this._defaultLabel,
                frame: frame,
            });
        }

        if (this._defaultMode === 'interpolation' && this._defaultType === 'box') {
            data.shapes = [];
            data.shapes.push(Object.assign({}, result, data));
            this._shapeCollection.add(data, `interpolation_box`);
        }
        else {
            Object.assign(data, result);
            this._shapeCollection.add(data, `annotation_${this._defaultType}`);
        }

        let model = this._shapeCollection.shapes.slice(-1)[0];

        // Undo/redo code
        window.cvat.addAction('Draw Object', () => {
            model.removed = true;
            model.unsubscribe(this._shapeCollection);
        }, () => {
            model.subscribe(this._shapeCollection);
            model.removed = false;
        }, window.cvat.player.frames.current);
        // End of undo/redo code

        this._shapeCollection.update();
    }

    switchCreateMode(forceClose) {
        // if parameter force (bool) setup to true, current result will not save
        if (!forceClose) {
            this._createMode = !this._createMode && window.cvat.mode == null;
            if (this._createMode) {
                this._createEvent = Logger.addContinuedEvent(Logger.EventType.drawObject);
                window.cvat.mode = 'creation';
            }
            else if (window.cvat.mode === 'creation') {
                window.cvat.mode = null;
            }
        }
        else {
            this._createMode = false;
            if (window.cvat.mode === 'creation') {
                window.cvat.mode = null;
                if (this._createEvent) {
                    this._createEvent.close();
                    this._createEvent = null;
                }
            }
        }
        this._saveCurrent = !forceClose;
        this.notify();
    }

    get saveCurrent() {
        return this._saveCurrent;
    }

    get createMode() {
        return this._createMode;
    }

    get defaultType() {
        return this._defaultType;
    }

    set defaultType(type) {
        if (!['box', 'points', 'polygon', 'polyline'].includes(type)) {
            throw Error(`Unknown shape type found ${type}`);
        }
        this._defaultType = type;
    }

    get defaultMode() {
        return this._defaultMode;
    }

    set defaultMode(mode) {
        this._defaultMode = mode;
    }

    set defaultLabel(labelId) {
        this._defaultLabel = +labelId;
    }
}


class ShapeCreatorController {
    constructor(drawerModel) {
        this._model = drawerModel;
        setupShortkeys.call(this);
        function setupShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchDrawHandler = Logger.shortkeyLogDecorator(function() {
                this.switchCreateMode(false);
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_draw_mode"].value, switchDrawHandler.bind(this), 'keydown');
        }
    }

    switchCreateMode(force) {
        this._model.switchCreateMode(force);
    }

    setDefaultShapeType(type) {
        this._model.defaultType = type;
    }

    setDefaultShapeMode(mode) {
        this._model.defaultMode = mode;
    }

    setDefaultShapeLabel(labelId) {
        this._model.defaultLabel = labelId;
    }

    finish(result) {
        this._model.finish(result);
    }
}

class ShapeCreatorView {
    constructor(drawerModel, drawerController) {
        drawerModel.subscribe(this);
        this._controller = drawerController;
        this._createButton = $('#createShapeButton');
        this._labelSelector = $('#shapeLabelSelector');
        this._modeSelector = $('#shapeModeSelector');
        this._typeSelector = $('#shapeTypeSelector');
        this._polyShapeSizeInput = $('#polyShapeSize');
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._playerFrame = $('#playerFrame');
        this._createButton.on('click', () => this._controller.switchCreateMode(false));
        this._drawInstance = null;
        this._aim = null;
        this._aimCoord = {
            x: PLAYER_FRAME_OFFSET,
            y: PLAYER_FRAME_OFFSET
        };
        this._polyShapeSize = 0;
        this._type = null;
        this._mode = null;
        this._cancel = false;
        this._scale = 1;

        let shortkeys = window.cvat.config.shortkeys;
        this._createButton.attr('title', `
            ${shortkeys['switch_draw_mode'].view_value} - ${shortkeys['switch_draw_mode'].description}`);

        this._labelSelector.attr('title', `
            ${shortkeys['change_default_label'].view_value} - ${shortkeys['change_default_label'].description}`);

        let labels = window.cvat.labelsInfo.labels();
        for (let labelId in labels) {
            let option = $(`<option value=${labelId}> ${labels[labelId].normalize()} </option>`);
            option.appendTo(this._labelSelector);
        }

        this._typeSelector.on('change', (e) => {
            let type = $(e.target).prop('value');
            if (type != 'box' && this._modeSelector.prop('value') != 'annotation') {
                this._modeSelector.prop('value', 'annotation');
                this._controller.setDefaultShapeMode('annotation');
                showMessage('Poly shapes available only like annotation shapes');
            }
            this._controller.setDefaultShapeType(type);
        }).trigger('change');

        this._labelSelector.on('change', (e) => {
            this._controller.setDefaultShapeLabel($(e.target).prop('value'));
        }).trigger('change');

        this._modeSelector.on('change', (e) => {
            let mode = $(e.target).prop('value');
            if (mode != 'annotation' && this._typeSelector.prop('value') != 'box') {
                this._typeSelector.prop('value', 'box');
                this._controller.setDefaultShapeType('box');
                showMessage('Only boxes available like interpolation shapes');
            }
            this._controller.setDefaultShapeMode(mode);
        }).trigger('change');

        this._polyShapeSizeInput.on('change', (e) => {
            e.stopPropagation();
            let size = + e.target.value;
            if (size < 0) size = 0;
            if (size > 100) size = 0;
            e.target.value = size || '';
            this._polyShapeSize = size;
        }).trigger('change');

        this._polyShapeSizeInput.on('keydown', function(e) {
            e.stopPropagation();
        });

        this._playerFrame.on('mousemove', function(e) {
            // Save last coordinates in order to draw aim
            this._aimCoord = translateSVGPos(this._frameContent.node, e.clientX, e.clientY);
            this._aimCoord.x += PLAYER_FRAME_OFFSET;
            this._aimCoord.y += PLAYER_FRAME_OFFSET;

            if (this._aim) {
                this._aim.x.attr({
                    y1: this._aimCoord.y,
                    y2: this._aimCoord.y,
                });

                this._aim.y.attr({
                    x1: this._aimCoord.x,
                    x2: this._aimCoord.x,
                });
            }
        }.bind(this));
    }


    _createPolyEvents() {
        // If number of points for poly shape specified, use it.
        // Dicrement number on draw new point events. Drawstart trigger when create first point
        let lastPoint = {
            x: null,
            y: null,
        };

        if (this._polyShapeSize) {
            let size = this._polyShapeSize;
            let sizeDecrement = function() {
                if (!--size) {
                    this._drawInstance.draw('done');
                }
            }.bind(this);

            let sizeIncrement = function() {
                size ++;
            };

            this._drawInstance.on('drawstart', sizeDecrement);
            this._drawInstance.on('drawpoint', sizeDecrement);
            this._drawInstance.on('undopoint', sizeIncrement);
        }
        // Otherwise draw will stop by Ctrl + N press

        // Callbacks for point scale
        this._drawInstance.on('drawstart', this._rescaleDrawPoints.bind(this));
        this._drawInstance.on('drawpoint', this._rescaleDrawPoints.bind(this));

        this._drawInstance.on('drawstart', (e) => {
            lastPoint = {
                x: e.detail.event.clientX,
                y: e.detail.event.clientY,
            };
        });

        this._drawInstance.on('drawpoint', (e) => {
            lastPoint = {
                x: e.detail.event.clientX,
                y: e.detail.event.clientY,
            };
        });

        this._frameContent.on('mousedown.shapeCreator', (e) => {
            if (e.which === 3) {
                this._drawInstance.draw('undo');
            }
        });


        this._frameContent.on('mousemove.shapeCreator', (e) => {
            if (e.shiftKey && this._type != 'points') {
                if (lastPoint.x === null || lastPoint.y === null) {
                    this._drawInstance.draw('point', e);
                }
                else {
                    let delta = Math.sqrt(Math.pow(e.clientX - lastPoint.x, 2) + Math.pow(e.clientY - lastPoint.y, 2));
                    let deltaTreshold = 15;
                    if (delta > deltaTreshold) {
                        this._drawInstance.draw('point', e);
                        lastPoint = {
                            x: e.clientX,
                            y: e.clientY
                        };
                    }
                }
            }
        });

        this._drawInstance.on('drawstop', () => {
            this._frameContent.off('mousedown.shapeCreator');
            this._frameContent.off('mousemove.shapeCreator');
        });
        // Also we need callback on drawdone event for get points
        this._drawInstance.on('drawdone', function(e) {
            let points = PolyShapeModel.convertStringToNumberArray(e.target.getAttribute('points'));
            for (let point of points) {
                point.x = Math.clamp(point.x, PLAYER_FRAME_OFFSET,
                    PLAYER_FRAME_OFFSET + window.cvat.player.geometry.frameWidth);
                point.y = Math.clamp(point.y, PLAYER_FRAME_OFFSET,
                    PLAYER_FRAME_OFFSET + window.cvat.player.geometry.frameHeight);
            }

            // Min 2 points for polyline and 3 points for polygon
            if (points.length) {
                if (this._type === 'polyline' && points.length < 2) {
                    showMessage("Min 2 points must be for polyline drawing.");
                }
                else if (this._type === 'polygon' && points.length < 3) {
                    showMessage("Min 3 points must be for polygon drawing.");
                }
                else {
                    // Update points in a view in order to get an updated box
                    e.target.setAttribute('points', PolyShapeModel.convertNumberArrayToString(points));
                    let polybox = e.target.getBBox();
                    let w = polybox.width;
                    let h = polybox.height;
                    let area = w * h;
                    let type = this.type;

                    if (area >= AREA_TRESHOLD || type === 'points' || type === 'polyline' && (w >= AREA_TRESHOLD || h >= AREA_TRESHOLD)) {
                        for (let point of points) {
                            point.x -= PLAYER_FRAME_OFFSET;
                            point.y -= PLAYER_FRAME_OFFSET;
                        }
                        points = PolyShapeModel.convertNumberArrayToString(points);
                        this._controller.finish({points: points}, type);
                    }
                }
            }

            this._controller.switchCreateMode(true);
        }.bind(this));
    }


    _create() {
        let sizeUI = null;
        switch(this._type) {
        case 'box':
            this._drawInstance = this._frameContent.rect().draw({snapToGrid: 0.1}).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / this._scale,
            }).on('drawstop', function(e) {
                if (this._cancel) return;
                if (sizeUI) {
                    sizeUI.rm();
                    sizeUI = null;
                }

                let x = +e.target.getAttribute('x');
                let y = +e.target.getAttribute('y');
                let w = +e.target.getAttribute('width');
                let h = +e.target.getAttribute('height');
                let frameWidth = window.cvat.player.geometry.frameWidth;
                let frameHeight = window.cvat.player.geometry.frameHeight;

                let result = {
                    xtl: Math.max(PLAYER_FRAME_OFFSET,  x) - PLAYER_FRAME_OFFSET,
                    ytl: Math.max(PLAYER_FRAME_OFFSET, y) - PLAYER_FRAME_OFFSET,
                    xbr: Math.min(frameWidth + PLAYER_FRAME_OFFSET, x + w) - PLAYER_FRAME_OFFSET,
                    ybr: Math.min(frameHeight  + PLAYER_FRAME_OFFSET, y + h) - PLAYER_FRAME_OFFSET,
                };

                if (this._mode === 'interpolation') {
                    result.outside = false;
                }

                if ((result.ybr - result.ytl) * (result.xbr - result.xtl) >= AREA_TRESHOLD) {
                    this._controller.finish(result, this._type);
                }

                this._controller.switchCreateMode(true);
            }.bind(this)).on('drawupdate', (e) => {
                sizeUI = drawBoxSize.call(sizeUI, this._frameContent, e.target);
            }).on('drawcancel', () => {
                if (sizeUI) {
                    sizeUI.rm();
                    sizeUI = null;
                }
            });
            break;
        case 'points':
            this._drawInstance = this._frameContent.polyline().draw({snapToGrid: 0.1}).addClass('shapeCreation').attr({
                'stroke-width': 0,
            });
            this._createPolyEvents();
            break;
        case 'polygon':
            if (this._polyShapeSize && this._polyShapeSize < 3) {
                if (!$('.drawAllert').length) {
                    showMessage("Min 3 points must be for polygon drawing.").addClass('drawAllert');
                }
                this._controller.switchCreateMode(true);
                return;
            }
            this._drawInstance = this._frameContent.polygon().draw({snapToGrid: 0.1}).addClass('shapeCreation').attr({
                'stroke-width':  STROKE_WIDTH / this._scale,
            });
            this._createPolyEvents();
            break;
        case 'polyline':
            if (this._polyShapeSize && this._polyShapeSize < 2) {
                if (!$('.drawAllert').length) {
                    showMessage("Min 2 points must be for polyline drawing.").addClass('drawAllert');
                }
                this._controller.switchCreateMode(true);
                return;
            }
            this._drawInstance = this._frameContent.polyline().draw({snapToGrid: 0.1}).addClass('shapeCreation').attr({
                'stroke-width':  STROKE_WIDTH / this._scale,
            });
            this._createPolyEvents();
            break;
        default:
            throw Error(`Bad type found ${this._type}`);
        }

        this._drawInstance.attr({
            'z_order': Number.MAX_SAFE_INTEGER,
        });
    }

    _rescaleDrawPoints() {
        let scale = this._scale;
        $('.svg_draw_point').each(function() {
            this.instance.radius(2.5 / scale).attr('stroke-width', 1 / scale);
        });
    }

    _drawAim() {
        if (!(this._aim)) {
            let frameWidth = window.cvat.player.geometry.frameWidth;
            let frameHeight = window.cvat.player.geometry.frameHeight;
            this._aim = {
                x: this._frameContent.line(0, this._aimCoord.y, frameWidth + PLAYER_FRAME_OFFSET * 2, this._aimCoord.y)
                    .attr({
                        'stroke-width': STROKE_WIDTH / this._scale,
                        'stroke': 'red',
                        'z_order': Number.MAX_SAFE_INTEGER,
                    }).addClass('aim'),
                y: this._frameContent.line(this._aimCoord.x, 0, this._aimCoord.x, frameHeight + PLAYER_FRAME_OFFSET * 2)
                    .attr({
                        'stroke-width': STROKE_WIDTH / this._scale,
                        'stroke': 'red',
                        'z_order': Number.MAX_SAFE_INTEGER,
                    }).addClass('aim'),
            };
        }
    }

    _removeAim() {
        if (this._aim) {
            this._aim.x.remove();
            this._aim.y.remove();
            this._aim = null;
        }
    }

    onShapeCreatorUpdate(model) {
        if (model.createMode && !this._drawInstance) {
            this._cancel = false;
            this._type = model.defaultType;
            this._mode = model.defaultMode;

            if (!['polygon', 'polyline', 'points'].includes(this._type)) {
                this._drawAim();
            }

            this._createButton.text("Stop Creation");
            document.oncontextmenu = () => false;
            this._create();
        }
        else {
            this._removeAim();
            this._cancel = true;
            this._createButton.text("Create Shape");
            document.oncontextmenu = null;
            if (this._drawInstance) {
                // We save current result for poly shape if it's need
                // drawInstance will be removed after save when drawdone handler calls switchCreateMode with force argument
                if (model.saveCurrent && this._type != 'box') {
                    this._drawInstance.draw('done');
                }
                else {
                    this._drawInstance.draw('cancel');
                    this._drawInstance.remove();
                    this._drawInstance = null;
                }
            }
        }

        this._typeSelector.prop('disabled', model.createMode);
        this._modeSelector.prop('disabled', model.createMode);
        this._polyShapeSizeInput.prop('disabled', model.createMode);
    }

    onPlayerUpdate(player) {
        if (!player.ready()) return;
        if (this._scale != player.geometry.scale) {
            this._scale = player.geometry.scale;
            if (this._drawInstance) {
                this._rescaleDrawPoints();
                if (this._aim) {
                    this._aim.x.attr('stroke-width', STROKE_WIDTH / this._scale);
                    this._aim.y.attr('stroke-width', STROKE_WIDTH / this._scale);
                }
                if (['box', 'polygon', 'polyline'].includes(this._type)) {
                    this._drawInstance.attr('stroke-width', STROKE_WIDTH / this._scale);
                }
            }
        }
    }
}
