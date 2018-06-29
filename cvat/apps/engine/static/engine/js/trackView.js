/* exported TrackView */
"use strict";

class TrackView {
    constructor(trackController, trackModel, interpolation, labelsInfo, colors) {
        this._trackController = trackController;
        this._framecontent = $('#frameContent');
        this._uicontent = $('#uiContent');
        this._revscale = 1;
        this._shape = TrackView.makeShape(interpolation.position, trackModel.shapeType, colors);
        this._text = TrackView.makeText(interpolation, labelsInfo.labels()[trackModel.label], trackModel.id);
        this._ui = TrackView.makeUI(interpolation, labelsInfo, colors, trackModel);
        this._ui.appendTo(this._uicontent);
        this._shape.appendTo(this._framecontent);
        this._text.appendTo(this._framecontent);
        this._outsideShape = null;

        this._shape.on('resize drag', function(event, scale) {
            let type = event.type === 'drag' ? Logger.EventType.dragObject : Logger.EventType.resizeObject;
            let modifyObjEvent = Logger.addContinuedEvent(type);
            this._revscale = 1 / scale;
            this.updateViewGeometry();
            this._trackController.onchangegeometry(this._shape);
            modifyObjEvent.close();
        }.bind(this));

        this._shape.on('mousedown', function() {
            this._trackController.onclick();
            this._uicontent.scrollTop(0);
            this._uicontent.scrollTop(this._ui.offset().top - 10);
        }.bind(this));

        this._ui.on('mouseover', (e) => this.onoverUI(trackModel.id, e));
        this._ui.on('mouseout', (e) => this.onoutUI(e));
        this._ui.onchangelabel = (trackModel, newLabelId) => this.onchangelabel(trackModel, newLabelId);
        this._ui.onshift = function(frame) {
            this.onshift(frame);
        }.bind(this);


        trackModel.subscribe(this);
    }

    _drawOutsideShape() {
        let size = {
            x: 0,
            y: 0,
            width: 10000,
            height: 10000
        };

        let defs = $(this._framecontent.find('defs')[0] || document.createElementNS('http://www.w3.org/2000/svg', 'defs'))
            .prependTo(this._framecontent).append();

        let mask = $(document.createElementNS('http://www.w3.org/2000/svg', 'mask'))
            .attr(Object.assign({}, size, {id: 'outsideMask'})).appendTo(defs);

        $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))   // exclude from mask
            .attr(Object.assign({}, size, {fill: '#555'})).appendTo(mask);

        $(document.createElementNS('http://www.w3.org/2000/svg', 'rect')).attr({    // include to mask
            x: this._shape.attr('x'),
            y: this._shape.attr('y'),
            height: this._shape.attr('height'),
            width: this._shape.attr('width'),
            fill: 'black',
        }).appendTo(mask);

        $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))
            .attr(Object.assign(size, {mask: 'url(#outsideMask)'}))
            .addClass('outsideRect')
            .appendTo(this._framecontent);
    }

    _removeOutsideShape() {
        this._framecontent.find('defs').remove();
        this._framecontent.find('rect.outsideRect').remove();
    }

    onTrackUpdate(state) {
        this._removeOutsideShape();
        if (state.removed) {
            this.removeView();
            return;
        }

        if (state.model.outside || state.model.hidden) {
            this._shape.detach();
        }
        else {
            this._shape.updatePos(state.position);
            this._framecontent.append(this._shape);
        }

        this.updateColors(state.model.colors, state.model.merge);

        this._ui.lock(state.lock);
        if (state.lock) {
            this._shape.addClass('lockedShape');
            this._shape.removeClass('highlightedShape');
            this._shape.removeClass('changeable');

            this._text.addClass('lockedText');
            this._ui.removeClass('highlightedUI');
        }
        else {
            this._shape.removeClass('lockedShape');
            this._text.removeClass('lockedText');
        }

        if (!(state.model.hiddenLabel || state.model.outside || state.model.hidden)) {
            this._text.appendTo(this._framecontent);
        }
        else {
            this._text.detach();
        }

        if (state.active && !(state.lock || state.model.outside || state.model.hidden)) {
            this._shape.addClass('highlightedShape');
            if (this._framecontent.has(this._shape)) {
                this._shape.appendTo(this._framecontent);
            }
            this._ui.addClass('highlightedUI');
            this._framecontent.append(this._text);
            this.updateAndViewText(state);
        }
        else if (state.active) {
            this._ui.addClass('highlightedUI');
        }
        else {
            this._shape.removeClass('highlightedShape');
            this._ui.removeClass('highlightedUI');
        }

        if (state.model.activeAAMTrack) {
            if (state.active) {
                this._ui.updateAttributes(state.attributes);
            }
            this._drawOutsideShape();
            this._shape.css('fill-opacity', '0');
            this._uicontent.scrollTop(0);
            this._uicontent.scrollTop(this._ui.offset().top - 10);
        }
        else {
            this._shape.css('fill-opacity', '');
        }

        if (state.merge) {
            this._shape.addClass('mergeHighlighted');
        }
        else {
            this._shape.removeClass('mergeHighlighted');
        }

        let occluded = state.model.occluded;
        let keyFrame = state.position.keyFrame === true;
        let outsided = state.position.outsided;

        this._ui.occluded(occluded);
        this._ui.keyFrame(keyFrame);
        this._ui.outsided(outsided);

        if (occluded) {
            this._shape.addClass('occludedShape');
        }
        else {
            this._shape.removeClass('occludedShape');
        }
    }

    removeView() {
        this._shape.remove();
        this._ui.remove();
        this._text.remove();
    }

    updateColors(colors, merge) {
        if (merge) this._shape.css('fill','');
        else this._shape.css('fill', colors.background);

        this._shape.css('stroke', colors.border);
        this._ui.css('background-color', colors.background);
    }

    updateViewGeometry() {
        let revscale = this._revscale;
        let frameWidth = +$('#frameContent').css('width').slice(0,-2);
        let frameHeight = +$('#frameContent').css('height').slice(0,-2);

        let oldX1 = +this._shape.attr('x');
        let oldY1 = +this._shape.attr('y');
        let oldX2 = +this._shape.attr('x') + +this._shape.attr('width');
        let oldY2 = +this._shape.attr('y') + +this._shape.attr('height');

        if (oldX1 < 0) oldX1 = 0;
        if (oldY1 < 0) oldY1 = 0;
        if (oldX2 > frameWidth) oldX2 = frameWidth;
        if (oldY2 > frameHeight) oldY2 = frameHeight;

        let width = oldX2 - oldX1;
        if (width < MIN_BOX_SIZE) {
            width = MIN_BOX_SIZE;
            if (oldX1 + width > frameWidth) {
                oldX1 = oldX2 - width;
            }
        }

        let height = oldY2 - oldY1;
        if (height < MIN_BOX_SIZE) {
            height = MIN_BOX_SIZE;
            if (oldY1 + height > frameHeight) {
                oldY1 = oldY2 - height;
            }
        }

        this._shape.attr({
            x: oldX1,
            y: oldY1,
            width: width,
            height: height
        });

        let margin = 5;
        let box = null;

        try {       // mozilla firefox throws exception when call getBBox() for undrawed object. Chrome in this case return zero box.
            box = this._text['0'].getBBox();
        }
        catch(err) {
            box = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }

        let xpos = +this._shape.attr('x') + +this._shape.attr('width') + margin;
        let ypos = +this._shape.attr('y');

        if (xpos + box.width * revscale > frameWidth) {
            xpos = +this._shape.attr('x') - margin - box.width * revscale;
            if (xpos < 0) {
                xpos = +this._shape.attr('x') + margin;
            }
        }
        if (ypos + box.height * revscale > frameHeight) {
            let greatherVal = ypos + box.height * revscale - frameHeight;
            ypos = Math.max(0, ypos - greatherVal);
        }

        this._text.attr({
            x: xpos / revscale,
            y: ypos / revscale,
            transform: `scale(${revscale})`
        });

        this._text.find('tspan').each(function() {
            let parent = $(this.parentElement);
            this.setAttribute('x', parent.attr('x'));
        });

        this._shape.css('stroke-width', 2 * revscale);
    }

    updateAndViewText(state) {
        let attributes = state.attributes;
        let activeAttribute = state.model.activeAttribute;
        let header = this._text.children().first();
        header.detach();
        this._text.empty();
        header.appendTo(this._text);

        let x = +this._text.attr('x');
        for (let attrKey in attributes) {
            let attribute = attributes[attrKey];
            let value = attribute.value;
            if (value === AAMUndefinedKeyword) value = "";
            let attrElem = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            attrElem.setAttribute('dy', '1em');
            attrElem.setAttribute('x', x);
            attrElem.innerHTML = `${attribute.name.normalize()}: ${value}`;
            if (+attrKey === activeAttribute) {
                attrElem.style['fill'] = 'red';
                attrElem.style['font-weight'] = 'bold';
            }
            this._text['0'].appendChild(attrElem);
        }
        this.updateViewGeometry();
    }

    set revscale(value) {
        this._revscale = value;
    }

    static makeUI(interpolation, labelsInfo, colors, trackModel) {
        let attributes = interpolation.attributes;
        let labelId = trackModel.label;
        let id = trackModel.id;
        let trackType = trackModel.trackType;
        let shapeType = trackModel.shapeType;
        let labels = labelsInfo.labels();
        let labelName = labels[labelId].normalize();
        let shortkeys = userConfig.shortkeys;

        let ui = $('<div></div>').css('background-color', colors.background).addClass('uiElement regular');
        $(`<label> ${labelName} ${id} [${shapeType}, ${trackType}] </label>`).addClass('semiBold').appendTo(ui);
        let button = $('<a></a>').addClass('close').appendTo(ui);
        button.attr('title', `Delete Object (${shortkeys["delete_track"].view_value})`);
        button.on('click', function(event) {
            trackModel.remove(event.shiftKey);
        });

        let occludedState = trackModel.occluded;
        let lockedState = trackModel.lock;
        let outsidedState = trackModel.outside;
        let keyFrameState = interpolation.position.keyFrame === true;    // exclude 'undefined'

        let propManagement = $('<div></div>').appendTo(ui).css({
            'margin': '5px 10px'
        });

        let lockShortkeys = `(${shortkeys["switch_lock_property"].view_value}), (${shortkeys["switch_all_lock_property"].view_value})`;
        let occludedShortkey = `(${shortkeys["switch_occluded_property"].view_value})`;

        let lockButton = $(`<button title="Lock Property ${lockShortkeys}"></button>`)
            .addClass('graphicButton lockButton').appendTo(propManagement);
        let occludedButton = $(`<button title="Occluded Property ${occludedShortkey}"></button>`)
            .addClass('graphicButton occludedButton').appendTo(propManagement);
        let outsidedButton = $(`<button title="Outsided Property"></button>`).addClass('graphicButton outsidedButton');
        let keyFrameButton = $(`<button title="KeyFrame Property"></button>`).addClass('graphicButton keyFrameButton');

        if (trackModel.trackType == 'interpolation') {
            outsidedButton.appendTo(propManagement);
            keyFrameButton.appendTo(propManagement);
        }


        let labelsBlock = null;
        let attrBlocks = [];
        let buttonBlock = null;
        let hidden = interpolation.position.outsided;

        ui.extend({
            lock : function(value) {
                if (value) lockButton.addClass('locked');
                else lockButton.removeClass('locked');
                occludedButton.attr('disabled', value);
                outsidedButton.attr('disabled', value);
                keyFrameButton.attr('disabled', value);
                $(this).find('input, select').attr('disabled', value);
                lockedState = value;
            },

            occluded : function(value) {
                if (value) occludedButton.addClass('occluded');
                else occludedButton.removeClass('occluded');
                occludedState = value;
            },

            outsided : function(value) {
                if (value) outsidedButton.addClass('outsided');
                else outsidedButton.removeClass('outsided');
                outsidedState = value;
                this.hidden(value);
            },

            keyFrame: function(value) {
                if (value) keyFrameButton.addClass('keyFrame');
                else keyFrameButton.removeClass('keyFrame');
                keyFrameState = value;
            },

            hidden : function(value) {
                if (value && (value != hidden)) {
                    hidden = value;
                    if (labelsBlock) labelsBlock.detach();
                    for (let attrBlock of attrBlocks) {
                        attrBlock.detach();
                    }
                }
                else if (!value && (value != hidden)) {
                    hidden = value;
                    if (buttonBlock) buttonBlock.detach();
                    if (labelsBlock) labelsBlock.appendTo(ui);
                    for (let attrBlock of attrBlocks) {
                        attrBlock.appendTo(ui);
                    }
                    if (buttonBlock) buttonBlock.appendTo(ui);
                }
            },

            updateAttributes : function(attributes) {
                for (let attrKey in attributes) {
                    let attrInfo = labelsInfo.attrInfo(attrKey);
                    let name = attributes[attrKey].name;
                    let value = attributes[attrKey].value;
                    if (hidden) return;

                    switch (attrInfo.type) {
                    case 'text': {
                        let text = ui.find(`#${id}_${name}_text`)[0];
                        text.value = value;
                        break;
                    }
                    case 'number': {
                        let number = ui.find(`#${id}_${name}_number`)[0];
                        number.value = value;
                        break;
                    }
                    case 'checkbox': {
                        let checkbox = ui.find(`#${id}_${name}_checkbox`)[0];
                        checkbox.checked = labelsInfo.strToValues(attrInfo.type, value)[0] ? true : false;
                        break;
                    }
                    case 'select': {
                        let select = ui.find(`#${id}_${name}_select`)[0];
                        if (value === AAMUndefinedKeyword) value = "";
                        select.value = value;
                        break;
                    }
                    case 'radio':
                        ui.find(`#${id}_${name}_${value.toJSId()}_radio`)[0].checked = true;
                        break;
                    }
                }
            }
        });

        ui.lock(lockedState);
        ui.occluded(occludedState);
        ui.outsided(outsidedState);
        ui.keyFrame(keyFrameState);

        lockButton.on('click', function() {
            lockedState = !lockedState;
            trackModel.lock = lockedState;
        });

        occludedButton.on('click', function() {
            occludedState = !occludedState;
            trackModel.occluded = occludedState;
        });

        outsidedButton.on('click', function() {
            trackModel.outside = !outsidedState;
        });

        keyFrameButton.on('click', function() {
            trackModel.keyFrame = !keyFrameState;
        });

        if (Object.keys(labels).length > 1) {
            let div = $('<div> </div>').css('width', '100%');
            $('<label> Label  </label>').addClass('semiBold').appendTo(div);
            let select = $('<select> </select>').addClass('uiSelect regular').appendTo(div);
            select.attr('title',
                `Change Object Label [${shortkeys["change_track_label"].view_value}]`);

            for (let labelId in labels) {
                $(`<option value=${labelId}> ${labels[labelId]} </option>`).appendTo(select);
            }
            select.prop('value', labelId);
            select.on('change', function(event) {
                let labelId = +event.target.value;
                ui.onchangelabel(trackModel, labelId);
            });
            select.keydown(function(e) {
                e.preventDefault();
            });

            labelsBlock = div;
        }


        if (Object.keys(attributes).length) {
            attrBlocks.push($('<label> Attributes <br>  </label>').addClass('semiBold'));
        }

        for (let attrKey in attributes) {
            let attribute = attributes[attrKey];
            let attrInfo = labelsInfo.attrInfo(attrKey);
            let name = attrInfo.name;
            let type = attrInfo.type;
            let values = attrInfo.values;
            let curValue = attribute.value;
            let attrView = TrackView.makeAttr(type, name, curValue, values, attrKey, id);
            attrView.addClass('attribute');
            attrView['0'].onchangeattribute = function(key, value) {
                trackModel.recordAttribute(key, value);
            };
            attrBlocks.push(attrView);
        }

        if (trackModel.trackType == 'interpolation') {
            buttonBlock = $('<div></div>').addClass('center');
            let prevKeyFrame = $('<button> \u2190 </button>');
            let nextKeyFrame = $('<button> \u2192 </button>');
            let initFrame = $('<button> \u21ba </button>');

            prevKeyFrame.attr('title',
                `Previous Key Frame (${shortkeys["prev_key_frame"].view_value})`);
            nextKeyFrame.attr('title',
                `Next Key Frame (${shortkeys["next_key_frame"].view_value})`);
            initFrame.attr('title', "First Visible Frame");

            buttonBlock.append(prevKeyFrame);
            buttonBlock.append(initFrame);
            buttonBlock.append(nextKeyFrame);
            ui.append(buttonBlock);

            prevKeyFrame.on('click', function() {
                let frame = trackModel.prevKeyFrame;
                if (frame != null) ui.onshift(frame);
            });

            nextKeyFrame.on('click', function() {
                let frame = trackModel.nextKeyFrame;
                if (frame != null) ui.onshift(frame);
            });

            initFrame.on('click', function() {
                let frame = trackModel.firstFrame;
                if (Number.isInteger(frame)) {
                    ui.onshift(frame);
                }
            });
        }

        if (!hidden) {
            if (labelsBlock != null) ui.append(labelsBlock);
            for (let attrBlock of attrBlocks) {
                ui.append(attrBlock);
            }
        }

        if (buttonBlock != null) {
            ui.append(buttonBlock);
        }

        return ui;
    }

    static makeShape(position, type, colors) {
        if (type == 'box') {
            return TrackView.makeBox(position, colors);
        }
        else throw new Error('Unknown shape type');
    }

    static makeBox(pos, colors) {
        let svgRect = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect')).attr({
            x: pos.xtl,
            y: pos.ytl,
            width: pos.xbr - pos.xtl,
            height: pos.ybr - pos.ytl,
            stroke: colors.border,
            fill: colors.background
        }).addClass('shape changeable');

        svgRect.updatePos = function(pos) {
            svgRect.attr({
                x: pos.xtl,
                y: pos.ytl,
                width: pos.xbr - pos.xtl,
                height: pos.ybr - pos.ytl,
            });
        };

        return svgRect;
    }

    static makeText(interpolation, labelName, id) {
        let pos = interpolation.position;
        let attributes = interpolation.attributes;

        let shapeX = pos.xtl;
        let shapeY = pos.ytl;
        let shapeW = pos.xbr - pos.xtl;

        let svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        svgText.setAttribute('x', shapeX + shapeW);
        svgText.setAttribute('y', shapeY);
        svgText.setAttribute('class', 'shapeText regular');

        let labelNameText = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        labelNameText.innerHTML = `${labelName.normalize()}: ${id}`;
        labelNameText.setAttribute('dy', '1em');
        labelNameText.setAttribute('x', shapeX + shapeW + 5);
        labelNameText.setAttribute('class', 'bold');
        svgText.appendChild(labelNameText);

        for (let attrKey in attributes) {
            let attribute = attributes[attrKey];
            let attrRow = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            let value = attribute.value;
            if (value === AAMUndefinedKeyword) value = "";
            attrRow.innerHTML = `${attribute.name.normalize()}: ${value}`;
            attrRow.setAttribute('dy', '1em');
            attrRow.setAttribute('x', shapeX + shapeW + 5);
            svgText.appendChild(attrRow);
        }

        return $(svgText);
    }



    static makeAttr(type, name, value, values, key, id) {
        if (type === 'checkbox') {
            return TrackView.makeCheckBoxAttr(name, value, key, id);
        }
        else if (type === 'radio') {
            return TrackView.makeRadioAttr(name, value, values, key, id);
        }
        else if (type === 'number') {
            return TrackView.makeNumberAttr(name, value, values, key, id);
        }
        else if (type === 'text') {
            return TrackView.makeTextAttr(name, value, key, id);
        }
        else if (type === 'select') {
            return TrackView.makeSelectAttr(name, value, values, key, id);
        }
        else throw new Error('Unknown attribute type');
    }

    static makeCheckBoxAttr(name, value, key, id) {
        let div = document.createElement('div');

        let label = document.createElement('label');
        label.innerText = `${name.normalize()}`;
        label.setAttribute('for', `${id}_${name}_checkbox`);

        let check = document.createElement('input');
        check.setAttribute('type', 'checkbox');
        check.setAttribute('name', `${key}`);
        check.setAttribute('id', `${id}_${name}_checkbox`);
        check.checked = +value;
        check.onchange = function(e) {
            let key = e.target.name;
            let value = e.target.checked;
            div.onchangeattribute(key, value);
        };

        check.onkeydown = function(e) {
            e.preventDefault();
        };

        div.appendChild(check);
        div.appendChild(label);
        return $(div);
    }


    static makeRadioAttr(name, value, values, key, id) {
        let fieldset = document.createElement('fieldset');
        let legend = document.createElement('legend');
        legend.innerText = `${name.normalize()}`;
        fieldset.appendChild(legend);
        for (let val of values) {
            let div = document.createElement('div');
            let label = document.createElement('label');
            let radio = document.createElement('input');
            radio.onchange = function(e) {
                if (e.target.checked) {
                    fieldset.onchangeattribute(key,val);
                }
            };

            if (val === value) {
                radio.setAttribute('checked', true);
            }

            radio.setAttribute('type', 'radio');
            radio.setAttribute('name', `${id}_${key}`);
            radio.setAttribute('id', `${id}_${name}_${val.toJSId()}_radio`);
            radio.setAttribute('value', `${val}`);

            label.setAttribute('for', `${id}_${name}_${val.toJSId()}_radio`);
            if (val === AAMUndefinedKeyword) {
                label.innerText = `${""}`;
            }
            else {
                label.innerText = `${val.normalize()}`;
            }


            div.appendChild(radio);
            div.appendChild(label);
            fieldset.appendChild(div);
        }

        fieldset.classList = 'uiRadio';
        fieldset.onkeydown = function(e) {
            e.preventDefault();
        };

        return $(fieldset);
    }


    static makeSelectAttr(name, value, values, key, id) {
        let div = document.createElement('div');
        let label = document.createElement('label');
        label.innerText = `${name.normalize()}`;

        let select = document.createElement('select');
        select.classList = 'regular';
        select.setAttribute('name', `${key}`);
        select.setAttribute('id', `${id}_${name}_select`);
        select.style['margin-left'] = '5px';
        select.className += " uiSelect";


        for (let val of values) {
            let option = document.createElement('option');
            if (val === AAMUndefinedKeyword) val = "";
            option.innerText = `${val}`;
            select.add(option);
        }

        select.value = value;
        select.onchange = function(e) {
            let key = e.target.name;
            let value = e.target.value;
            value = (value === '' ? AAMUndefinedKeyword : value);
            div.onchangeattribute(key, value);
        };

        select.onkeydown = function(e) {
            e.preventDefault();
        };

        div.appendChild(label);
        div.appendChild(select);
        return $(div);
    }



    static makeTextAttr(name, value, key, id) {
        let div = document.createElement('div');
        let label = document.createElement('label');
        label.innerText = `${name.normalize()}`;

        let text = document.createElement('input');
        text.setAttribute('type', 'text');
        text.setAttribute('value', `${value}`);
        text.setAttribute('name', `${key}`);
        text.setAttribute('id', `${id}_${name}_text`);
        text.oninput = function() {
            let value = text.value;
            div.onchangeattribute(key,value);
        };
        text.style['width'] = '50%';
        text.style['margin-left'] = '5px';

        div.appendChild(label);
        div.appendChild(text);

        let stopProp = function(e) {
            let key = e.keyCode;
            let serviceKeys = [37, 38, 39, 40, 13, 16, 9, 109];
            if (serviceKeys.includes(key)) {
                e.preventDefault();
                return;
            }
            e.stopPropagation();
        };

        text.onkeypress = stopProp;
        text.onkeydown = stopProp;
        text.onkeyup = stopProp;

        return $(div);
    }



    static makeNumberAttr(name, value, values, key, id) {
        let [min, max, step] = values;
        let div = document.createElement('div');
        let label = document.createElement('label');
        label.innerText = `${name.normalize()}`;

        let number = document.createElement('input');
        number.setAttribute('type', 'number');
        number.setAttribute('value', `${value}`);
        number.setAttribute('step', `${step}`);
        number.setAttribute('min', `${min}`);
        number.setAttribute('max', `${max}`);
        number.setAttribute('id', `${id}_${name}_number`);
        number.oninput = function() {
            let value = +number.value;
            if (value > +max) value = +max;
            else if (value < +min) value = +min;
            number.value = value;
            div.onchangeattribute(key,value);
        };
        number.style['width'] = '50%';
        number.style['margin-left'] = '5px';

        div.appendChild(label);
        div.appendChild(number);

        let stopProp = function(e) {
            let key = e.keyCode;
            let serviceKeys = [37, 38, 39, 40, 13, 16, 9, 109];
            if (serviceKeys.includes(key)) {
                e.preventDefault();
                return;
            }
            e.stopPropagation();
        };

        number.onkeypress = stopProp;
        number.onkeydown = stopProp;
        number.onkeyup = stopProp;

        return $(div);
    }
}


