/* exported AnnotationParser */
"use strict";

class AnnotationParser {
    constructor(labelsInfo, job) {
        this._parser = new DOMParser();
        this._labelsInfo = labelsInfo;
        this._startFrame = job.start;
        this._stopFrame = job.stop;
    }

    _parseInterpolationData(xml) {
        let data = [];
        let trackTags = xml.getElementsByTagName('track');

        for (let trackTag of trackTags) {
            let labelName = trackTag.getAttribute('label');
            let labelId = this._labelsInfo.labelIdOf(labelName);
            if (labelId === null) {
                throw Error('An unknown label found in the annotation file: ' + name);
            }

            let immutableAttributes = {};
            let boxTags = Array.from(trackTag.getElementsByTagName('box'));

            // Old annotation support
            if (boxTags.length == 3 && boxTags[0].getAttribute('outside')) {
                boxTags.shift();
            }

            let track = {
                label_id: labelId,
                frame: +boxTags[0].getAttribute('frame'),
                boxes: [],
                attributes: []
            };

            for (let boxTag of boxTags) {
                let keyFrame = +boxTag.getAttribute('keyframe');
                let frame = +boxTag.getAttribute('frame');
                let [xtl, ytl, xbr, ybr, occluded, outside] = this._getPosition(boxTag);
                if (!keyFrame && frame != this._startFrame || frame < this._startFrame ||
                    (frame > this._stopFrame && !(frame == this._stopFrame + 1 && outside))) {  // for annotation boxes on last frame (outside for it behind the last frame)
                    continue;
                }

                let box = {
                    frame: frame,
                    xtl: xtl,
                    ytl: ytl,
                    xbr: xbr,
                    ybr: ybr,
                    occluded: occluded,
                    outside: outside,
                    attributes: []
                };

                let mutableAttributes = {};
                let attrTags = boxTag.getElementsByTagName('attribute');
                for (let attrTag of attrTags) {
                    let [id, value] = this._getAttribute(labelId, attrTag);
                    if (this._labelsInfo.attrInfo(id).mutable) {
                        mutableAttributes[id] = value;
                    }
                    else {
                        immutableAttributes[id] = value;
                    }
                }

                for (let key in mutableAttributes) {
                    box.attributes.push({
                        id: key,
                        value: mutableAttributes[key]
                    });
                }

                track.boxes.push(box);
            }

            for (let key in immutableAttributes) {
                track.attributes.push({
                    id: key,
                    value: immutableAttributes[key]
                });
            }

            data.push(track);
        }

        return data;
    }


    _parseAnnotationData(xml) {
        let data = [];
        let images = xml.getElementsByTagName('image');
        for (let image of images) {
            let frame = +image.getAttribute('id');
            if (frame < this._startFrame || frame > this._stopFrame) continue;

            let boxTags = image.getElementsByTagName('box');
            for (let boxTag of boxTags) {
                let labelName = boxTag.getAttribute('label');
                let labelId = this._labelsInfo.labelIdOf(labelName);
                if (labelId === null) {
                    throw Error('An unknown label found in the annotation file: ' + name);
                }

                let [xtl, ytl, xbr, ybr, occluded] = this._getPosition(boxTag);
                let box = {
                    label_id: labelId,
                    xtl: xtl,
                    ytl: ytl,
                    xbr: xbr,
                    ybr: ybr,
                    occluded: occluded,
                    frame: frame,
                    attributes: []
                };

                let attributes = {};
                let attrTags = boxTag.getElementsByTagName('attribute');
                for (let attrTag of attrTags ) {
                    let [id, value] = this._getAttribute(labelId, attrTag);
                    attributes[id] = value;
                }

                for (let key in attributes) {
                    box.attributes.push({
                        id: key,
                        value: attributes[key]
                    });
                }

                data.push(box);
            }
        }
        return data;
    }


    _getPosition(boxTag) {
        let xtl = +boxTag.getAttribute('xtl');
        let ytl = +boxTag.getAttribute('ytl');
        let xbr = +boxTag.getAttribute('xbr');
        let ybr = +boxTag.getAttribute('ybr');

        if (xtl >= xbr || ytl >= ybr || xtl < 0 || ytl < 0) {
            let message = `Incorrect box found in annotation file.
            Position:  x: ${xtl}, y: ${ytl}, width: ${xbr - xtl}, height: ${ybr - ytl}`;
            throw Error(message);
        }

        let outside = +boxTag.getAttribute('outside');
        let occluded = +boxTag.getAttribute('occluded');
        return [xtl, ytl, xbr, ybr, occluded, outside];
    }


    _getAttribute(labelId, attrTag) {
        let name = attrTag.getAttribute('name');
        let attrId = this._labelsInfo.attrIdOf(labelId, name);
        if (attrId === null) {
            throw Error('An unknown attribute found in the annotation file: ' + name);
        }
        let attrInfo = this._labelsInfo.attrInfo(attrId);
        let value = this._labelsInfo.strToValues(attrInfo.type, attrTag.innerHTML)[0];

        if (['select', 'radio'].includes(attrInfo.type) && !attrInfo.values.includes(value)) {
            throw Error('Incorrect attribute value found for "' + name + '" attribute: ' + value);
        }
        else if (attrInfo.type === 'number') {
            if (isNaN(+value)) {
                throw Error('Incorrect attribute value found for "' + name + '" attribute: ' + value + '. Value must be a number.');
            }
            else {
                let min = +attrInfo.values[0];
                let max = +attrInfo.values[1];
                if (+value < min || +value > max) {
                    throw Error('Number attribute value out of range for "' + name +'" attribute: ' + value);
                }
            }
        }

        return [attrId, value];
    }


    _xmlParseError(parsedXML) {
        return parsedXML.getElementsByTagName("parsererror");
    }


    parse(text) {
        let xml = this._parser.parseFromString(text, 'text/xml');
        let parseerror = this._xmlParseError(xml);
        if (parseerror.length) {
            throw Error('Annotation page parsing error. ' + parseerror[0].innerText);
        }

        let interpolationData = this._parseInterpolationData(xml);
        let annotationData = this._parseAnnotationData(xml);
        return {
            "boxes": annotationData,
            "tracks": interpolationData
        };
    }
}
