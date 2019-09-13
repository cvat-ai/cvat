JSMpeg.Renderer.Canvas2D = (function(){ "use strict";

var CanvasRenderer = function(options) {
	this.canvas = options.canvas; // || document.createElement('canvas');
	console.log(this.canvas);
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.enabled = true;

	this.context = this.canvas.getContext('2d');
};

CanvasRenderer.prototype.destroy = function() {
	// Nothing to do here
};

CanvasRenderer.prototype.resize = function(width, height) {
	this.width = width|0;
	this.height = height|0;

	this.canvas.width = this.width;
	this.canvas.height = this.height;

	this.imageData = this.context.getImageData(0, 0, this.width, this.height);
	JSMpeg.Fill(this.imageData.data, 255);
};

CanvasRenderer.prototype.renderProgress = function(progress) {
	var 
		w = this.canvas.width,
		h = this.canvas.height,
		ctx = this.context;

	ctx.fillStyle = '#222';
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, h - h * progress, w, h * progress);
};

CanvasRenderer.prototype.render = function(y, cb, cr) {
	this.YCbCrToRGBA(y, cb, cr, this.imageData.data);
	// this.context.putImageData(this.imageData, 0, 0);
	return this.imageData;
};

CanvasRenderer.prototype.YCbCrToRGBA = function(y, cb, cr, rgba) {
	if (!this.enabled) {
		return;
	}

	// Chroma values are the same for each block of 4 pixels, so we proccess
	// 2 lines at a time, 2 neighboring pixels each.
	// I wish we could use 32bit writes to the RGBA buffer instead of writing
	// each byte separately, but we need the automatic clamping of the RGBA
	// buffer.
	
	var w = ((this.width + 15) >> 4) << 4,
		w2 = w >> 1;

	var yIndex1 = 0,
		yIndex2 = w,
		yNext2Lines = w + (w - this.width);

	var cIndex = 0,
		cNextLine = w2 - (this.width >> 1);

	var rgbaIndex1 = 0,
		rgbaIndex2 = this.width * 4,
		rgbaNext2Lines = this.width * 4;

	var cols = this.width >> 1,
		rows = this.height >> 1;

	var ccb, ccr, r, g, b;

	for (var row = 0; row < rows; row++) {
		for (var col = 0; col < cols; col++) {
			ccb = cb[cIndex];
			ccr = cr[cIndex];
			cIndex++;

			r = (ccb + ((ccb * 103) >> 8)) - 179;
			g = ((ccr * 88) >> 8) - 44 + ((ccb * 183) >> 8) - 91;
			b = (ccr + ((ccr * 198) >> 8)) - 227;

			// Line 1
			var y1 = y[yIndex1++];
			var y2 = y[yIndex1++];
			rgba[rgbaIndex1]   = y1 + r;
			rgba[rgbaIndex1+1] = y1 - g;
			rgba[rgbaIndex1+2] = y1 + b;
			rgba[rgbaIndex1+4] = y2 + r;
			rgba[rgbaIndex1+5] = y2 - g;
			rgba[rgbaIndex1+6] = y2 + b;
			rgbaIndex1 += 8;

			// Line 2
			var y3 = y[yIndex2++];
			var y4 = y[yIndex2++];
			rgba[rgbaIndex2]   = y3 + r;
			rgba[rgbaIndex2+1] = y3 - g;
			rgba[rgbaIndex2+2] = y3 + b;
			rgba[rgbaIndex2+4] = y4 + r;
			rgba[rgbaIndex2+5] = y4 - g;
			rgba[rgbaIndex2+6] = y4 + b;
			rgbaIndex2 += 8;
		}

		yIndex1 += yNext2Lines;
		yIndex2 += yNext2Lines;
		rgbaIndex1 += rgbaNext2Lines;
		rgbaIndex2 += rgbaNext2Lines;
		cIndex += cNextLine;
	}
};

return CanvasRenderer;

})();


