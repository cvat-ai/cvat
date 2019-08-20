import * as SVG from 'svg.js';

/* eslint-disable */

import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

const originalDraw = SVG.Element.prototype.draw;
SVG.Element.prototype.draw = function constructor(...args: any): any {
    let handler = this.remember('_paintHandler');
    if (!handler) {
        originalDraw.call(this, ...args);
        handler = this.remember('_paintHandler');
        handler.set = new SVG.Set();
        handler.update = function (event: MouseEvent): void {
            if (!event && this.lastUpdateCall){
                event = this.lastUpdateCall;
            }

            this.lastUpdateCall = event;

            // Call the calc-function which calculates the new position and size
            this.calc(event);

            this.m = this.el.node.getScreenCTM().inverse();
            this.offset = { x: window.pageXOffset, y: window.pageYOffset };
            // Fire the `drawupdate`-event
            this.el.fire('drawupdate', {event:event, p:this.p, m:this.m});
        };
    } else {
        originalDraw.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalDraw)) {
    SVG.Element.prototype.draw[key] = originalDraw[key];
}

SVG.Element.prototype.draw.extend('polyline polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    SVG.Element.prototype.draw.plugins.polygon,
    {
        undo(): void {
            if (this.set.length()) {
                this.set.members.splice(-1, 1)[0].remove();
                this.el.array().value.splice(-2, 1);
                this.el.plot(this.el.array());
                this.el.fire('undopoint');
            }
        },
    }));

SVG.Element.prototype.draw.extend('line polyline polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    SVG.Element.prototype.draw.plugins.polygon,
    SVG.Element.prototype.draw.plugins.line,
    {
        drawCircles(): void {
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
        },
    }));
