/* exported ShapeBufferModel ShapeBufferController ShapeBufferView */
"use strict";


class ShapeBufferModel extends Listener  {
    constructor(collection) {
        super('onBufferUpdate', getState);
        this._collection = collection;
        this._pasteMode = false;
        this._playerScale = 1;
        this._playerFrame = null;
        this._drawMode = false;
        this._mergeMode = false;
        this._AAM = false;
        this._shape = {
            shapeType: null,
            type: null,
            position: null,
            attributes: null,
            label: null,
            clear: function() {
                this.shapeType = null;
                this.type = null;
                this.position = null;
                this.attributes = null;
                this.label = null;
            },
        };

        let self = this;
        function getState() {
            return self;
        }
    }

    copyShape() {
        let activeTrack = this._collection.activeTrack;
        if (activeTrack === null) return;
        let interpolation = activeTrack.interpolate(this._playerFrame);
        this._shape.shapeType = activeTrack.shapeType;
        this._shape.type = activeTrack.trackType;
        this._shape.label = activeTrack.label;
        this._shape.position = interpolation.position;
        this._shape.attributes = interpolation.attributes;
    }

    pasteShape() {
        if (this._shape.shapeType === null || this._drawMode || this._mergeMode || this._AAM) return;
        this._pasteMode = true;
        this.notify();
    }

    cancelPaste() {
        this._pasteMode = false;
        this.notify();
    }

    completePaste(data) {
        this._collection.add(data);
        this._collection.updateFrame();
    }

    get pasteMode() {
        return this._pasteMode;
    }

    get shape() {
        return this._shape;
    }

    onPlayerUpdate(player) {
        this._playerFrame = player.frames.current;
    }

    onMergerUpdate(merger) {
        this._mergeMode = merger.mergeMode;
    }

    onDrawerUpdate(drawer) {
        this._drawMode = drawer.drawMode;
    }

    onAAMUpdate(aam) {
        this._AAM = aam.activeAAM;
        if (this._AAM && this._pasteMode) {
            this.cancelPaste();
        }
    }
}



class ShapeBufferController {
    constructor(model) {
        this._model = model;
        setupBufferShortkeys.call(this);

        function setupBufferShortkeys() {
            let copyHandler = Logger.shortkeyLogDecorator(function() {
                this._model.cancelPaste();
                this._model.copyShape();
            }.bind(this));

            let pasteHandler = Logger.shortkeyLogDecorator(function() {
                this._model.pasteShape();
            }.bind(this));

            let cancelHandler = Logger.shortkeyLogDecorator(function() {
                this._model.cancelPaste();
            }.bind(this));

            let shortkeys = userConfig.shortkeys;

            Mousetrap.bind(shortkeys["copy_shape"].value, copyHandler, 'keydown');
            Mousetrap.bind(shortkeys["paste_shape"].value, pasteHandler, 'keydown');
            Mousetrap.bind(shortkeys["cancel_pasting"].value, cancelHandler, 'keydown');
        }
    }

    cancelPaste() {
        this._model.cancelPaste();
    }

    completePaste(data) {
        this._model.completePaste(data);
    }
}



class ShapeBufferView {
    constructor(controller) {
        this._controller = controller;
        this._shape = null;
        this._viewShape = null;
        this._playerScale = 1;
        this._curFrame = null;
        this._frameContent = $('#frameContent');
        this._pasteMode = false;
    }

    onBufferUpdate(buffer) {
        if (buffer.pasteMode && !this._pasteMode) {
            this._pasteMode = true;
            this._shape = buffer.shape;
            this.enableMouseEvents();
        }
        else if (!buffer.pasteMode) {
            this.disableMouseEvents();
            if (this._viewShape) {
                this._viewShape.remove();
            }
            this._viewShape = null;
            this._shape = null;
            this._pasteMode = false;
        }
    }

    enableMouseEvents() {
        this._frameContent.on('mousemove.buffer', function(e) {
            let position = translateSVGPos(this._frameContent['0'], e.clientX, e.clientY, this._playerScale);
            this.redrawTempShape(position);
        }.bind(this));

        this._frameContent.on('mousedown.buffer', function(e) {
            let pos = translateSVGPos(this._frameContent['0'], e.clientX, e.clientY, this._playerScale);

            let [xtl, ytl, xbr, ybr] = this.computeBoxPosition(pos);
            let boxes = [];

            boxes.push([xtl, ytl, xbr, ybr, this._curFrame, 0, this._shape.position.occluded ? 1 : 0]);

            if (this._shape.type != 'interpolation') {
                boxes.push([xtl, ytl, xbr, ybr, this._curFrame + 1, 1, this._shape.position.occluded ? 1 : 0]);
            }

            let attributes = [];
            for (let attrKey in this._shape.attributes) {
                let value = this._shape.attributes[attrKey].value;
                attributes.push([+attrKey, this._curFrame, value]);
            }

            this._controller.completePaste({
                attributes: attributes,
                boxes: boxes,
                label: this._shape.label
            });

            if (!e.ctrlKey) {
                this._controller.cancelPaste();
            }

        }.bind(this));

        this._frameContent.on('mouseleave.buffer', function() {
            if (this._viewShape) {
                this._viewShape.css('visibility', 'hidden');
            }
        }.bind(this));
    }

    disableMouseEvents() {
        this._frameContent.off('mousemove.buffer');
        this._frameContent.off('mousedown.buffer');
        this._frameContent.off('mouseleave.buffer');
    }

    createViewShape() {
        if (this._shape.shapeType === 'box') {
            this._viewShape = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect')).attr({
                'stroke': '#ffffff'
            }).addClass('shape').css({
                'stroke-width': 2 / this._playerScale,
            }).appendTo(this._frameContent);
        }
        else throw Error('Unknown shape type when create temp shape');

        if (this._shape.position.occluded) {
            this._viewShape.addClass('occludedShape');
        }
    }

    redrawTempShape(position) {
        if (this._viewShape === null) {
            this.createViewShape();
        }

        if (this._shape.shapeType === 'box') {
            this.redrawTempBox(position);
        }
        else throw Error('Unknown shape type when paste');
    }

    redrawTempBox(position) {
        let [xtl, ytl, xbr, ybr] = this.computeBoxPosition(position);
        this._viewShape.attr({
            x: xtl,
            y: ytl,
            width: xbr - xtl,
            height: ybr - ytl
        }).css({
            visibility: 'visible'
        });
    }

    computeBoxPosition(position) {
        let width = this._shape.position.xbr - this._shape.position.xtl;
        let height = this._shape.position.ybr - this._shape.position.ytl;

        let frameWidth = +this._frameContent.css('width').slice(0,-2);
        let frameHeight = +this._frameContent.css('height').slice(0,-2);

        let xtl = Math.max(position.x - width / 2, 0);
        let ytl = Math.max(position.y - height / 2, 0);
        let xbr = Math.min(position.x + width / 2, frameWidth);
        let ybr = Math.min(position.y + height / 2, frameHeight);

        return [xtl, ytl, xbr, ybr];
    }

    onPlayerUpdate(player) {
        this._playerScale = player.geometry.scale;
        this._curFrame = player.frames.current;
        if (this._viewShape != null) {
            this._viewShape.css('stroke-width', 2 / this._playerScale);
        }
    }
}
