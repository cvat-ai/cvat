/*exported CollectionView */
"use strict";

class CollectionView {
    constructor(collectionController, collectionModel, playerModel, labelsInfo) {
        this._frameContent = $('#frameContent');
        this._createTrackButton = $('#createTrackButton');
        this._mergeTracksButton = $('#mergeTracksButton');
        this._labelSelect = $('#labelSelect');
        this._trackTypeSelect = $('#trackTypeSelect');
        this._hideBoxesCheck = $('#hideBoxesBox');
        this._hideLabelsCheck = $('#hideLabelsBox');
        this._showAllInterBox = $('#showAllInterBox');
        this._uiContent = $('#uiContent');
        this._collectionController = collectionController;
        this._playerScale = 1;
        this._revPlayerScale = 1;
        this._tracks = [];
        this._labelsInfo = labelsInfo;
        this._playerModel = playerModel;

        this._hideLabelsCheck.prop('checked', true);
        this._showAllInterBox.prop('checked', collectionModel.allInterTracks);
        playerModel.subscribe(this);
        collectionModel.subscribe(this);

        this._frameContent.on('mousemove', collectionController.onmousemove.bind(collectionController));
        this._hideBoxesCheck.on('change', this.hideBoxes.bind(this));
        this._hideLabelsCheck.on('change', this.hideLabels.bind(this));
        this._showAllInterBox.on('change', (e) => collectionController.setShowAllInterTracks(e.target.checked));
    }

    hideBoxes(e) {
        let value = e.target.checked;
        this._collectionController.setHiddenForAll(value);
    }

    hideLabels(e) {
        let value = e.target.checked;
        this._collectionController.setHiddenLabelForAll(value);
    }


    onPlayerUpdate(player) {
        let geometry = player.geometry;
        let frames = player.frames;

        if (this._playerScale != geometry.scale) {
            this._playerScale = geometry.scale;
            this._revPlayerScale = 1 / geometry.scale;
            for (let i = 0; i < this._tracks.length; i ++ ) {
                this._tracks[i].view.revscale = this._revPlayerScale;
                this._tracks[i].view.updateViewGeometry();
            }
            this._collectionController.playerScale = this._playerScale;
        }

        if (frames.previous != frames.current) {
            this._collectionController.onchangeframe(frames.current);
        }
    }

    onCollectionUpdate(collection) {
        let offset = this._uiContent.prop('scrollTop');
        let numOfTracksBefore = this._tracks.length;

        for (let i = 0; i < this._tracks.length; i ++) {
            this._tracks[i].view.removeView();
        }
        this._tracks = [];
        this._frameContent.find('defs').remove();
        this._frameContent.find('rect.outsideRect').remove();

        let newcollection = collection.currentTracks;
        newcollection.sort(trackComparator);


        for (let i = 0; i < newcollection.length; i ++ ) {
            let interpolation = newcollection[i].interpolation;
            let trackModel = newcollection[i].trackModel;
            let colors = trackModel.colors;
            let trackController = new TrackController(trackModel);
            let trackView = new TrackView(trackController, trackModel, interpolation, this._labelsInfo, colors);
            trackModel.notify();
            trackView.revscale = this._revPlayerScale;
            trackView.updateViewGeometry();
            trackView.onoverUI = (id, e) => this._collectionController.setactivetrack(id, e);
            trackView.onoutUI = (e) => this._collectionController.resetactivetrack(e);
            trackView.onshift = (frame) => this._playerModel.shift(frame, true);
            trackView.onchangelabel = function(trackModel, newLabelId) {
                trackModel.reinitialize(newLabelId);
                this._collectionController.updateFrame();
            }.bind(this);

            this._tracks.push({
                model: trackModel,
                controller: trackController,
                view: trackView
            });
        }

        if (numOfTracksBefore === this._tracks.length && !collection.frameChanged) {
            this._uiContent.prop('scrollTop', offset);
        }

        function trackComparator(a,b) {
            return b.trackModel.id - a.trackModel.id;
        }
    }

    onstartdraw() {
        this._createTrackButton.prop('disabled', true);
        this._mergeTracksButton.prop('disabled', true);
        this._labelSelect.prop('disabled', true);
        this._trackTypeSelect.prop('disabled', true);
        this._frameContent.css('cursor', 'crosshair');
    }

    onDrawerUpdate(drawer) {
        if (drawer.drawMode && !drawer.clicks.length) {
            this.lockChange(true);
        }
        else if (!drawer.drawMode) {
            this.lockChange(false);
        }
    }

    lockChange(value) {
        if (value) {
            for (let track of this._tracks) {
                track.view._shape.removeClass('changeable');
            }
        }
        else {
            for (let track of this._tracks) {
                track.view._shape.addClass('changeable');
            }
        }
    }
}
