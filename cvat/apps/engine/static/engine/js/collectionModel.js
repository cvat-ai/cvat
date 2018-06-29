/* exported CollectionModel */
"use strict";

class CollectionModel extends Listener {
    constructor(labelsInfo, job, trackFilterModel) {
        super('onCollectionUpdate', getState);
        this._labelsInfo = labelsInfo;
        this._curFrame = null;
        this._frameChanged = false;
        this._stopFrame = job.stop;
        this._startFrame = job.start;
        this._trackCounter = 0;
        this._allTracks = [];
        this._annotationTracks = new Object();
        this._interpolationTracks = new Object();
        this._currentTracks = [];
        this._activeTrack = null;
        this._drawing = false;
        this._allInterTracks = false;
        this._trackFilter = trackFilterModel;
        this._trackFilter._updateCollection = () => this.update();

        this._colorIndex = 0;
        this._colorSets = {
            background: ["#FFFFCC", "#FFFF66", "#FFCC66", "#FF9900", "#FF6633", "#FF6666", "#FF9999",
                "#FF6699", "#27EBF9", "#FF99CC", "#FF99FF", "#CC66FF", "#CC99FF", "#16E532",
                "#6666FF", "#0099FF", "#66CCCC", "#99FFFF", "#99FFCC", "#66FF99", "#CCFF99"],

            border: ["#FFFF66", "#FFFF00", "#FFCC00", "#FF6600", "#FF3300", "#CC0033", "#FF3333",
                "#FF0066", "#4EF0FC", "#CC0066", "#FF00FF", "#9900CC", "#9933FF", "#02F423",
                "#3300CC", "#0033FF", "#006666", "#00CCCC", "#00FFCC", "#00FF66", "#66CC00"],

            length: 21
        };

        let self = this;
        function getState() {
            return self;
        }
    }


    _interpolate(tracks, frame) {
        let result = [];
        for (let trackId in tracks) {
            let track = tracks[trackId];
            if (track.removed) continue;
            let interpolation = track.interpolate(frame);

            let outsided = interpolation.position.outsided;
            /* !outsided is provide the adding all tracks with non-outsided box
             * track.isKeyFrame(frame) is provide the adding tracks if frame is keyframe (needed in cases when track become outsided on this frame)
             * this._allInterTracks is provide the adding any tracks (in mode when right panel show all tracks)  */
            if (!outsided || track.isKeyFrame(frame) || this._allInterTracks) {
                result.push({
                    trackModel: track,
                    interpolation: interpolation
                });
            }
        }
        return result;
    }

    collectStatistic() {
        let statByLabel = new Object();
        let labels = this._labelsInfo.labels();

        for (let labelId in labels) {
            let labelName =labels[labelId];
            statByLabel[labelName] = {
                tracks: 0,
                manuallyShapes: 0,
                interpolatedShapes: 0
            };
        }

        for (let track of this._allTracks) {
            if (!track.removed) {
                track.getStatToObject(statByLabel);
            }
        }

        let totalTracks = 0;
        let totalManually = 0;
        let totalInterpolated = 0;

        for (let key in statByLabel) {
            totalTracks += statByLabel[key].tracks;
            totalManually += statByLabel[key].manuallyShapes;
            totalInterpolated += statByLabel[key].interpolatedShapes;
        }

        Object.defineProperty(statByLabel, 'totalObjectCount', {
            enumerable: false,
            value: {
                tracks: totalTracks,
                manuallyShapes: totalManually,
                interpolatedShapes: totalInterpolated
            }
        });

        return statByLabel;
    }

    removeTracks() {
        for (let i = 0; i < this._allTracks.length; i ++) {
            this._allTracks[i].remove(true);
        }
        this._allTracks = [];
        this._annotationTracks = new Object();
        this._interpolationTracks = new Object();
        this._currentTracks = [];
        this._activeTrack = null;
        this._trackCounter = 0;
        this.notify();
    }

    importTracks(data) {
        let tracks = [];
        for (let box of data.boxes) {
            let box0 = [box.xtl, box.ytl, box.xbr, box.ybr, box.frame, false, box.occluded];
            let box1 = box0.slice();
            box1[4] += 1;   // next frame
            box1[5] = true; // outside property

            let attributes = [];
            for (let attr of box.attributes) {
                attributes.push([attr.id, box.frame, attr.value]);
            }

            tracks.push({
                label: box.label_id,
                boxes: [box0, box1],
                attributes: attributes
            });
        }

        for (let track of data.tracks) {
            let attributes = [];
            for (let attr of track.attributes) {
                attributes.push([attr.id, 0, attr.value]);
            }

            let boxes = [];
            for (let box of track.boxes) {
                boxes.push([box.xtl, box.ytl, box.xbr, box.ybr, box.frame,
                    box.outside, box.occluded]);
                for (let attr of box.attributes) {
                    attributes.push([attr.id, box.frame, attr.value]);
                }
            }

            tracks.push({
                label: track.label_id,
                boxes: boxes,
                attributes: attributes
            });
        }

        for (let i = 0; i < tracks.length; i ++) {
            if (!tracks[i].boxes.length) continue;    // Remove saved wrong tracks with empty path
            this.add(tracks[i]);
        }
    }

    exportTracks() {
        let response = {"boxes": [], "tracks": []};
        for (let i = 0; i < this._allTracks.length; i ++ ) {
            let track = this._allTracks[i];
            // !Number.isInteger(track._firstFrame) need for remove fully outsided tracks. First frame for such tracks is undefined.
            if (track.removed || !Number.isInteger(track._firstFrame)) continue;
            if (track.trackType == "annotation") {
                response["boxes"].push(track.export());
            } else {
                response["tracks"].push(track.export());
            }

        }
        return JSON.stringify(response);
    }

    add(data) {
        let colors = this.getColors();
        let trackModel = new TrackModel('box', data, this._trackCounter,
            this._labelsInfo, this._stopFrame, this._startFrame, colors);
        let trackType = trackModel.trackType;
        if (trackType === 'interpolation') {
            this._interpolationTracks[this._trackCounter] = trackModel;
        }
        else {
            let firstFrame = trackModel.firstFrame;
            if (! (firstFrame in this._annotationTracks)) {
                this._annotationTracks[firstFrame] = new Object();
            }
            this._annotationTracks[firstFrame][this._trackCounter] = trackModel;
        }
        this._allTracks.push(trackModel);
        this._trackCounter ++;
    }


    createFromPos(pos, label, type) {
        let boxes = [];

        let current = [pos.xtl, pos.ytl, pos.xbr, pos.ybr, this._curFrame, 0, 0];
        boxes.push(current);

        if (type === 'annotation') {
            let next = [pos.xtl, pos.ytl, pos.xbr, pos.ybr, this._curFrame + 1, 1, 0];
            boxes.push(next);
        }

        this.add({
            attributes: [],
            boxes: boxes,
            label: label
        });

        this.onchangeframe(this._curFrame);
    }


    update() {
        if (this._curFrame != null) {
            this.onchangeframe(this._curFrame);
        }
    }

    onchangeframe(newframe) {
        for (let i = 0; i < this._currentTracks.length; i ++ ) {
            this._currentTracks[i].trackModel.active = false;
            this._currentTracks[i].trackModel.unsubscribeAll();
        }
        this._currentTracks = [];
        this._activeTrack = null;
        this._frameChanged = this._curFrame != newframe;
        this._curFrame = newframe;

        let annotationTracks = [];
        let interpolationTracks = [];

        if (newframe in this._annotationTracks) {
            for (let trackId in this._annotationTracks[newframe]) {
                this._annotationTracks[newframe][trackId].curFrame = newframe;
            }
            annotationTracks = this._interpolate(this._annotationTracks[newframe], newframe);
        }

        for (let trackId in this._interpolationTracks) {
            this._interpolationTracks[trackId].curFrame = newframe;
        }
        interpolationTracks = this._interpolate(this._interpolationTracks, newframe);
        this._currentTracks = annotationTracks.concat(interpolationTracks);
        this._trackFilter.filter(this._currentTracks);
        this.notify();
    }


    findFilterFrame(direction) {
        if (direction != 1 && direction != -1) {
            throw Error('Bad direction value: ', direction);
        }
        let frame = this._curFrame;
        while (frame <= this._stopFrame && frame >= this._startFrame) {
            frame += direction;
            if (frame in this._annotationTracks) {
                let annotationTracks = this._interpolate(this._annotationTracks[frame], frame);
                let filteredIndexes = this._trackFilter.filter(annotationTracks);
                if (filteredIndexes.length) return frame;
            }
            let interpolationTracks = this._interpolate(this._interpolationTracks, frame);
            let filteredIndexes = this._trackFilter.filter(interpolationTracks);
            if (filteredIndexes.length) return frame;
        }
        return null;
    }

    updateFrame() {
        if (this._curFrame != null) {
            this.onchangeframe(this._curFrame);
        }
    }

    switchLockForActive() {
        if (this._activeTrack != null) {
            let value = this._allTracks[this._activeTrack].lock;
            this._allTracks[this._activeTrack].lock = !value;
            Logger.addEvent(Logger.EventType.lockObject, {value: !value, mode: 'single object'});
        }
    }

    switchLockForAll() {
        let value = true;
        for (let track of this._currentTracks) {
            value = value && track.trackModel.lock;
            if (!value) break;
        }

        for (let track of this._currentTracks) {
            track.trackModel.lock = !value;
        }

        if (this._currentTracks.length > 0) {
            Logger.addEvent(Logger.EventType.lockObject, {value: !value, mode: 'multy object'});
        }
    }

    switchOccludedForActive() {
        if (this._activeTrack != null) {
            this._allTracks[this._activeTrack].occluded ^= true;
        }
    }

    switchColorForActive() {
        if (this._activeTrack != null) {
            this._allTracks[this._activeTrack].colors = this.getColors();
        }
    }

    setHiddenForAll(value) {
        for (let track of this._allTracks) {
            track.hidden = value;
        }
    }

    setHiddenLabelForAll(value) {
        for (let track of this._allTracks) {
            track.hiddenLabel = value;
        }
    }

    reinitializeActive(newLabelIdx) {
        let keys = Object.keys(this._labelsInfo.labels());
        if (this._activeTrack != null && newLabelIdx < keys.length) {
            this._allTracks[this._activeTrack].reinitialize(keys[newLabelIdx]);
            this.updateFrame();
        }
    }

    setactivetrack(trackID) {
        if (trackID != this._activeTrack) {
            this.resetactivetrack();
            this._activeTrack = trackID;
            this._allTracks[this._activeTrack].active = true;
        }
    }

    resetactivetrack() {
        if (this._activeTrack != null) {
            this._allTracks[this._activeTrack].active = false;
            this._activeTrack = null;
        }
    }

    removeactivetrack(force) {
        if (this._activeTrack != null) {
            this._allTracks[this._activeTrack].remove(force);
        }
    }

    onmousemove(x, y, modKeysStates) {
        if (this._activeTrack != null && modKeysStates.ctrl) return;
        let activeTrack = null;
        let minArea = Number.MAX_SAFE_INTEGER;
        this._currentTracks.forEach((item) => {
            if (item.trackModel.removed) return;
            let pos = item.trackModel._shape.interpolatePosition(this._curFrame, item.trackModel.firstFrame);
            let type = item.trackModel.shapeType;
            if (pos.outsided || item.trackModel.hidden) return;
            if (TrackModel.ShapeContain(pos, x, y, type)) {
                let area = TrackModel.ShapeArea(pos, type);
                if (area < minArea || this._allTracks[activeTrack].lock) {
                    if (activeTrack != null) {
                        if (!this._allTracks[activeTrack].lock && this._allTracks[item.trackModel.id].lock) {
                            return;
                        }
                    }
                    minArea = area;
                    activeTrack = item.trackModel.id;
                }
            }
        });
        if (activeTrack != null) {
            this.setactivetrack(activeTrack);
        }
        else this.resetactivetrack();
        return activeTrack;
    }

    getColors() {
        let oldColorIndex = this._colorIndex;
        this._colorIndex ++;
        if (this._colorIndex >= this._colorSets.length) {
            this._colorIndex = 0;
        }
        var colors = {
            background: this._colorSets.background[oldColorIndex],
            border: this._colorSets.border[oldColorIndex]
        };
        return colors;
    }

    set allInterTracks(value) {
        if (value != true && value != false) {
            throw new Error(`Value must be boolean, but ${typeof(value)} extracted.`);
        }
        this._allInterTracks = value;
        this.update();
    }

    get currentTracks() {
        return this._currentTracks;
    }

    get activeTrack() {
        if (this._activeTrack != null) {
            return this._allTracks[this._activeTrack];
        }
        else return null;
    }

    get allTracks() {
        return this._allTracks;
    }

    get frameChanged() {
        return this._frameChanged;
    }

    get allInterTracks() {
        return this._allInterTracks;
    }

    getHash() {
        return objectHash.sha1(this.exportTracks());
    }
}
