/* exported AAMModel AAMController AAMView */
"use strict";

const AAMUndefinedKeyword = '__undefined__';

/* AAM is Attribute Annotation Mode with using keyboard only */
class AAMModel extends Listener  {
    constructor(labelsInfo, setActiveTrack, resetActiveTrack, focus) {
        super('onAAMUpdate', getState);
        this._activeAAM = false;
        this._labelsInfo = labelsInfo;
        this._currentTracks = [];
        this._activeTrack = null;
        this._curFrame = null;
        this._setActiveTrackCallback = setActiveTrack;
        this._resetActiveTrackCallback = resetActiveTrack;
        this._focus = focus;
        this._zoomBoxes = true;
        this._zoomMargin = 100;
        this._hideNonActive = true;

        this._attributeByLabel = new Object();
        this._titles = new Object();
        this._helps = new Object();

        let labels = labelsInfo.labels();
        for (let labelId in labels) {
            let attributes = labelsInfo.labelAttributes(labelId);

            this._attributeByLabel[labelId] = Object.keys(attributes).length ? 0 : null;
            for (let attrId in attributes) {
                this._titles[attrId] = labels[labelId].normalize() + ' : ' + attributes[attrId].normalize();
                this._helps[attrId] = [];

                let attrInfo = labelsInfo.attrInfo(attrId);
                switch (attrInfo.type) {
                case 'text':
                case 'number':
                    continue;
                case 'checkbox':
                    this._helps[attrId].push('0 - ' + attrInfo.values[0]);
                    this._helps[attrId].push('1 - ' + !attrInfo.values[0]);
                    break;
                default:
                    for (let idx = 0; idx < attrInfo.values.length; idx ++) {
                        if (idx > 9) break;
                        if (attrInfo.values[0] === AAMUndefinedKeyword) {
                            if (!idx) continue;
                            this._helps[attrId].push(idx - 1 + ' - ' + attrInfo.values[idx]);
                        }
                        else {
                            this._helps[attrId].push(idx + ' - ' + attrInfo.values[idx]);
                        }
                    }
                }   // switch
            }   // attribute for
        }   // label for

        let self = this;
        function getState() {
            return self;
        }
    }   // constructor


    _labelId() {
        if (this._activeTrack != null) {
            return this._currentTracks[this._activeTrack].label;
        }
        return null;
    }


    _attributeId() {
        let labelId = this._labelId();
        let attrKeys = Object.keys(this._labelsInfo.labelAttributes(labelId));
        let attrOrderIdx = this._attributeByLabel[labelId];
        if (attrOrderIdx != null) {
            return +attrKeys[attrOrderIdx];
        }
    }


    _updateActiveTrack(active) {
        if (this._activeTrack === null) return;
        let track = this._currentTracks[this._activeTrack];
        track.activeAAMTrack = active;
        track.hidden = !active && this._hideNonActive;
        if (active) {
            if (this._curFrame != null && this._zoomBoxes) {
                let pos = track.interpolate(this._curFrame).position;
                this._focus(pos.xtl - this._zoomMargin, pos.xbr + this._zoomMargin, pos.ytl - this._zoomMargin, pos.ybr + this._zoomMargin);
            }
            this._setActiveTrackCallback(track.id); // via track collection for occluded property
        }
        else {
            this._resetActiveTrackCallback();
        }
    }


    _updateActiveAttribute(active) {
        if (this._activeTrack === null) return;
        if (active) {
            let attrId = this._attributeId();
            if (Number.isInteger(+attrId)) {
                this._currentTracks[this._activeTrack].activeAttribute = attrId;
            }
        }
        else {
            this._currentTracks[this._activeTrack].activeAttribute = null;
        }
    }


    _switchHidden(value) {
        for (let idx = 0; idx < this._currentTracks.length; idx++) {
            this._currentTracks[idx].hidden = this._hideNonActive && value && (idx != this._activeTrack);
        }
    }


    switchAAM() {
        if (this._activeAAM) {
            this.disableAAM();
        }
        else {
            this.enableAAM();
        }
    }


    enableAAM() {
        this._activeAAM = true;
        this.notify();
        this._switchHidden(true);
        this._updateActiveAttribute(true);
        this._updateActiveTrack(true);
    }


    disableAAM() {
        this._activeAAM = false;
        this._updateActiveAttribute(false);
        this._updateActiveTrack(false);
        this._switchHidden(false);
        this.notify();
    }


    nextTrack(direction) {
        if (!this._activeAAM || !this._currentTracks.length) return;
        this._updateActiveAttribute(false);
        let newActiveTrack = this._activeTrack + 1 * direction;
        if (newActiveTrack < 0) {
            newActiveTrack = this._currentTracks.length - 1;
        }
        else if (newActiveTrack >= this._currentTracks.length) {
            newActiveTrack = 0;
        }
        this._updateActiveTrack(false);
        this._activeTrack = newActiveTrack;
        this._updateActiveTrack(true);
        this.nextAttribute(0);
    }


    nextAttribute(direction) {
        if (!this._activeAAM || !this._currentTracks.length) return;
        let labelId = this._labelId();
        let attributes = this._labelsInfo.labelAttributes(labelId);
        let numOfAttributes = Object.keys(attributes).length;
        let currentAttr = this._attributeByLabel[labelId];
        if (numOfAttributes >= 2) {
            currentAttr += 1 * direction;
            if (currentAttr < 0) {
                this._attributeByLabel[labelId] = numOfAttributes - 1;
            }
            else if (currentAttr >= numOfAttributes) {
                this._attributeByLabel[labelId] = 0;
            }
            else {
                this._attributeByLabel[labelId] = currentAttr;
            }
        }
        this._updateActiveAttribute(true);
        this.notify();     // notify for help update in view
    }


    setupAttributeValue(attrValueIndex) {
        if (!this._activeAAM || this._activeTrack === null) return;
        let labelId = this._labelId();
        let attrOrderIdx = this._attributeByLabel[labelId];
        if (attrOrderIdx === null) return;
        let attrId = this._attributeId();
        let attrInfo = this._labelsInfo.attrInfo(attrId);
        let values = attrInfo.values;
        if (attrInfo.type === 'text' || attrInfo.type === 'number') return;
        if (attrValueIndex >= values.length) {
            if (attrInfo.type === 'checkbox' && attrValueIndex < 2) {
                values.push(!values[0]);
            }
            else return;
        }
        if (values[0] === AAMUndefinedKeyword) {
            if (attrValueIndex >= values.length - 1) return;
            attrValueIndex ++;
        }
        this._currentTracks[this._activeTrack].recordAttribute(attrId, values[attrValueIndex]);
    }


    onCollectionUpdate(collection) {
        if (this._activeAAM) {
            this._updateActiveTrack(false);
            this._updateActiveAttribute(false);
            this._switchHidden(false);
        }

        this._currentTracks = [];
        this._curFrame = collection._curFrame;
        for (let track of collection.currentTracks) {
            if (!track.trackModel.removed) {
                this._currentTracks.push(track.trackModel);
            }
        }

        for (let track of this._currentTracks) {
            track.subscribe(this);
        }

        if (this._currentTracks.length) this._activeTrack = 0;
        else this._activeTrack = null;

        if (this._activeAAM) {
            this._switchHidden(true);
            this._updateActiveTrack(true);
            this._updateActiveAttribute(true);
        }
        this.notify();
    }


    onTrackUpdate(track) {
        if (track.model.removed) {
            let idx = this._currentTracks.indexOf(track.model);
            if (idx != -1) {
                this._currentTracks.splice(idx, 1);
                if (this._currentTracks.length) {
                    if (this._activeTrack != null) {
                        if (idx <= this._activeTrack && this._activeTrack > 0) this._activeTrack --;
                    }
                }
                else {
                    this._activeTrack = null;
                }
            }
        }
    }


    set zoomBoxes(value) {
        if (value != true && value != false) {
            throw new Error(`Input value must be boolean, but ${value} found.`);
        }
        this._zoomBoxes = value;
    }


    set hideNonActive(value) {
        if (value != true && value != false) {
            throw new Error(`Input value must be boolean, but ${value} found.`);
        }
        this._hideNonActive = value;
        if (this._activeAAM) {
            this._switchHidden(value);
        }
    }

    set zoomMargin(value) {
        value = Math.clamp(value, 0, 500);
        this._zoomMargin = value;
    }

    get zoomMargin() {
        return this._zoomMargin;
    }

    get activeAAM() {
        return this._activeAAM;
    }


    get helps() {
        let title = '';
        let helps = [];
        let counter = '0/0';
        let label = this._labelId();
        if (label != null) {
            counter = (this._activeTrack + 1) + '/' + this._currentTracks.length;
            let attrOrderIdx = this._attributeByLabel[label];
            if (attrOrderIdx != null) {
                let attrId = this._attributeId();
                title = this._titles[attrId];
                helps = this._helps[attrId].slice();
            }
        }

        return [title, helps, counter];
    }


    get activeAttribute() {
        let labelId = this._labelId();
        if (labelId === null) return [null];

        let activeTrack = this._currentTracks[this._activeTrack];
        let activeTrackId = activeTrack.id;

        let attrOrderIdx = this._attributeByLabel[labelId];
        if (attrOrderIdx === null) return [null];

        let attrId = this._attributeId();
        let attrInfo = this._labelsInfo.attrInfo(attrId);

        return [activeTrackId, attrInfo.type, attrInfo.name];
    }


    get zoomBoxes() {
        return this._zoomBoxes;
    }

    get hideNonActive() {
        return this._hideNonActive;
    }
}



class AAMController {
    constructor(model) {
        this._model = model;
        setupAAMShortkeys.call(this);

        function setupAAMShortkeys() {
            let switchAAMHandler = Logger.shortkeyLogDecorator(function() {
                this._model.switchAAM();
            }.bind(this));

            let nextAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.nextAttribute(1);
                e.preventDefault();
            }.bind(this));

            let prevAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.nextAttribute(-1);
                e.preventDefault();
            }.bind(this));

            let nextTrackHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.nextTrack(1);
                e.preventDefault();
            }.bind(this));

            let prevTrackHandler = Logger.shortkeyLogDecorator(function(e) {
                this._model.nextTrack(-1);
                e.preventDefault();
            }.bind(this));

            let selectAttributeHandler = Logger.shortkeyLogDecorator(function(e) {
                let key = e.keyCode;
                if (key >= 48 && key <= 57) key -= 48;  // 0 and 9
                else if (key >= 96 && key <= 105) key -= 96; // num 0 and 9
                else return;
                this._model.setupAttributeValue(key);
            }.bind(this));

            let shortkeys = userConfig.shortkeys;

            Mousetrap.bind(shortkeys["switch_aam_mode"].value, switchAAMHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_next_attribute"].value, nextAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_prev_attribute"].value, prevAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_next_track"].value, nextTrackHandler, 'keydown');
            Mousetrap.bind(shortkeys["aam_prev_track"].value, prevTrackHandler, 'keydown');
            Mousetrap.bind(shortkeys["select_i_attribute"].value.split(','), selectAttributeHandler, 'keydown');
        }
    }

    zoomMargin(value) {
        this._model.zoomMargin = value;
    }

    zoomBoxes(value) {
        this._model.zoomBoxes = value;
    }

    hideNonActive(value) {
        this._model.hideNonActive = value;
    }
}


class AAMView {
    constructor(model, controller) {
        this._controller = controller;
        this._trackManagementMenu = $('#trackManagement');
        this._aamMenu = $('#aamMenu');
        this._aamTitle = $('#aamTitle');
        this._aamCounter = $('#aamCounter');
        this._aamHelpContainer = $('#aamHelpContainer');
        this._removeAnnotationButton = $('#removeAnnotationButton');
        this._zoomBoxesBox = $('#zoomAAMBoxesBox');
        this._hideNonActiveBox = $('#hideNonActiveBox');
        this._zoomMargin = $('#aamZoomMargin');

        this._zoomBoxesBox.prop('checked', model.zoomBoxes);
        this._zoomBoxesBox.on('change', function(e) {
            let value = e.target.checked;
            this._controller.zoomBoxes(value);
        }.bind(this));

        this._zoomMargin.prop('checked', model.zoomMargin);
        this._zoomMargin.on('change', function(e) {
            let value = +e.target.value;
            this._controller.zoomMargin(value);
        }.bind(this));

        this._hideNonActiveBox.prop('checked', model.hideNonActive);
        this._hideNonActiveBox.on('change', function(e) {
            let value = e.target.checked;
            this._controller.hideNonActive(value);
        }.bind(this));

        model.subscribe(this);
    }


    _blurAll(){
        var tmp = document.createElement("input");
        document.body.appendChild(tmp);
        tmp.focus();
        document.body.removeChild(tmp);
    }


    onAAMUpdate(aam) {
        if (aam.activeAAM && this._aamMenu.hasClass('hidden')) {
            this._trackManagementMenu.addClass('hidden');
            this._aamMenu.removeClass('hidden');
            this._removeAnnotationButton.prop('disabled', true);
        }
        else if (!aam.activeAAM) {
            this._blurAll();
            window.getSelection().removeAllRanges();
            this._aamMenu.addClass('hidden');
            this._trackManagementMenu.removeClass('hidden');
            this._removeAnnotationButton.prop('disabled', false);
            return;
        }
        let [title, helps, counter] = aam.helps;
        this._aamTitle.text(title);
        this._aamCounter.text(counter);
        this._aamHelpContainer.empty();

        let table = $('<table></table>').css({
            'width': '100%',
            'text-align': 'left'
        }).appendTo(this._aamHelpContainer);
        while (helps.length) {
            let row = $('<tr></tr>').appendTo(table);
            let first = helps.shift();
            let second = helps.shift();
            row.append(`<td>${first}</td>`);
            if (second) {
                row.append(`<td>${second}</td>`);
            }
        }
        for (let help of helps) {
            let helpView = $(`<label> ${help} </label>`).addClass('regular');
            helpView.appendTo(this._aamHelpContainer);
            $('<br>').appendTo(this._aamHelpContainer);
        }

        let [activeTrackId, type, name] = aam.activeAttribute;
        if (activeTrackId === null) return;

        switch (type) {
        case 'text': {
            let text = $(`#${activeTrackId}_${name}_text`)[0];
            text.focus();
            text.select();
            break;
        }
        case 'number': {
            let number = $(`#${activeTrackId}_${name}_number`)[0];
            number.focus();
            number.select();
            break;
        }
        default:
            this._blurAll();
            window.getSelection().removeAllRanges();
        }
    }
}
