// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

// Update constructor
const originalDraw = SVG.Element.prototype.draw;
SVG.Element.prototype.draw = function constructor(...args: any): any {
    let handler = this.remember('_paintHandler');
    if (!handler) {
        originalDraw.call(this, ...args);
        handler = this.remember('_paintHandler');
        if (!handler.set) {
            handler.set = new SVG.Set();
        }
    } else {
        originalDraw.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalDraw)) {
    SVG.Element.prototype.draw[key] = originalDraw[key];
}

// Create undo for polygones and polylines
function undo(): void {
    if (this.set && this.set.length()) {
        this.set.members.splice(-1, 1)[0].remove();
        this.el.array().value.splice(-2, 1);
        this.el.plot(this.el.array());
        this.el.fire('undopoint');
    }
}

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        undo: undo,
    },
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        undo: undo,
    },
));


// Create transform for rect, polyline and polygon
function transform(): void {
    this.m = this.el.node.getScreenCTM().inverse();
    this.offset = { x: window.pageXOffset, y: window.pageYOffset };
}

SVG.Element.prototype.draw.extend('rect', Object.assign({},
    SVG.Element.prototype.draw.plugins.rect,
    {
        transform: transform,
    },
));

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        transform: transform,
    },
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        transform: transform,
    },
));

// Fix method drawCircles
function drawCircles(): void {
    const array = this.el.array().valueOf();

    this.set.each(function (): void {
        this.remove();
    });

    this.set.clear();

    for (let i = 0; i < array.length - 1; ++i) {
        [this.p.x] = array[i];
        [, this.p.y] = array[i];

        const p = this.p.matrixTransform(
            this.parent.node.getScreenCTM()
                .inverse()
                .multiply(this.el.node.getScreenCTM()),
        );

        this.set.add(
            this.parent
                .circle(5)
                .stroke({
                    width: 1,
                }).fill('#ccc')
                .center(p.x, p.y),
        );
    }
}

SVG.Element.prototype.draw.extend('line', Object.assign({},
    SVG.Element.prototype.draw.plugins.line,
    {
        drawCircles: drawCircles,
    }
));

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        drawCircles: drawCircles,
    }
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        drawCircles: drawCircles,
    }
));

// Fix method drag
const originalDraggable = SVG.Element.prototype.draggable;
SVG.Element.prototype.draggable = function constructor(...args: any): any {
    let handler = this.remember('_draggable');
    if (!handler) {
        originalDraggable.call(this, ...args);
        handler = this.remember('_draggable');
        handler.drag = function(e: any) {
            this.m = this.el.node.getScreenCTM().inverse();
            return handler.constructor.prototype.drag.call(this, e);
        }
    } else {
        originalDraggable.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalDraggable)) {
    SVG.Element.prototype.draggable[key] = originalDraggable[key];
}

// Fix method resize
const originalResize = SVG.Element.prototype.resize;
SVG.Element.prototype.resize = function constructor(...args: any): any {
    let handler = this.remember('_resizeHandler');
    if (!handler) {
        originalResize.call(this, ...args);
        handler = this.remember('_resizeHandler');
        handler.update = function(e: any) {
            this.m = this.el.node.getScreenCTM().inverse();
            return handler.constructor.prototype.update.call(this, e);
        }
    } else {
        originalResize.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalResize)) {
    SVG.Element.prototype.resize[key] = originalResize[key];
}
