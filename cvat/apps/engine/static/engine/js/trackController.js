/* exported TrackController */
"use strict";

class TrackController {
    constructor(trackModel) {
        this._trackModel = trackModel;
    }

    onclick() {
        this._trackModel.onSelect();
    }

    onchangegeometry(shape) {
        let pos = {
            xtl:    +shape.attr('x'),
            ytl:    +shape.attr('y'),
            xbr:    +shape.attr('width') + +shape.attr('x'),
            ybr:    +shape.attr('height') + +shape.attr('y'),
            outsided: 0,
            occluded: shape.hasClass('occludedShape') ? 1 : 0
        };
        this._trackModel.recordPosition(pos);
    }
}
