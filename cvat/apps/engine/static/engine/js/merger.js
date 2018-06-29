/* exported MergerModel MergerController MergerView */
"use strict";

class MergerModel extends Listener {
    constructor(trackCollection) {
        super('onMergerUpdate', getState);
        this._mergeMode = false;
        this._mergeTracks = new Object();
        this._curTracks = [];
        this._trackCollection = trackCollection;
        this._checkStatus = null;
        this._mergeCounter = 0;
        this._drawMode = false;
        this._pasteMode = false;
        this._AAM = false;

        trackCollection.subscribe(this);

        let self = this;
        function getState() {
            return self;
        }
    }

    checkTracks() {
        let labels = new Object();
        let newJournal = new Object();
        let multipleBoxes = false;

        for (let key in this._mergeTracks) {
            let track = this._mergeTracks[key];
            if (track.label in labels) {
                labels[track.label] ++;
            }
            else {
                labels[track.label] = 1;
            }

            let positionJournal = track.journal;
            let prevPosition = null;
            for (let frame in positionJournal) {
                let addedPos = positionJournal.clone(frame);
                if (prevPosition && equalPos(prevPosition, addedPos)) {
                    continue;
                }
                prevPosition = addedPos;

                if (frame in newJournal) {
                    let storedPos = newJournal[frame];
                    if (storedPos.outsided) {
                        if (!addedPos.outsided) {
                            newJournal[frame] = addedPos;
                        }
                    }
                    else if (!addedPos.outsided) {
                        multipleBoxes = true;
                    }
                }
                else {
                    newJournal[frame] = addedPos;
                }
            }
        }

        let journal = [];
        for (let key in newJournal) {
            let pos = newJournal[key];
            journal.push([pos.xtl, pos.ytl, pos.xbr, pos.ybr, +key, pos.outsided, pos.occluded]);
        }

        this._checkStatus = {
            labels: labels,
            journal: journal,
            multipleBoxes: multipleBoxes
        };

        this.notify();

        function equalPos(first, second) {
            return (first.xtl === second.xtl && first.xbr === second.xbr &&
                    first.ytl === second.ytl && first.ybr === second.ybr &&
                    first.occluded === second.occluded && first.outsided === second.outsided);
        }
    }

    enableMergeMode() {
        if (this._drawMode || this._pasteMode || this._AAM) return;
        this._mergeMode = true;
        this.notify();
    }

    disableMergeMode() {
        if (Object.keys(this._mergeTracks).length > 1) {
            this.checkTracks();
        }
        else {
            this.resetState();
        }
    }

    resetState() {
        for (let key in this._mergeTracks) {
            this._mergeTracks[key].merge = false;
        }

        this._mergeTracks = new Object();
        this._mergeMode = false;
        this._checkStatus = null;
        this._mergeCounter = 0;
        this.notify();
    }

    applyMerge(label, positionJournal) {
        let attributeJournal = [];
        let mutableJournal = new Object();
        let immutableFilled = false;

        for (let key in this._mergeTracks) {
            let track = this._mergeTracks[key];

            if (track.label === label) {
                if (!immutableFilled) { /* Fill immutable attributes from first track */
                    immutableFilled = true;
                    let immutableAttributes = track.attributes.immutable;
                    for (let attrKey in immutableAttributes) {
                        attributeJournal.push([+attrKey, 0, immutableAttributes[attrKey]]);
                    }
                }

                let mutableAttributes = track.attributes.mutable;
                for (let attrId in mutableAttributes) {
                    if (!(attrId in mutableJournal)) {
                        mutableJournal[attrId] = new Object();
                    }
                    for (let frame in mutableAttributes[attrId]) {
                        let value = mutableAttributes[attrId][frame];
                        if (!(frame in mutableJournal[attrId])) {
                            /* Add only if not exists */
                            mutableJournal[attrId][frame] = value;
                        }
                    }
                }
            }

            track.remove();
        }

        /* Sort each attributeId journal and append to main journal */
        for (let attrId in mutableJournal) {
            let original = mutableJournal[attrId];
            let sorted = sortJournalByFrame(original);
            let prevValue = null;
            for (let frame in sorted) {
                let value = sorted[frame];
                if (prevValue != value) {
                    attributeJournal.push([+attrId, +frame, value]);
                }
                prevValue = value;
            }
        }


        function sortJournalByFrame(journal) {
            let sorted = new Object();
            let frames = [];
            for (let frame in journal) {
                frames.push(+frame);
            }

            frames.sort(frameComp);

            for (let frame of frames) {
                sorted[frame] = journal[frame];
            }

            return sorted;


            function frameComp(a,b) {
                return a - b;
            }
        }

        this.resetState();
        this._trackCollection.add({
            attributes: attributeJournal,
            boxes: positionJournal,
            label: label
        });
        this._trackCollection.updateFrame();
    }

    onTrackUpdate(trackState) {
        let trackModel = trackState.model;
        if (this._mergeMode && trackState.selected) {
            let key = Object.keys(this._mergeTracks).find(equalModels.bind(this));
            if (key != undefined) {
                delete this._mergeTracks[key];
                trackModel.merge = false;
                this._mergeCounter --;
            }
            else {
                this._mergeTracks[this._mergeCounter] = trackModel;
                trackModel.merge = true;
                this._mergeCounter ++;
            }
        }

        function equalModels(element) {
            return this._mergeTracks[element].id === trackModel.id;
        }
    }

    onCollectionUpdate(collection) {
        this._curTracks = [];
        for (let track of collection.currentTracks) {
            this._curTracks.push(track.trackModel);
            track.trackModel.subscribe(this);
        }
    }

    onDrawerUpdate(drawer) {
        this._drawMode = drawer.drawMode;
    }

    onBufferUpdate(buffer) {
        this._pasteMode = buffer.pasteMode;
    }

    onAAMUpdate(aam) {
        this._AAM = aam.activeAAM;
        if (this._AAM && this._mergeMode) {
            this.resetState();
        }
    }

    get mergeMode() {
        return this._mergeMode;
    }

    get checkStatus() {
        return this._checkStatus;
    }
}



class MergerController {
    constructor(mergerModel) {
        this._model = mergerModel;
        setupMergerShortkeys.call(this);

        function setupMergerShortkeys() {
            let mergeHandler = Logger.shortkeyLogDecorator(function() {
                this.onMergePressed();
            }.bind(this));

            let cancelHandler = Logger.shortkeyLogDecorator(function() {
                this._model.resetState();
            }.bind(this));

            let shortkeys = userConfig.shortkeys;

            Mousetrap.bind(shortkeys["switch_merge_mode"].value, mergeHandler, 'keydown');
            Mousetrap.bind(shortkeys["cancel_merge_mode"].value, cancelHandler, 'keydown');
        }
    }

    onMergePressed() {
        if (!this._model.mergeMode) {
            this._model.enableMergeMode();
        }
        else {
            this._model.disableMergeMode();
        }
    }

    applyMerge(targetLabel, positionJournal) {
        this._model.applyMerge(targetLabel, positionJournal);
    }
}



class MergerView {
    constructor (mergerModel, mergerController) {
        this._mergeButton = $('#mergeTracksButton');
        this._controller = mergerController;

        this._mergeButton.on('click', () => this._controller.onMergePressed.call(this._controller));

        mergerModel.subscribe(this);
    }

    onMergerUpdate(merger) {
        if (merger.mergeMode) {
            this._mergeButton.text('Apply Merge');
            let checkStatus = merger.checkStatus;
            if (checkStatus != null) {
                let journal = checkStatus.journal;
                let label = null;

                if (Object.keys(checkStatus.labels).length > 1) {
                    label = +$('#labelSelect').prop('value');
                }
                else {
                    label = +Object.keys(checkStatus.labels)[0];
                }

                if (checkStatus.multipleBoxes) {
                    let message = 'Some frames contains several boxes. Continue?';
                    let onagree = function() {
                        this._controller.applyMerge(label, journal);
                    }.bind(this);

                    confirm(message, onagree);
                    return;
                }

                this._controller.applyMerge(label, journal);
            }
        }
        else {
            this._mergeButton.text('Merge Tracks');
        }
    }

    onDrawerUpdate(drawer) {
        this._mergeButton.prop('disabled', drawer.drawMode);
    }
}
