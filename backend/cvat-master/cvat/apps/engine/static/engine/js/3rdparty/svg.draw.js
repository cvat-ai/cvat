/*! svg.draw.js - v2.0.3 - 2017-06-19
* https://github.com/svgdotjs/svg.draw.js
* Copyright (c) 2017 Ulrich-Matthias Schäfer; Licensed MIT */

;(function () {
    // Our Object which manages drawing
    function PaintHandler(el, event, options) {

        this.el = el;
        el.remember('_paintHandler', this);
    
        var _this = this,
            plugin = this.getPlugin();

        this.parent = el.parent(SVG.Nested) || el.parent(SVG.Doc);
        this.p = this.parent.node.createSVGPoint(); // Helping point for coord transformation
        this.m = null;  // transformation matrix. We get it when drawing starts
        this.startPoint = null;
        this.lastUpdateCall = null;
        this.options = {};

        // Merge options and defaults
        for (var i in this.el.draw.defaults) {
            this.options[i] = this.el.draw.defaults[i];
            if (typeof options[i] !== 'undefined') {
                this.options[i] = options[i];
            }
        }
        
        if(plugin.point) {
          plugin['pointPlugin'] = plugin.point;
          delete plugin.point;
        }
        
        // Import all methods from plugin into object
        for (var i in plugin){
            this[i] = plugin[i];
        }
        
        // When we got an event, we use this for start, otherwise we use the click-event as default
        if (!event) {
            this.parent.on('click.draw', function (e) {
                _this.start(e);
            });

        }

    }

    PaintHandler.prototype.transformPoint = function(x, y){

        this.p.x = x - (this.offset.x - window.pageXOffset);
        this.p.y = y - (this.offset.y - window.pageYOffset);
        
        return this.p.matrixTransform(this.m);
    
    }
    
    PaintHandler.prototype.start = function (event) {
    
        var _this = this;
    
        // get the current transform matrix from screen to element (offset corrected)
        this.m = this.el.node.getScreenCTM().inverse();

        // we save the current scrolling-offset here
        this.offset = { x: window.pageXOffset, y: window.pageYOffset };

        // we want to snap in screen-coords, so we have to scale the snapToGrid accordingly
        this.options.snapToGrid *= Math.sqrt(this.m.a * this.m.a + this.m.b * this.m.b)

        // save the startpoint
        this.startPoint = this.snapToGrid(this.transformPoint(event.clientX, event.clientY));

        // the plugin may do some initial work
        if(this.init){ this.init(event); }

        // Fire our `drawstart`-event. We send the offset-corrected cursor-position along
        this.el.fire('drawstart', {event:event, p:this.p, m:this.m});

        // We need to bind the update-function to the mousemove event to keep track of the cursor
        SVG.on(window, 'mousemove.draw', function (e) {
            _this.update(e);
        });

        // Every consecutive call to start should map to point now
        this.start = this.point;


    };

    // This function draws a point if the element is a polyline or polygon
    // Otherwise it will just stop drawing the shape cause we are done
    PaintHandler.prototype.point = function (event) {
        if (this.point != this.start) return this.start(event);
        
        if (this.pointPlugin) {
            return this.pointPlugin(event);
        }
    
        // If this function is not overwritten we just call stop
        this.stop(event);
    };


    // The stop-function does the cleanup work
    PaintHandler.prototype.stop = function (event) {
        if (event) {
            this.update(event);
        }
        
        // Plugin may want to clean something
        if(this.clean){ this.clean(); }

        // Unbind from all events
        SVG.off(window, 'mousemove.draw');
        this.parent.off('click.draw');

        // remove Refernce to PaintHandler
        this.el.forget('_paintHandler');

        // overwrite draw-function since we never need it again for this element
        this.el.draw = function () {
        };

        // Fire the `drawstop`-event
        this.el.fire('drawstop');
    };

    // Updates the element while moving the cursor
    PaintHandler.prototype.update = function (event) {

        if(!event && this.lastUpdateCall){
            event = this.lastUpdateCall;
        }
        
        this.lastUpdateCall = event;
    
        // Call the calc-function which calculates the new position and size
        this.calc(event);

        // Fire the `drawupdate`-event
        this.el.fire('drawupdate', {event:event, p:this.p, m:this.m});
    };

    // Called from outside. Finishs a poly-element
    PaintHandler.prototype.done = function () {
        this.calc();
        this.stop();

        this.el.fire('drawdone');
    };

    // Called from outside. Cancels a poly-element
    PaintHandler.prototype.cancel = function () {
        // stop drawing and remove the element
        this.stop();
        this.el.remove();

        this.el.fire('drawcancel');
    };

    // Calculate the corrected position when using `snapToGrid`
    PaintHandler.prototype.snapToGrid = function (draw) {

        var temp = null;

        // An array was given. Loop through every element
        if (draw.length) {
            temp = [draw[0] % this.options.snapToGrid, draw[1] % this.options.snapToGrid];
            draw[0] -= temp[0] < this.options.snapToGrid / 2 ? temp[0] : temp[0] - this.options.snapToGrid;
            draw[1] -= temp[1] < this.options.snapToGrid / 2 ? temp[1] : temp[1] - this.options.snapToGrid;
            return draw;
        }

        // Properties of element were given. Snap them all
        for (var i in draw) {
            temp = draw[i] % this.options.snapToGrid;
            draw[i] -= (temp < this.options.snapToGrid / 2 ? temp : temp - this.options.snapToGrid) + (temp < 0 ? this.options.snapToGrid : 0);
        }

        return draw;
    };

    PaintHandler.prototype.param = function (key, value) {
        this.options[key] = value === null ? this.el.draw.defaults[key] : value;
        this.update();
    };

    // Returns the plugin
    PaintHandler.prototype.getPlugin = function () {
        return this.el.draw.plugins[this.el.type];
    };

    SVG.extend(SVG.Element, {
        // Draw element with mouse
        draw: function (event, options, value) {

            // sort the parameters
            if (!(event instanceof Event || typeof event === 'string')) {
                options = event;
                event = null;
            }

            // get the old Handler or create a new one from event and options
            var paintHandler = this.remember('_paintHandler') || new PaintHandler(this, event, options || {});

            // When we got an event we have to start/continue drawing
            if (event instanceof Event) {
                paintHandler['start'](event);
            }

            // if event is located in our PaintHandler we handle it as method
            if (paintHandler[event]) {
                paintHandler[event](options, value);
            }

            return this;
        }

    });

    // Default values. Can be changed for the whole project if needed
    SVG.Element.prototype.draw.defaults = {
        snapToGrid: 1        // Snaps to a grid of `snapToGrid` px
    };

    SVG.Element.prototype.draw.extend = function(name, obj){

        var plugins = {};
        if(typeof name === 'string'){
            plugins[name] = obj;
        }else{
            plugins = name;
        }

        for(var shapes in plugins){
            var shapesArr = shapes.trim().split(/\s+/);

            for(var i in shapesArr){
                SVG.Element.prototype.draw.plugins[shapesArr[i]] = plugins[shapes];
            }
        }

    };

    // Container for all types not specified here
    SVG.Element.prototype.draw.plugins = {};

    SVG.Element.prototype.draw.extend('rect image', {
    
        init:function(e){

            var p = this.startPoint;
            
            this.el.attr({ x: p.x, y: p.y, height: 0, width: 0 });
        },
        
        calc:function (e) {

            var rect = {
                x: this.startPoint.x,
                y: this.startPoint.y
            },  p = this.transformPoint(e.clientX, e.clientY);

            rect.width = p.x - rect.x;
            rect.height = p.y - rect.y;

            // Snap the params to the grid we specified
            this.snapToGrid(rect);

            // When width is less than zero, we have to draw to the left
            // which means we have to move the start-point to the left
            if (rect.width < 0) {
                rect.x = rect.x + rect.width;
                rect.width = -rect.width;
            }

            // ...same with height
            if (rect.height < 0) {
                rect.y = rect.y + rect.height;
                rect.height = -rect.height;
            }

            // draw the element
            this.el.attr(rect);
        }
    
    });


    SVG.Element.prototype.draw.extend('line polyline polygon', {

        init:function(e){
            // When we draw a polygon, we immediately need 2 points.
            // One start-point and one point at the mouse-position

            this.set = new SVG.Set();

            var p = this.startPoint,
                arr = [
                    [p.x, p.y],
                    [p.x, p.y]
                ];

            this.el.plot(arr);

            // We draw little circles around each point
            // This is absolutely not needed and maybe removed in a later release
            this.drawCircles();

        },


        // The calc-function sets the position of the last point to the mouse-position (with offset ofc)
        calc:function (e) {
            var arr = this.el.array().valueOf();
            arr.pop();

            if (e) {
                var p = this.transformPoint(e.clientX, e.clientY);
                arr.push(this.snapToGrid([p.x, p.y]));
            }

            this.el.plot(arr);

        },

        point:function(e){

            if (this.el.type.indexOf('poly') > -1) {
                // Add the new Point to the point-array
                var p = this.transformPoint(e.clientX, e.clientY),
                    arr = this.el.array().valueOf();

                arr.push(this.snapToGrid([p.x, p.y]));

                this.el.plot(arr);
                this.drawCircles();

                // Fire the `drawpoint`-event, which holds the coords of the new Point
                this.el.fire('drawpoint', {event:e, p:{x:p.x, y:p.y}, m:this.m});

                return;
            }

            // We are done, if the element is no polyline or polygon
            this.stop(e);

        },

        clean:function(){

            // Remove all circles
            this.set.each(function () {
                this.remove();
            });

            this.set.clear();

            delete this.set;

        },

        drawCircles:function () {
            var array = this.el.array().valueOf()

            this.set.each(function () {
                this.remove();
            });

            this.set.clear();

            for (var i = 0; i < array.length; ++i) {

                this.p.x = array[i][0]
                this.p.y = array[i][1]

                var p = this.p.matrixTransform(this.parent.node.getScreenCTM().inverse().multiply(this.el.node.getScreenCTM()));

                this.set.add(this.parent.circle(5).stroke({width: 1}).fill('#ccc').center(p.x, p.y));
            }
        }

    });

    SVG.Element.prototype.draw.extend('circle', {
    
        init:function(e){
        
            var p = this.startPoint;

            this.el.attr({ cx: p.x, cy: p.y, r: 1 });
        },

        // We determine the radius by the cursor position
        calc:function (e) {
            
            var p = this.transformPoint(e.clientX, e.clientY),
                circle = {
                    cx: this.startPoint.x,
                    cy: this.startPoint.y,

                    // calculating the radius
                    r: Math.sqrt(
                        (p.x - this.startPoint.x) * (p.x - this.startPoint.x) +
                        (p.y - this.startPoint.y) * (p.y - this.startPoint.y)
                    )
            };
            
            this.snapToGrid(circle);
            this.el.attr(circle);
        }
        
    });

    SVG.Element.prototype.draw.extend('ellipse', {
    
        init:function(e){
            // We start with a circle with radius 1 at the position of the cursor
            var p = this.startPoint;

            this.el.attr({ cx: p.x, cy: p.y, rx: 1, ry: 1 });
            
        },

        calc:function (e) {
            var p = this.transformPoint(e.clientX, e.clientY);
        
            var ellipse = {
                cx: this.startPoint.x,
                cy: this.startPoint.y,
                rx: Math.abs(p.x - this.startPoint.x),
                ry: Math.abs(p.y - this.startPoint.y)
            };
            
            this.snapToGrid(ellipse);
            this.el.attr(ellipse);
        }
        
    });
}).call(this);