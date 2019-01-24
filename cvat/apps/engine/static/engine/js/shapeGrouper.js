/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeGrouperModel ShapeGrouperController ShapeGrouperView*/

/* global
    Listener:false
    Logger:false
    Mousetrap:false
    STROKE_WIDTH:false
*/

"use strict";

class ShapeGrouperModel extends Listener {
    constructor(shapeCollection) {
        super('onGrouperUpdate', () => this);

        this._shapeCollection = shapeCollection;
        this._active = false;
        this._selectedObjects = [];
    }

    _unselectObjects() {
        for (let obj of this._selectedObjects) {
            obj.groupping = false;
        }
        this._selectedObjects = [];
    }

    apply() {
        if (this._selectedObjects.length) {
            this._shapeCollection.joinToGroup(this._selectedObjects);
        }
    }

    reset() {
        if (this._selectedObjects.length) {
            this._shapeCollection.resetGroupFor(this._selectedObjects);
        }
    }

    cancel() {
        if (this._active) {
            this._unselectObjects();

            this._active = false;
            if (window.cvat.mode === 'groupping') {
                window.cvat.mode = null;
            }
            this.notify();
        }
    }

    switch() {
        if (this._active) {
            this.apply();
            this.cancel();
        }
        else if (window.cvat.mode === null) {
            window.cvat.mode = 'groupping';
            this._active = true;
            this._shapeCollection.resetActive();
            this.notify();
        }
    }

    add(model) {
        let idx = this._selectedObjects.indexOf(model);
        if (idx === -1) {
            this._selectedObjects.push(model);
            model.groupping = true;
        }
    }

    click() {
        if (this._active) {
            let active = this._shapeCollection.selectShape(this._shapeCollection.lastPosition, true);
            if (active) {
                let idx = this._selectedObjects.indexOf(active);
                if (idx != -1) {
                    this._selectedObjects.splice(idx, 1);
                    active.groupping = false;
                }
                else {
                    this._selectedObjects.push(active);
                    active.groupping = true;
                }
            }
        }
    }

    onCollectionUpdate() {
        if (this._active) {
            this._unselectObjects();
        }
    }

    get active() {
        return this._active;
    }
}


class ShapeGrouperController {
    constructor(grouperModel) {
        this._model = grouperModel;

        setupGrouperShortkeys.call(this);
        function setupGrouperShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchGrouperHandler = Logger.shortkeyLogDecorator(function() {
                this.switch();
            }.bind(this));

            let resetGroupHandler = Logger.shortkeyLogDecorator(function() {
                if (this._model.active) {
                    this._model.reset();
                    this._model.cancel();
                    this._model.notify();
                }
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_group_mode"].value, switchGrouperHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["reset_group"].value, resetGroupHandler.bind(this), 'keydown');
        }
    }

    switch() {
        this._model.switch();
    }

    add(model) {
        this._model.add(model);
    }

    click() {
        this._model.click();
    }
}


class ShapeGrouperView {
    constructor(grouperModel, grouperController) {
        this._controller = grouperController;
        this._frameContent = $('#frameContent');
        this._groupShapesButton = $('#groupShapesButton');
        this._rectSelector = null;
        this._initPoint = null;
        this._scale = 1;

        this._groupShapesButton.on('click', () => {
            this._controller.switch();
        });

        let shortkeys = window.cvat.config.shortkeys;

        this._groupShapesButton.attr('title', `
            ${shortkeys['switch_group_mode'].view_value} - ${shortkeys['switch_group_mode'].description}` + `\n` +
            `${shortkeys['reset_group'].view_value} - ${shortkeys['reset_group'].description}`);

        grouperModel.subscribe(this);
    }

    _select() {
        if (this._rectSelector) {
            let rect1 = this._rectSelector[0].getBBox();
            for (let shape of this._frameContent.find('.shape')) {
                let rect2 = shape.getBBox();

                if (rect1.x < rect2.x && rect1.y < rect2.y &&
                    rect1.x + rect1.width > rect2.x + rect2.width &&
                    rect1.y + rect1.height > rect2.y + rect2.height) {
                    this._controller.add(shape.cvatView.controller().model());
                }
            }
        }
    }

    _reset() {
        if (this._rectSelector) {
            this._rectSelector.remove();
            this._rectSelector = null;
        }

        if (this._initPoint) {
            this._initPoint = null;
        }
    }

    _enableEvents() {
        this._frameContent.on('mousedown.grouper', (e) => {
            this._initPoint = window.cvat.translate.point.clientToCanvas(this._frameContent[0], e.clientX, e.clientY);
        });

        this._frameContent.on('mousemove.grouper', (e) => {
            let currentPoint = window.cvat.translate.point.clientToCanvas(this._frameContent[0], e.clientX, e.clientY);

            if (this._initPoint) {
                if (!this._rectSelector) {
                    this._rectSelector = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
                    this._rectSelector.appendTo(this._frameContent);
                    this._rectSelector.attr({
                        'stroke-width': (STROKE_WIDTH / 3) / this._scale,
                        'stroke': 'darkmagenta',
                        'fill': 'darkmagenta',
                        'fill-opacity': 0.5,
                        'stroke-dasharray': 5,
                    });
                }

                this._rectSelector.attr({
                    'x': Math.min(this._initPoint.x, currentPoint.x),
                    'y': Math.min(this._initPoint.y, currentPoint.y),
                    'width': Math.max(this._initPoint.x, currentPoint.x) - Math.min(this._initPoint.x, currentPoint.x),
                    'height': Math.max(this._initPoint.y, currentPoint.y) - Math.min(this._initPoint.y, currentPoint.y),
                });
            }
        });

        this._frameContent.on('mouseup.grouper', () => {
            this._select();
            this._reset();
        });

        this._frameContent.on('mouseleave.grouper', () => {
            this._select();
            this._reset();
        });

        this._frameContent.on('click.grouper', () => {
            this._controller.click();
        });
    }

    _disableEvents() {
        this._frameContent.off('mousedown.grouper');
        this._frameContent.off('mousemove.grouper');
        this._frameContent.off('mouseup.grouper');
        this._frameContent.off('mouseleave.grouper');
        this._frameContent.off('click.grouper');
    }

    onGrouperUpdate(grouper) {
        if (grouper.active) {
            this._enableEvents();
            this._groupShapesButton.text('Apply Group');
        }
        else {
            this._reset();
            this._disableEvents();
            this._groupShapesButton.text('Group Shapes');
            if (this._rectSelector) {
                this._rectSelector.remove();
                this._rectSelector = null;
            }
        }
    }

    onPlayerUpdate(player) {
        if (this._scale != player.geometry.scale) {
            this._scale = player.geometry.scale;
            if (this._rectSelector) {
                this._rectSelector.attr({
                    'stroke-width': STROKE_WIDTH / this._scale,
                });
            }
        }
    }
}
