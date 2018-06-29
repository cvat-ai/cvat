/* exported DrawerModel DrawerController DrawerView */
"use strict";

class DrawerModel extends Listener  {
    constructor(trackCollection) {
        super('onDrawerUpdate', getState);
        this._drawMode = false;
        this._drawShape = 'rect';
        this._collection = trackCollection;
        this._trackType = null;
        this._label = null;
        this._clicks = [];
        this._drawObjectEvent = null;
        this._pasteMode = false;
        this._mergeMode = false;
        this._AAM = false;

        let self = this;
        function getState() {
            return self;
        }
    }

    switchDraw() {
        if (this._drawMode) this.endDraw();
        else this.startDraw();
        this.notify();
    }

    endDraw() {
        this._drawMode = false;
        this._clicks = [];
        this._trackType = null;
        this._label = null;
        this._drawObjectEvent = null;
    }

    startDraw() {
        if (this._pasteMode || this._mergeMode || this._AAM) return;
        this._drawMode = true;
        this._drawObjectEvent = Logger.addContinuedEvent(Logger.EventType.drawObject);
    }

    addPoint(pos) {
        if (!this._drawMode) return;
        if (this._drawShape === 'rect') {

            for (let i = 0; i < this._clicks.length; i ++) {
                if (!this._clicks[i].fixed) {
                    this._clicks.splice(i,1);
                }
            }

            if (this._clicks.length) {
                let diffX = Math.abs(this._clicks[0].x - pos.x);
                let diffY = Math.abs(this._clicks[0].y - pos.y);
                if (diffX >= MIN_BOX_SIZE && diffY >= MIN_BOX_SIZE) {
                    this._clicks.push(pos);
                    if (pos.fixed) {
                        let rectPos = {
                            xtl: Math.min(this._clicks[0].x, this._clicks[1].x),
                            ytl: Math.min(this._clicks[0].y, this._clicks[1].y),
                            xbr: Math.min(this._clicks[0].x, this._clicks[1].x) + Math.abs(this._clicks[0].x - this._clicks[1].x),
                            ybr: Math.min(this._clicks[0].y, this._clicks[1].y) + Math.abs(this._clicks[0].y - this._clicks[1].y)
                        };

                        this._collection.createFromPos(rectPos, this._label, this._trackType);
                        Logger.addEvent(Logger.EventType.addObject, {count: 1});
                        this._drawObjectEvent.close();
                        this.endDraw();
                    }
                }
            }
            else {
                this._clicks.push(pos);
            }
            this.notify();
        }
        else throw new Error('Unknown shape type when draw');
    }

    get drawMode() {
        return this._drawMode;
    }

    get clicks() {
        return this._clicks;
    }

    get drawShape() {
        return this._drawShape;
    }

    set label(value) {
        this._label = value;
    }

    set trackType(value) {
        this._trackType = value;
    }

    onBufferUpdate(buffer) {
        this._pasteMode = buffer.pasteMode;
    }

    onMergerUpdate(merger) {
        this._mergeMode = merger.mergeMode;
    }

    onAAMUpdate(aam) {
        this._AAM = aam.activeAAM;
        if (this._AAM && this._drawMode) {
            this.endDraw();
            this.notify();
        }
    }
}



class DrawerController {
    constructor(drawerModel) {
        this._model = drawerModel;
        setupDrawerShortkeys.call(this);

        function setupDrawerShortkeys() {
            let drawHandler = Logger.shortkeyLogDecorator(function() {
                this.onDrawPressed();
            }.bind(this));

            let shortkeys = userConfig.shortkeys;

            Mousetrap.bind(shortkeys["switch_draw_mode"].value, drawHandler, 'keydown');
        }
    }

    onDrawPressed() {
        this._model.switchDraw();
    }

    onAddPoint(pos) {
        this._model.addPoint(pos);
    }
}



class DrawerView {
    constructor(drawerController) {
        this._controller = drawerController;
        this._drawButton = $('#createTrackButton');
        this._drawLabelSelect = $('#labelSelect');
        this._drawTrackTypeSelect = $('#trackTypeSelect');
        this._frameContent = $('#frameContent');
        this._drawMode = false;
        this._drawShapeType = null;
        this._aim = {
            aimX: null,
            aimY: null
        };
        this._drawShape = null;
        this._playerScale = 1;

        this._drawButton.on('click', () => this._controller.onDrawPressed.call(this._controller));
    }

    onDrawerUpdate(drawer) {
        if (drawer.drawMode) {
            if (!this._drawMode) {
                this._drawButton.text('Cancel Draw (N)');

                this._frameContent.on('mousemove.drawer', mousemoveHandler.bind(this));
                this._frameContent.on('mouseleave.drawer', mouseleaveHandler.bind(this));
                this._frameContent.on('mousedown.drawer', mousedownHandler.bind(this));

                this._drawMode = true;
                this._drawShapeType = drawer.drawShape;
                if (this._drawShapeType == 'rect') {
                    this._drawShape = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect')).attr({
                        'stroke': '#ffffff'
                    }).addClass('shape').css({
                        'stroke-width': 2 / this._playerScale,
                    }).appendTo(this._frameContent);
                }
                this._aim = {
                    aimX: $(document.createElementNS('http://www.w3.org/2000/svg', 'line')).attr({
                        'stroke': 'red',
                    }).css({
                        'stroke-width': 2 / this._playerScale
                    }).appendTo(this._frameContent)
                    ,
                    aimY: $(document.createElementNS('http://www.w3.org/2000/svg', 'line')).attr({
                        'stroke': 'red',
                    }).css({
                        'stroke-width': 2 / this._playerScale
                    }).appendTo(this._frameContent)
                };

                drawer.label = +this._drawLabelSelect.prop('value');
                drawer.trackType = this._drawTrackTypeSelect.prop('value');
            }
            else {
                let clicks = drawer.clicks;
                if (this._drawShapeType == 'rect' && clicks.length == 2) {
                    this._drawShape.attr({
                        x: Math.min(clicks[0].x, clicks[1].x),
                        y: Math.min(clicks[0].y, clicks[1].y),
                        width: Math.abs(clicks[0].x - clicks[1].x),
                        height: Math.abs(clicks[0].y - clicks[1].y)
                    });
                }
            }
        }
        else {
            if (this._drawMode) {
                this._drawButton.text('Create Track');

                this._frameContent.off('mousemove.drawer');
                this._frameContent.off('mouseleave.drawer');
                this._frameContent.off('mousedown.drawer');

                this._drawMode = false;
                this._drawShapeType = null;
                this._drawShape.remove();
                this._drawShape = null;
                this._aim.aimX.remove();
                this._aim.aimX = null;
                this._aim.aimY.remove();
                this._aim.aimY = null;
            }
        }

        this._drawLabelSelect.prop('disabled', this._drawMode);
        this._drawTrackTypeSelect.prop('disabled', this._drawMode);

        function mousemoveHandler(e) {
            let pos = translateSVGPos(this._frameContent['0'], e.clientX, e.clientY, this._playerScale);
            pos.fixed = false;
            this._controller.onAddPoint(pos);

            this._aim.aimX.attr({
                x1: 0,
                y1: pos.y,
                x2: this._frameContent.css('width'),
                y2: pos.y
            }).css('display', '');

            this._aim.aimY.attr({
                x1: pos.x,
                y1: 0,
                x2: pos.x,
                y2: this._frameContent.css('height')
            }).css('display', '');
        }

        function mouseleaveHandler() {
            if (this._drawMode) {
                this._aim.aimX.css('display', 'none');
                this._aim.aimY.css('display', 'none');
            }
        }

        function mousedownHandler(e) {
            if (e.shiftKey) return;
            let pos = translateSVGPos(this._frameContent['0'], e.clientX, e.clientY, this._playerScale);
            pos.fixed = true;
            this._controller.onAddPoint(pos);
        }
    }

    onPlayerUpdate(player) {
        this._playerScale = player.geometry.scale;
        if (this._drawMode) {
            this._aim.aimX.css({
                'stroke-width': 2 / this._playerScale
            });
            this._aim.aimY.css({
                'stroke-width': 2 / this._playerScale
            });
            this._drawShape.css({
                'stroke-width': 2 / this._playerScale
            });
        }
    }
}
