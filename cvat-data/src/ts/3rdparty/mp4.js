function assert(condition, message) {
  if (!condition) {
    error(message);
  }
};

/**
 * Represents a 2-dimensional size value.
 */
var Size = (function size() {
  function constructor(w, h) {
    this.w = w;
    this.h = h;
  }
  constructor.prototype = {
    toString: function () {
      return "(" + this.w + ", " + this.h + ")";
    },
    getHalfSize: function() {
      return new Size(this.w >>> 1, this.h >>> 1);
    },
    length: function() {
      return this.w * this.h;
    }
  };
  return constructor;
})();





var Bytestream = (function BytestreamClosure() {
  function constructor(arrayBuffer, start, length) {
    this.bytes = new Uint8Array(arrayBuffer);
    this.start = start || 0;
    this.pos = this.start;
    this.end = (start + length) || this.bytes.length;
  }
  constructor.prototype = {
    get length() {
      return this.end - this.start;
    },
    get position() {
      return this.pos;
    },
    get remaining() {
      return this.end - this.pos;
    },
    readU8Array: function (length) {
      if (this.pos > this.end - length)
        return null;
      var res = this.bytes.subarray(this.pos, this.pos + length);
      this.pos += length;
      return res;
    },
    readU32Array: function (rows, cols, names) {
      cols = cols || 1;
      if (this.pos > this.end - (rows * cols) * 4)
        return null;
      if (cols == 1) {
        var array = new Uint32Array(rows);
        for (var i = 0; i < rows; i++) {
          array[i] = this.readU32();
        }
        return array;
      } else {
        var array = new Array(rows);
        for (var i = 0; i < rows; i++) {
          var row = null;
          if (names) {
            row = {};
            for (var j = 0; j < cols; j++) {
              row[names[j]] = this.readU32();
            }
          } else {
            row = new Uint32Array(cols);
            for (var j = 0; j < cols; j++) {
              row[j] = this.readU32();
            }
          }
          array[i] = row;
        }
        return array;
      }
    },
    read8: function () {
      return this.readU8() << 24 >> 24;
    },
    readU8: function () {
      if (this.pos >= this.end)
        return null;
      return this.bytes[this.pos++];
    },
    read16: function () {
      return this.readU16() << 16 >> 16;
    },
    readU16: function () {
      if (this.pos >= this.end - 1)
        return null;
      var res = this.bytes[this.pos + 0] << 8 | this.bytes[this.pos + 1];
      this.pos += 2;
      return res;
    },
    read24: function () {
      return this.readU24() << 8 >> 8;
    },
    readU24: function () {
      var pos = this.pos;
      var bytes = this.bytes;
      if (pos > this.end - 3)
        return null;
      var res = bytes[pos + 0] << 16 | bytes[pos + 1] << 8 | bytes[pos + 2];
      this.pos += 3;
      return res;
    },
    peek32: function (advance) {
      var pos = this.pos;
      var bytes = this.bytes;
      if (pos > this.end - 4)
        return null;
      var res = bytes[pos + 0] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3];
      if (advance) {
        this.pos += 4;
      }
      return res;
    },
    read32: function () {
      return this.peek32(true);
    },
    readU32: function () {
      return this.peek32(true) >>> 0;
    },
    read4CC: function () {
      var pos = this.pos;
      if (pos > this.end - 4)
        return null;
      var res = "";
      for (var i = 0; i < 4; i++) {
        res += String.fromCharCode(this.bytes[pos + i]);
      }
      this.pos += 4;
      return res;
    },
    readFP16: function () {
      return this.read32() / 65536;
    },
    readFP8: function () {
      return this.read16() / 256;
    },
    readISO639: function () {
      var bits = this.readU16();
      var res = "";
      for (var i = 0; i < 3; i++) {
        var c = (bits >>> (2 - i) * 5) & 0x1f;
        res += String.fromCharCode(c + 0x60);
      }
      return res;
    },
    readUTF8: function (length) {
      var res = "";
      for (var i = 0; i < length; i++) {
        res += String.fromCharCode(this.readU8());
      }
      return res;
    },
    readPString: function (max) {
      var len = this.readU8();
      assert (len <= max);
      var res = this.readUTF8(len);
      this.reserved(max - len - 1, 0);
      return res;
    },
    skip: function (length) {
      this.seek(this.pos + length);
    },
    reserved: function (length, value) {
      for (var i = 0; i < length; i++) {
        assert (this.readU8() == value);
      }
    },
    seek: function (index) {
      if (index < 0 || index > this.end) {
        error("Index out of bounds (bounds: [0, " + this.end + "], index: " + index + ").");
      }
      this.pos = index;
    },
    subStream: function (start, length) {
      return new Bytestream(this.bytes.buffer, start, length);
    }
  };
  return constructor;
})();


var PARANOID = true; // Heavy-weight assertions.

/**
 * Reads an mp4 file and constructs a object graph that corresponds to the box/atom
 * structure of the file. Mp4 files are based on the ISO Base Media format, which in
 * turn is based on the Apple Quicktime format. The Quicktime spec is available at:
 * http://developer.apple.com/library/mac/#documentation/QuickTime/QTFF. An mp4 spec
 * also exists, but I cannot find it freely available.
 *
 * Mp4 files contain a tree of boxes (or atoms in Quicktime). The general structure
 * is as follows (in a pseudo regex syntax):
 *
 * Box / Atom Structure:
 *
 * [size type [version flags] field* box*]
 *  <32> <4C>  <--8--> <24->  <-?->  <?>
 *  <------------- box size ------------>
 *
 *  The box size indicates the entire size of the box and its children, we can use it
 *  to skip over boxes that are of no interest. Each box has a type indicated by a
 *  four character code (4C), this describes how the box should be parsed and is also
 *  used as an object key name in the resulting box tree. For example, the expression:
 *  "moov.trak[0].mdia.minf" can be used to access individual boxes in the tree based
 *  on their 4C name. If two or more boxes with the same 4C name exist in a box, then
 *  an array is built with that name.
 *
 */
var MP4Reader = (function reader() {
  var BOX_HEADER_SIZE = 8;
  var FULL_BOX_HEADER_SIZE = BOX_HEADER_SIZE + 4;

  function constructor(stream) {
    this.stream = stream;
    this.tracks = {};
  }

  constructor.prototype = {
    readBoxes: function (stream, parent) {
      while (stream.peek32()) {
        var child = this.readBox(stream);
        if (child.type in parent) {
          var old = parent[child.type];
          if (!(old instanceof Array)) {
            parent[child.type] = [old];
          }
          parent[child.type].push(child);
        } else {
          parent[child.type] = child;
        }
      }
    },
    readBox: function readBox(stream) {
      var box = { offset: stream.position };

      function readHeader() {
        box.size = stream.readU32();
        box.type = stream.read4CC();
      }

      function readFullHeader() {
        box.version = stream.readU8();
        box.flags = stream.readU24();
      }

      function remainingBytes() {
        return box.size - (stream.position - box.offset);
      }

      function skipRemainingBytes () {
        stream.skip(remainingBytes());
      }

      var readRemainingBoxes = function () {
        var subStream = stream.subStream(stream.position, remainingBytes());
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
      }.bind(this);

      readHeader();

      switch (box.type) {
        case 'ftyp':
          box.name = "File Type Box";
          box.majorBrand = stream.read4CC();
          box.minorVersion = stream.readU32();
          box.compatibleBrands = new Array((box.size - 16) / 4);
          for (var i = 0; i < box.compatibleBrands.length; i++) {
            box.compatibleBrands[i] = stream.read4CC();
          }
          break;
        case 'moov':
          box.name = "Movie Box";
          readRemainingBoxes();
          break;
        case 'mvhd':
          box.name = "Movie Header Box";
          readFullHeader();
          assert (box.version == 0);
          box.creationTime = stream.readU32();
          box.modificationTime = stream.readU32();
          box.timeScale = stream.readU32();
          box.duration = stream.readU32();
          box.rate = stream.readFP16();
          box.volume = stream.readFP8();
          stream.skip(10);
          box.matrix = stream.readU32Array(9);
          stream.skip(6 * 4);
          box.nextTrackId = stream.readU32();
          break;
        case 'trak':
          box.name = "Track Box";
          readRemainingBoxes();
          this.tracks[box.tkhd.trackId] = new Track(this, box);
          break;
        case 'tkhd':
          box.name = "Track Header Box";
          readFullHeader();
          assert (box.version == 0);
          box.creationTime = stream.readU32();
          box.modificationTime = stream.readU32();
          box.trackId = stream.readU32();
          stream.skip(4);
          box.duration = stream.readU32();
          stream.skip(8);
          box.layer = stream.readU16();
          box.alternateGroup = stream.readU16();
          box.volume = stream.readFP8();
          stream.skip(2);
          box.matrix = stream.readU32Array(9);
          box.width = stream.readFP16();
          box.height = stream.readFP16();
          break;
        case 'mdia':
          box.name = "Media Box";
          readRemainingBoxes();
          break;
        case 'mdhd':
          box.name = "Media Header Box";
          readFullHeader();
          assert (box.version == 0);
          box.creationTime = stream.readU32();
          box.modificationTime = stream.readU32();
          box.timeScale = stream.readU32();
          box.duration = stream.readU32();
          box.language = stream.readISO639();
          stream.skip(2);
          break;
        case 'hdlr':
          box.name = "Handler Reference Box";
          readFullHeader();
          stream.skip(4);
          box.handlerType = stream.read4CC();
          stream.skip(4 * 3);
          var bytesLeft = box.size - 32;
          if (bytesLeft > 0) {
            box.name = stream.readUTF8(bytesLeft);
          }
          break;
        case 'minf':
          box.name = "Media Information Box";
          readRemainingBoxes();
          break;
        case 'stbl':
          box.name = "Sample Table Box";
          readRemainingBoxes();
          break;
        case 'stsd':
          box.name = "Sample Description Box";
          readFullHeader();
          box.sd = [];
          var entries = stream.readU32();
          readRemainingBoxes();
          break;
        case 'avc1':
          stream.reserved(6, 0);
          box.dataReferenceIndex = stream.readU16();
          assert (stream.readU16() == 0); // Version
          assert (stream.readU16() == 0); // Revision Level
          stream.readU32(); // Vendor
          stream.readU32(); // Temporal Quality
          stream.readU32(); // Spatial Quality
          box.width = stream.readU16();
          box.height = stream.readU16();
          box.horizontalResolution = stream.readFP16();
          box.verticalResolution = stream.readFP16();
          assert (stream.readU32() == 0); // Reserved
          box.frameCount = stream.readU16();
          box.compressorName = stream.readPString(32);
          box.depth = stream.readU16();
          assert (stream.readU16() == 0xFFFF); // Color Table Id
          readRemainingBoxes();
          break;
        case 'mp4a':
          stream.reserved(6, 0);
          box.dataReferenceIndex = stream.readU16();
          box.version = stream.readU16();
          stream.skip(2);
          stream.skip(4);
          box.channelCount = stream.readU16();
          box.sampleSize = stream.readU16();
          box.compressionId = stream.readU16();
          box.packetSize = stream.readU16();
          box.sampleRate = stream.readU32() >>> 16;

          // TODO: Parse other version levels.
          assert (box.version == 0);
          readRemainingBoxes();
          break;
        case 'esds':
          box.name = "Elementary Stream Descriptor";
          readFullHeader();
          // TODO: Do we really need to parse this?
          skipRemainingBytes();
          break;
        case 'avcC':
          box.name = "AVC Configuration Box";
          box.configurationVersion = stream.readU8();
          box.avcProfileIndication = stream.readU8();
          box.profileCompatibility = stream.readU8();
          box.avcLevelIndication = stream.readU8();
          box.lengthSizeMinusOne = stream.readU8() & 3;
          assert (box.lengthSizeMinusOne == 3, "TODO");
          var count = stream.readU8() & 31;
          box.sps = [];
          for (var i = 0; i < count; i++) {
            box.sps.push(stream.readU8Array(stream.readU16()));
          }
          var count = stream.readU8() & 31;
          box.pps = [];
          for (var i = 0; i < count; i++) {
            box.pps.push(stream.readU8Array(stream.readU16()));
          }
          skipRemainingBytes();
          break;
        case 'btrt':
          box.name = "Bit Rate Box";
          box.bufferSizeDb = stream.readU32();
          box.maxBitrate = stream.readU32();
          box.avgBitrate = stream.readU32();
          break;
        case 'stts':
          box.name = "Decoding Time to Sample Box";
          readFullHeader();
          box.table = stream.readU32Array(stream.readU32(), 2, ["count", "delta"]);
          break;
        case 'stss':
          box.name = "Sync Sample Box";
          readFullHeader();
          box.samples = stream.readU32Array(stream.readU32());
          break;
        case 'stsc':
          box.name = "Sample to Chunk Box";
          readFullHeader();
          box.table = stream.readU32Array(stream.readU32(), 3,
            ["firstChunk", "samplesPerChunk", "sampleDescriptionId"]);
          break;
        case 'stsz':
          box.name = "Sample Size Box";
          readFullHeader();
          box.sampleSize = stream.readU32();
          var count = stream.readU32();
          if (box.sampleSize == 0) {
            box.table = stream.readU32Array(count);
          }
          break;
        case 'stco':
          box.name = "Chunk Offset Box";
          readFullHeader();
          box.table = stream.readU32Array(stream.readU32());
          break;
        case 'smhd':
          box.name = "Sound Media Header Box";
          readFullHeader();
          box.balance = stream.readFP8();
          stream.reserved(2, 0);
          break;
        case 'mdat':
          box.name = "Media Data Box";
          assert (box.size >= 8, "Cannot parse large media data yet.");
          box.data = stream.readU8Array(remainingBytes());
          break;
        default:
          skipRemainingBytes();
          break;
      };
      return box;
    },
    read: function () {
      var start = (new Date).getTime();
      this.file = {};
      this.readBoxes(this.stream, this.file);
      console.info("Parsed stream in " + ((new Date).getTime() - start) + " ms");
    },
    traceSamples: function () {
      var video = this.tracks[1];
      var audio = this.tracks[2];

      console.info("Video Samples: " + video.getSampleCount());
      console.info("Audio Samples: " + audio.getSampleCount());

      var vi = 0;
      var ai = 0;

      for (var i = 0; i < 100; i++) {
        var vo = video.sampleToOffset(vi);
        var ao = audio.sampleToOffset(ai);

        var vs = video.sampleToSize(vi, 1);
        var as = audio.sampleToSize(ai, 1);

        if (vo < ao) {
          console.info("V Sample " + vi + " Offset : " + vo + ", Size : " + vs);
          vi ++;
        } else {
          console.info("A Sample " + ai + " Offset : " + ao + ", Size : " + as);
          ai ++;
        }
      }
    }
  };
  return constructor;
})();

var Track = (function track () {
  function constructor(file, trak) {
    this.file = file;
    this.trak = trak;
  }

  constructor.prototype = {
    getSampleSizeTable: function () {
      return this.trak.mdia.minf.stbl.stsz.table;
    },
    getSampleCount: function () {
      return this.getSampleSizeTable().length;
    },
    /**
     * Computes the size of a range of samples, returns zero if length is zero.
     */
    sampleToSize: function (start, length) {
      var table = this.getSampleSizeTable();
      var size = 0;
      for (var i = start; i < start + length; i++) {
        size += table[i];
      }
      return size;
    },
    /**
     * Computes the chunk that contains the specified sample, as well as the offset of
     * the sample in the computed chunk.
     */
    sampleToChunk: function (sample) {

      /* Samples are grouped in chunks which may contain a variable number of samples.
       * The sample-to-chunk table in the stsc box describes how samples are arranged
       * in chunks. Each table row corresponds to a set of consecutive chunks with the
       * same number of samples and description ids. For example, the following table:
       *
       * +-------------+-------------------+----------------------+
       * | firstChunk  |  samplesPerChunk  |  sampleDescriptionId |
       * +-------------+-------------------+----------------------+
       * | 1           |  3                |  23                  |
       * | 3           |  1                |  23                  |
       * | 5           |  1                |  24                  |
       * +-------------+-------------------+----------------------+
       *
       * describes 5 chunks with a total of (2 * 3) + (2 * 1) + (1 * 1) = 9 samples,
       * each chunk containing samples 3, 3, 1, 1, 1 in chunk order, or
       * chunks 1, 1, 1, 2, 2, 2, 3, 4, 5 in sample order.
       *
       * This function determines the chunk that contains a specified sample by iterating
       * over every entry in the table. It also returns the position of the sample in the
       * chunk which can be used to compute the sample's exact position in the file.
       *
       * TODO: Determine if we should memoize this function.
       */

      var table = this.trak.mdia.minf.stbl.stsc.table;

      if (table.length === 1) {
        var row = table[0];
        assert (row.firstChunk === 1);
        return {
          index: Math.floor(sample / row.samplesPerChunk),
          offset: sample % row.samplesPerChunk
        };
      }

      var totalChunkCount = 0;
      for (var i = 0; i < table.length; i++) {
        var row = table[i];
        if (i > 0) {
          var previousRow = table[i - 1];
          var previousChunkCount = row.firstChunk - previousRow.firstChunk;
          var previousSampleCount = previousRow.samplesPerChunk * previousChunkCount;
          if (sample >= previousSampleCount) {
            sample -= previousSampleCount;
            if (i == table.length - 1) {
              return {
                index: totalChunkCount + previousChunkCount + Math.floor(sample / row.samplesPerChunk),
                offset: sample % row.samplesPerChunk
              };
            }
          } else {
            return {
              index: totalChunkCount + Math.floor(sample / previousRow.samplesPerChunk),
              offset: sample % previousRow.samplesPerChunk
            };
          }
          totalChunkCount += previousChunkCount;
        }
      }
      assert(false);
    },
    chunkToOffset: function (chunk) {
      var table = this.trak.mdia.minf.stbl.stco.table;
      return table[chunk];
    },
    sampleToOffset: function (sample) {
      var res = this.sampleToChunk(sample);
      var offset = this.chunkToOffset(res.index);
      return offset + this.sampleToSize(sample - res.offset, res.offset);
    },
    /**
     * Computes the sample at the specified time.
     */
    timeToSample: function (time) {
      /* In the time-to-sample table samples are grouped by their duration. The count field
       * indicates the number of consecutive samples that have the same duration. For example,
       * the following table:
       *
       * +-------+-------+
       * | count | delta |
       * +-------+-------+
       * |   4   |   3   |
       * |   2   |   1   |
       * |   3   |   2   |
       * +-------+-------+
       *
       * describes 9 samples with a total time of (4 * 3) + (2 * 1) + (3 * 2) = 20.
       *
       * This function determines the sample at the specified time by iterating over every
       * entry in the table.
       *
       * TODO: Determine if we should memoize this function.
       */
      var table = this.trak.mdia.minf.stbl.stts.table;
      var sample = 0;
      for (var i = 0; i < table.length; i++) {
        var delta = table[i].count * table[i].delta;
        if (time >= delta) {
          time -= delta;
          sample += table[i].count;
        } else {
          return sample + Math.floor(time / table[i].delta);
        }
      }
    },
    /**
     * Gets the total time of the track.
     */
    getTotalTime: function () {
      if (PARANOID) {
        var table = this.trak.mdia.minf.stbl.stts.table;
        var duration = 0;
        for (var i = 0; i < table.length; i++) {
          duration += table[i].count * table[i].delta;
        }
        assert (this.trak.mdia.mdhd.duration == duration);
      }
      return this.trak.mdia.mdhd.duration;
    },
    getTotalTimeInSeconds: function () {
      return this.timeToSeconds(this.getTotalTime());
    },
    getTimeScale: function () {
      return this.trak.mdia.mdhd.timeScale;
    },
    /**
     * Converts time units to real time (seconds).
     */
    timeToSeconds: function (time) {
      return time / this.getTimeScale();
    },
    /**
     * Converts real time (seconds) to time units.
     */
    secondsToTime: function (seconds) {
      return seconds * this.getTimeScale();
    },
    foo: function () {
      /*
      for (var i = 0; i < this.getSampleCount(); i++) {
        var res = this.sampleToChunk(i);
        console.info("Sample " + i + " -> " + res.index + " % " + res.offset +
                     " @ " + this.chunkToOffset(res.index) +
                     " @@ " + this.sampleToOffset(i));
      }
      console.info("Total Time: " + this.timeToSeconds(this.getTotalTime()));
      var total = this.getTotalTimeInSeconds();
      for (var i = 50; i < total; i += 0.1) {
        // console.info("Time: " + i.toFixed(2) + " " + this.secondsToTime(i));

        console.info("Time: " + i.toFixed(2) + " " + this.timeToSample(this.secondsToTime(i)));
      }
      */
    },
    /**
     * AVC samples contain one or more NAL units each of which have a length prefix.
     * This function returns an array of NAL units without their length prefixes.
     */
    getSampleNALUnits: function (sample) {
      var bytes = this.file.stream.bytes;
      var offset = this.sampleToOffset(sample);
      var end = offset + this.sampleToSize(sample, 1);
      var nalUnits = [];
      while(end - offset > 0) {
        var length = (new Bytestream(bytes.buffer, offset)).readU32();
        nalUnits.push(bytes.subarray(offset + 4, offset + length + 4));
        offset = offset + length + 4;
      }
      return nalUnits;
    }
  };
  return constructor;
})();


// Only add setZeroTimeout to the window object, and hide everything
// else in a closure. (http://dbaron.org/log/20100309-faster-timeouts)
(function() {
    var timeouts = [];
    var messageName = "zero-timeout-message";

    // Like setTimeout, but only takes a function argument.  There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function setZeroTimeout(fn) {
        timeouts.push(fn);
        window.postMessage(messageName, "*");
    }

    function handleMessage(event) {
        if (event.source == window && event.data == messageName) {
            event.stopPropagation();
            if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
            }
        }
    }

    window.addEventListener("message", handleMessage, true);

    // Add the one thing we want added to the window object.
    window.setZeroTimeout = setZeroTimeout;
})();

var MP4Player = (function reader() {
  var defaultConfig = {
    filter: "original",
    filterHorLuma: "optimized",
    filterVerLumaEdge: "optimized",
    getBoundaryStrengthsA: "optimized"
  };

  function constructor(stream, useWorkers, webgl, render) {
    this.stream = stream;
    this.useWorkers = useWorkers;
    this.webgl = webgl;
    this.render = render;

    this.statistics = {
      videoStartTime: 0,
      videoPictureCounter: 0,
      windowStartTime: 0,
      windowPictureCounter: 0,
      fps: 0,
      fpsMin: 1000,
      fpsMax: -1000,
      webGLTextureUploadTime: 0
    };

    this.onStatisticsUpdated = function () {};

    this.avc = new Player({
      useWorker: useWorkers,
      reuseMemory: true,
      webgl: webgl,
      size: {
        width: 640,
        height: 368
      }
    });

    this.webgl = this.avc.webgl;

    var self = this;
    this.avc.onPictureDecoded = function(){
      updateStatistics.call(self);
    };

    this.canvas = this.avc.canvas;
  }

  function updateStatistics() {
    var s = this.statistics;
    s.videoPictureCounter += 1;
    s.windowPictureCounter += 1;
    var now = Date.now();
    if (!s.videoStartTime) {
      s.videoStartTime = now;
    }
    var videoElapsedTime = now - s.videoStartTime;
    s.elapsed = videoElapsedTime / 1000;
    if (videoElapsedTime < 1000) {
      return;
    }

    if (!s.windowStartTime) {
      s.windowStartTime = now;
      return;
    } else if ((now - s.windowStartTime) > 1000) {
      var windowElapsedTime = now - s.windowStartTime;
      var fps = (s.windowPictureCounter / windowElapsedTime) * 1000;
      s.windowStartTime = now;
      s.windowPictureCounter = 0;

      if (fps < s.fpsMin) s.fpsMin = fps;
      if (fps > s.fpsMax) s.fpsMax = fps;
      s.fps = fps;
    }

    var fps = (s.videoPictureCounter / videoElapsedTime) * 1000;
    s.fpsSinceStart = fps;
    this.onStatisticsUpdated(this.statistics);
    return;
  }

  constructor.prototype = {
    readAll: function(callback) {
      console.info("MP4Player::readAll()");
      this.stream.readAll(null, function (buffer) {
        this.reader = new MP4Reader(new Bytestream(buffer));
        this.reader.read();
        var video = this.reader.tracks[1];
        this.size = new Size(video.trak.tkhd.width, video.trak.tkhd.height);
        console.info("MP4Player::readAll(), length: " +  this.reader.stream.length);
        if (callback) callback();
      }.bind(this));
    },
    play: function() {
      var reader = this.reader;

      if (!reader) {
        this.readAll(this.play.bind(this));
        return;
      };

      var video = reader.tracks[1];
      var audio = reader.tracks[2];

      var avc = reader.tracks[1].trak.mdia.minf.stbl.stsd.avc1.avcC;
      var sps = avc.sps[0];
      var pps = avc.pps[0];

      /* Decode Sequence & Picture Parameter Sets */
      this.avc.decode(sps);
      this.avc.decode(pps);

      /* Decode Pictures */
      var pic = 0;
      setTimeout(function foo() {
        var avc = this.avc;
        video.getSampleNALUnits(pic).forEach(function (nal) {
          avc.decode(nal);
        });
        pic ++;
        if (pic < 3000) {
          setTimeout(foo.bind(this), 1);
        };
      }.bind(this), 1);
    }
  };

  return constructor;
})();

var Broadway = (function broadway() {
  function constructor(div) {
    var src = div.attributes.src ? div.attributes.src.value : undefined;
    var width = div.attributes.width ? div.attributes.width.value : 640;
    var height = div.attributes.height ? div.attributes.height.value : 480;

    var controls = document.createElement('div');
    controls.setAttribute('style', "z-index: 100; position: absolute; bottom: 0px; background-color: rgba(0,0,0,0.8); height: 30px; width: 100%; text-align: left;");
    this.info = document.createElement('div');
    this.info.setAttribute('style', "font-size: 14px; font-weight: bold; padding: 6px; color: lime;");
    controls.appendChild(this.info);
    div.appendChild(controls);

    var useWorkers = div.attributes.workers ? div.attributes.workers.value == "true" : false;
    var render = div.attributes.render ? div.attributes.render.value == "true" : false;

    var webgl = "auto";
    if (div.attributes.webgl){
      if (div.attributes.webgl.value == "true"){
        webgl = true;
      };
      if (div.attributes.webgl.value == "false"){
        webgl = false;
      };
    };

    var infoStrPre = "Click canvas to load and play - ";
    var infoStr = "";
    if (useWorkers){
      infoStr += "worker thread ";
    }else{
      infoStr += "main thread ";
    };

    this.player = new MP4Player(new Stream(src), useWorkers, webgl, render);
    this.canvas = this.player.canvas;
    this.canvas.onclick = function () {
      this.play();
    }.bind(this);
    div.appendChild(this.canvas);


    infoStr += " - webgl: " + this.player.webgl;
    this.info.innerHTML = infoStrPre + infoStr;


    this.score = null;
    this.player.onStatisticsUpdated = function (statistics) {
      if (statistics.videoPictureCounter % 10 != 0) {
        return;
      }
      var info = "";
      if (statistics.fps) {
        info += " fps: " + statistics.fps.toFixed(2);
      }
      if (statistics.fpsSinceStart) {
        info += " avg: " + statistics.fpsSinceStart.toFixed(2);
      }
      var scoreCutoff = 1200;
      if (statistics.videoPictureCounter < scoreCutoff) {
        this.score = scoreCutoff - statistics.videoPictureCounter;
      } else if (statistics.videoPictureCounter == scoreCutoff) {
        this.score = statistics.fpsSinceStart.toFixed(2);
      }
      // info += " score: " + this.score;

      this.info.innerHTML = infoStr + info;
    }.bind(this);
  }
  constructor.prototype = {
    play: function () {
      this.player.play();
    }
  };
  return constructor;
})();

export {
  Size,
  Track,
  MP4Reader,
  MP4Player,
  Bytestream,
  Broadway,
};
