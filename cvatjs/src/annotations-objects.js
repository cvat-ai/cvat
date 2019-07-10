/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const ObjectState = require('./object-state');

    function objectStateFactory(frame, data) {
        const objectState = new ObjectState(data);

        // Rewrite default implementations of save/delete
        objectState.updateInCollection = this.save.bind(this, frame, objectState);
        objectState.deleteFromCollection = this.delete.bind(this);

        return objectState;
    }

    function checkObjectType(name, value, type, instance) {
        if (type) {
            if (typeof (value) !== type) {
                // specific case for integers which aren't native type in JS
                if (type === 'integer' && Number.isInteger(value)) {
                    return;
                }

                if (value !== undefined) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Got ${typeof (value)} value for ${name}. `
                        + `Expected ${type}`,
                    );
                }

                throw new window.cvat.exceptions.ArgumentError(
                    `Got undefined value for ${name}. `
                    + `Expected ${type}`,
                );
            }
        } else if (instance) {
            if (!(value instanceof instance)) {
                if (value !== undefined) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Got ${value.constructor.name} value for ${name}. `
                        + `Expected instance of ${instance.name}`,
                    );
                }

                throw new window.cvat.exceptions.ArgumentError(
                    `Got undefined value for ${name}. `
                    + `Expected instance of ${instance.name}`,
                );
            }
        }
    }

    class Annotation {
        constructor(data, clientID, injection) {
            this.taskLabels = injection.labels;
            this.clientID = clientID;
            this.serverID = data.id;
            this.group = data.group;
            this.label = this.taskLabels[data.label_id];
            this.frame = data.frame;
            this.removed = false;
            this.lock = false;
            this.attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});
            this.appendDefaultAttributes(this.label);
        }

        appendDefaultAttributes(label) {
            const labelAttributes = label.attributes;
            for (const attribute of labelAttributes) {
                if (!(attribute.id in this.attributes)) {
                    this.attributes[attribute.id] = attribute.defaultValue;
                }
            }
        }

        delete(force) {
            if (!this.lock || force) {
                this.removed = true;
            }

            return true;
        }
    }

    class Shape extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, injection);
            this.points = data.points;
            this.occluded = data.occluded;
            this.zOrder = data.z_order;
            this.color = color;
            this.shape = null;
        }

        // Method is used to export data to the server
        toJSON() {
            return {
                occluded: this.occluded,
                z_order: this.zOrder,
                points: [...this.points],
                attributes: Object.keys(this.attributes).reduce((attributeAccumulator, attrId) => {
                    attributeAccumulator.push({
                        spec_id: attrId,
                        value: this.attributes[attrId],
                    });

                    return attributeAccumulator;
                }, []),
                id: this.serverID,
                frame: this.frame,
                label_id: this.label.id,
                group: this.group,
            };
        }

        // Method is used to construct ObjectState objects
        get(frame) {
            if (frame !== this.frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }

            return {
                type: window.cvat.enums.ObjectType.SHAPE,
                shape: this.shape,
                clientID: this.clientID,
                occluded: this.occluded,
                lock: this.lock,
                zOrder: this.zOrder,
                points: [...this.points],
                attributes: Object.assign({}, this.attributes),
                label: this.label,
                group: this.group,
                color: this.color,
            };
        }

        save(frame, data) {
            if (frame !== this.frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }

            if (this.lock && data.lock) {
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            // All changes are done in this temporary object
            const copy = this.get(frame);
            const updated = data.updateFlags;

            if (updated.label) {
                checkObjectType('label', data.label, null, window.cvat.classes.Label);
                copy.label = data.label;
                copy.attributes = {};
                this.appendDefaultAttributes.call(copy, copy.label);
            }

            if (updated.attributes) {
                const labelAttributes = copy.label
                    .attributes.map(attr => `${attr.id}`);

                for (const attrID of Object.keys(data.attributes)) {
                    if (labelAttributes.includes(attrID)) {
                        copy.attributes[attrID] = data.attributes[attrID];
                    }
                }
            }

            if (updated.points) {
                checkObjectType('points', data.points, null, Array);
                copy.points = [];
                for (const coordinate of data.points) {
                    checkObjectType('coordinate', coordinate, 'number', null);
                    copy.points.push(coordinate);
                }
            }

            if (updated.occluded) {
                checkObjectType('occluded', data.occluded, 'boolean', null);
                copy.occluded = data.occluded;
            }

            if (updated.group) {
                checkObjectType('group', data.group, 'integer', null);
                copy.group = data.group;
            }

            if (updated.zOrder) {
                checkObjectType('zOrder', data.zOrder, 'integer', null);
                copy.zOrder = data.zOrder;
            }

            if (updated.lock) {
                checkObjectType('lock', data.lock, 'boolean', null);
                copy.lock = data.lock;
            }

            if (updated.color) {
                checkObjectType('color', data.color, 'string', null);
                if (/^#[0-9A-F]{6}$/i.test(data.color)) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Got invalid color value: "${data.color}"`,
                    );
                }

                copy.color = data.color;
            }

            // Reset flags and commit all changes
            updated.reset();
            for (const prop of Object.keys(copy)) {
                if (prop in this) {
                    this[prop] = copy[prop];
                }
            }

            return objectStateFactory.call(this, frame, this.get(frame));
        }
    }

    class Track extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, injection);
            this.shapes = data.shapes.reduce((shapeAccumulator, value) => {
                shapeAccumulator[value.frame] = {
                    serverID: value.id,
                    occluded: value.occluded,
                    zOrder: value.z_order,
                    points: value.points,
                    frame: value.frame,
                    outside: value.outside,
                    attributes: value.attributes.reduce((attributeAccumulator, attr) => {
                        attributeAccumulator[attr.spec_id] = attr.value;
                        return attributeAccumulator;
                    }, {}),
                };

                return shapeAccumulator;
            }, {});

            this.attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});

            this.cache = {};
            this.color = color;
            this.shape = null;
        }

        // Method is used to export data to the server
        toJSON() {
            return {
                occluded: this.occluded,
                z_order: this.zOrder,
                points: [...this.points],
                attributes: Object.keys(this.attributes).reduce((attributeAccumulator, attrId) => {
                    attributeAccumulator.push({
                        spec_id: attrId,
                        value: this.attributes[attrId],
                    });

                    return attributeAccumulator;
                }, []),

                id: this.serverID,
                frame: this.frame,
                label_id: this.label.id,
                group: this.group,
                shapes: Object.keys(this.shapes).reduce((shapesAccumulator, frame) => {
                    shapesAccumulator.push({
                        type: this.type,
                        occluded: this.shapes[frame].occluded,
                        z_order: this.shapes[frame].zOrder,
                        points: [...this.shapes[frame].points],
                        outside: [...this.shapes[frame].outside],
                        attributes: Object.keys(...this.shapes[frame].attributes)
                            .reduce((attributeAccumulator, attrId) => {
                                attributeAccumulator.push({
                                    spec_id: attrId,
                                    value: this.shapes[frame].attributes[attrId],
                                });

                                return attributeAccumulator;
                            }, []),
                        id: this.shapes[frame].serverID,
                        frame: +frame,
                    });

                    return shapesAccumulator;
                }, []),
            };
        }

        // Method is used to construct ObjectState objects
        get(frame) {
            if (!(frame in this.cache)) {
                const interpolation = Object.assign(
                    {}, this.getPosition(frame),
                    {
                        attributes: this.getAttributes(frame),
                        label: this.label,
                        group: this.group,
                        type: window.cvat.enums.ObjectType.TRACK,
                        shape: this.shape,
                        clientID: this.clientID,
                        lock: this.lock,
                        color: this.color,
                    },
                );

                this.cache[frame] = interpolation;
            }

            return JSON.parse(JSON.stringify(this.cache[frame]));
        }

        neighborsFrames(targetFrame) {
            const frames = Object.keys(this.shapes).map(frame => +frame);
            let lDiff = Number.MAX_SAFE_INTEGER;
            let rDiff = Number.MAX_SAFE_INTEGER;

            for (const frame of frames) {
                const diff = Math.abs(targetFrame - frame);
                if (frame <= targetFrame && diff < lDiff) {
                    lDiff = diff;
                } else if (diff < rDiff) {
                    rDiff = diff;
                }
            }

            const leftFrame = lDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame - lDiff;
            const rightFrame = rDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame + rDiff;

            return {
                leftFrame,
                rightFrame,
            };
        }

        getAttributes(targetFrame) {
            const result = {};

            // First of all copy all unmutable attributes
            for (const attrID in this.attributes) {
                if (Object.prototype.hasOwnProperty.call(this.attributes, attrID)) {
                    result[attrID] = this.attributes[attrID];
                }
            }

            // Secondly get latest mutable attributes up to target frame
            const frames = Object.keys(this.shapes).sort((a, b) => +a - +b);
            for (const frame of frames) {
                if (frame <= targetFrame) {
                    const { attributes } = this.shapes[frame];

                    for (const attrID in attributes) {
                        if (Object.prototype.hasOwnProperty.call(attributes, attrID)) {
                            result[attrID] = attributes[attrID];
                        }
                    }
                }
            }

            return result;
        }

        save(frame, data) {
            if (this.lock || data.lock) {
                this.lock = data.lock;
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            // All changes are done in this temporary object
            const copy = Object.assign(this.get(frame));
            copy.attributes = Object.assign(copy.attributes);
            copy.points = [...copy.points];

            const updated = data.updateFlags;
            let positionUpdated = false;

            if (updated.label) {
                checkObjectType('label', data.label, null, window.cvat.classes.Label);
                copy.label = data.label;
                copy.attributes = {};

                // Shape attributes will be removed later after all checks
                this.appendDefaultAttributes.call(copy, copy.label);
            }

            if (updated.attributes) {
                const labelAttributes = copy.label.attributes
                    .reduce((accumulator, value) => {
                        accumulator[value.id] = value;
                        return accumulator;
                    }, {});

                for (const attrID of Object.keys(data.attributes)) {
                    if (attrID in labelAttributes) {
                        copy.attributes[attrID] = data.attributes[attrID];
                        if (!labelAttributes[attrID].mutable) {
                            this.attributes[attrID] = data.attributes[attrID];
                        } else {
                            // Mutable attributes will be updated later
                            positionUpdated = true;
                        }
                    }
                }
            }

            if (updated.points) {
                checkObjectType('points', data.points, null, Array);
                copy.points = [];
                for (const coordinate of data.points) {
                    checkObjectType('coordinate', coordinate, 'number', null);
                    copy.points.push(coordinate);
                }
                positionUpdated = true;
            }

            if (updated.occluded) {
                checkObjectType('occluded', data.occluded, 'boolean', null);
                copy.occluded = data.occluded;
                positionUpdated = true;
            }

            if (updated.outside) {
                checkObjectType('outside', data.outside, 'boolean', null);
                copy.outside = data.outside;
                positionUpdated = true;
            }

            if (updated.group) {
                checkObjectType('group', data.group, 'integer', null);
                copy.group = data.group;
            }

            if (updated.zOrder) {
                checkObjectType('zOrder', data.zOrder, 'integer', null);
                copy.zOrder = data.zOrder;
                positionUpdated = true;
            }

            if (updated.lock) {
                checkObjectType('lock', data.lock, 'boolean', null);
                copy.lock = data.lock;
            }

            if (updated.color) {
                checkObjectType('color', data.color, 'string', null);
                if (/^#[0-9A-F]{6}$/i.test(data.color)) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Got invalid color value: "${data.color}"`,
                    );
                }

                copy.color = data.color;
            }

            // Commit all changes
            for (const prop of Object.keys(copy)) {
                if (prop in this) {
                    this[prop] = copy[prop];
                }

                this.cache[frame][prop] = copy[prop];
            }

            if (updated.label) {
                for (const shape of this.shapes) {
                    shape.attributes = {};
                }
            }

            // Remove keyframe
            if (updated.keyframe && !data.keyframe) {
                // Remove all cache after this keyframe because it have just become outdated
                for (const cacheFrame in this.cache) {
                    if (+cacheFrame > frame) {
                        delete this.cache[frame];
                    }
                }

                this.cache[frame].keyframe = false;
                delete this.shapes[frame];
                updated.reset();

                return objectStateFactory.call(this, frame, this.get(frame));
            }

            // Add/update keyframe
            if (positionUpdated || (updated.keyframe && data.keyframe)) {
                // Remove all cache after this keyframe because it have just become outdated
                for (const cacheFrame in this.cache) {
                    if (+cacheFrame > frame) {
                        delete this.cache[frame];
                    }
                }

                this.cache[frame].keyframe = true;
                data.keyframe = true;

                this.shapes[frame] = {
                    frame,
                    zOrder: copy.zOrder,
                    points: copy.points,
                    outside: copy.outside,
                    occluded: copy.occluded,
                    attributes: {},
                };

                if (updated.attributes) {
                    const labelAttributes = this.label.attributes
                        .reduce((accumulator, value) => {
                            accumulator[value.id] = value;
                            return accumulator;
                        }, {});

                    // Unmutable attributes were updated above
                    for (const attrID of Object.keys(data.attributes)) {
                        if (attrID in labelAttributes && labelAttributes[attrID].mutable) {
                            this.shapes[frame].attributes[attrID] = data.attributes[attrID];
                            this.shapes[frame].attributes[attrID] = data.attributes[attrID];
                        }
                    }
                }
            }

            updated.reset();

            return objectStateFactory.call(this, frame, this.get(frame));
        }

        getPosition(targetFrame) {
            const {
                leftFrame,
                rightFrame,
            } = this.neighborsFrames(targetFrame);

            const rightPosition = Number.isInteger(rightFrame) ? this.shapes[rightFrame] : null;
            const leftPosition = Number.isInteger(leftFrame) ? this.shapes[leftFrame] : null;

            if (leftPosition && leftFrame === targetFrame) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: leftPosition.zOrder,
                    keyframe: true,
                };
            }

            if (rightPosition && leftPosition) {
                return Object.assign({}, this.interpolatePosition(
                    leftPosition,
                    rightPosition,
                    targetFrame,
                ), {
                    keyframe: false,
                });
            }

            if (rightPosition) {
                return {
                    points: [...rightPosition.points],
                    occluded: rightPosition.occluded,
                    outside: true,
                    zOrder: 0,
                    keyframe: false,
                };
            }

            if (leftPosition) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: 0,
                    keyframe: false,
                };
            }

            throw new window.cvat.exceptions.ScriptingError(
                `No one neightbour frame found for the track with client ID: "${this.id}"`,
            );
        }
    }

    class Tag extends Annotation {
        constructor(data, clientID, injection) {
            super(data, clientID, injection);
        }

        // Method is used to export data to the server
        toJSON() {
            return {
                id: this.serverID,
                frame: this.frame,
                label_id: this.label.id,
                group: this.group,
                attributes: Object.keys(this.attributes).reduce((attributeAccumulator, attrId) => {
                    attributeAccumulator.push({
                        spec_id: attrId,
                        value: this.attributes[attrId],
                    });

                    return attributeAccumulator;
                }, []),
            };
        }

        // Method is used to construct ObjectState objects
        get(frame) {
            if (frame !== this.frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }

            return {
                type: window.cvat.enums.ObjectType.TAG,
                clientID: this.clientID,
                lock: this.lock,
                attributes: Object.assign({}, this.attributes),
                label: this.label,
                group: this.group,
            };
        }

        save(frame, data) {
            if (frame !== this.frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }

            if (this.lock && data.lock) {
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            // All changes are done in this temporary object
            const copy = this.get(frame);
            const updated = data.updateFlags;

            if (updated.label) {
                checkObjectType('label', data.label, null, window.cvat.classes.Label);
                copy.label = data.label;
                copy.attributes = {};
                this.appendDefaultAttributes.call(copy, copy.label);
            }

            if (updated.attributes) {
                const labelAttributes = copy.label
                    .attributes.map(attr => `${attr.id}`);

                for (const attrID of Object.keys(data.attributes)) {
                    if (labelAttributes.includes(attrID)) {
                        copy.attributes[attrID] = data.attributes[attrID];
                    }
                }
            }

            if (updated.group) {
                checkObjectType('group', data.group, 'integer', null);
                copy.group = data.group;
            }

            if (updated.lock) {
                checkObjectType('lock', data.lock, 'boolean', null);
                copy.lock = data.lock;
            }

            // Reset flags and commit all changes
            updated.reset();
            for (const prop of Object.keys(copy)) {
                if (prop in this) {
                    this[prop] = copy[prop];
                }
            }

            return objectStateFactory.call(this, frame, this.get(frame));
        }
    }

    class RectangleShape extends Shape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.RECTANGLE;
        }
    }

    class PolyShape extends Shape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
        }
    }

    class PolygonShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POLYGON;
        }
    }

    class PolylineShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POLYLINE;
        }
    }

    class PointsShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POINTS;
        }
    }

    class RectangleTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.RECTANGLE;
        }

        interpolatePosition(leftPosition, rightPosition, targetFrame) {
            const offset = (targetFrame - leftPosition.frame) / (
                rightPosition.frame - leftPosition.frame);
            const positionOffset = [
                rightPosition.points[0] - leftPosition.points[0],
                rightPosition.points[1] - leftPosition.points[1],
                rightPosition.points[2] - leftPosition.points[2],
                rightPosition.points[3] - leftPosition.points[3],
            ];

            return { // xtl, ytl, xbr, ybr
                points: [
                    leftPosition.points[0] + positionOffset[0] * offset,
                    leftPosition.points[1] + positionOffset[1] * offset,
                    leftPosition.points[2] + positionOffset[2] * offset,
                    leftPosition.points[3] + positionOffset[3] * offset,
                ],
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }
    }

    class PolyTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
        }

        interpolatePosition(leftPosition, rightPosition, targetFrame) {
            function findBox(points) {
                let xmin = Number.MAX_SAFE_INTEGER;
                let ymin = Number.MAX_SAFE_INTEGER;
                let xmax = Number.MIN_SAFE_INTEGER;
                let ymax = Number.MIN_SAFE_INTEGER;

                for (let i = 0; i < points.length; i += 2) {
                    if (points[i] < xmin) xmin = points[i];
                    if (points[i + 1] < ymin) ymin = points[i + 1];
                    if (points[i] > xmax) xmax = points[i];
                    if (points[i + 1] > ymax) ymax = points[i + 1];
                }

                return {
                    xmin,
                    ymin,
                    xmax,
                    ymax,
                };
            }

            function normalize(points, box) {
                const normalized = [];
                const width = box.xmax - box.xmin;
                const height = box.ymax - box.ymin;

                for (let i = 0; i < points.length; i += 2) {
                    normalized.push(
                        (points[i] - box.xmin) / width,
                        (points[i + 1] - box.ymin) / height,
                    );
                }

                return normalized;
            }

            function denormalize(points, box) {
                const denormalized = [];
                const width = box.xmax - box.xmin;
                const height = box.ymax - box.ymin;

                for (let i = 0; i < points.length; i += 2) {
                    denormalized.push(
                        points[i] * width + box.xmin,
                        points[i + 1] * height + box.ymin,
                    );
                }

                return denormalized;
            }

            function toPoints(array) {
                const points = [];
                for (let i = 0; i < array.length; i += 2) {
                    points.push({
                        x: array[i],
                        y: array[i + 1],
                    });
                }

                return points;
            }

            function toArray(points) {
                const array = [];
                for (const point of points) {
                    array.push(point.x, point.y);
                }

                return array;
            }

            function computeDistances(source, target) {
                const distances = {};
                for (let i = 0; i < source.length; i++) {
                    distances[i] = distances[i] || {};
                    for (let j = 0; j < target.length; j++) {
                        const dx = source[i].x - target[j].x;
                        const dy = source[i].y - target[j].y;

                        distances[i][j] = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                    }
                }

                return distances;
            }

            function truncateByThreshold(mapping, threshold) {
                for (const key of Object.keys(mapping)) {
                    if (mapping[key].distance > threshold) {
                        delete mapping[key];
                    }
                }
            }

            // https://en.wikipedia.org/wiki/Stable_marriage_problem
            // TODO: One of important part of the algorithm is to correctly match
            // "corner" points. Thus it is possible for each of such point calculate
            // a descriptor (d) and use (x, y, d) to calculate the distance. One more
            // idea is to be sure that order or matched points is preserved. For example,
            // if p1 matches q1 and p2 matches q2 and between p1 and p2 we don't have any
            // points thus we should not have points between q1 and q2 as well.
            function stableMarriageProblem(men, women, distances) {
                const menPreferences = {};
                for (const man of men) {
                    menPreferences[man] = women.concat()
                        .sort((w1, w2) => distances[man][w1] - distances[man][w2]);
                }

                // Start alghoritm with max N^2 complexity
                const womenMaybe = {}; // id woman:id man,distance
                const menBusy = {}; // id man:boolean
                let prefIndex = 0;

                // While there is at least one free man
                while (Object.values(menBusy).length !== men.length) {
                    // Every man makes offer to the best woman
                    for (const man of men) {
                        // The man have already found a woman
                        if (menBusy[man]) {
                            continue;
                        }

                        const woman = menPreferences[man][prefIndex];
                        const distance = distances[man][woman];

                        // A women chooses the best offer and says "maybe"
                        if (woman in womenMaybe && womenMaybe[woman].distance > distance) {
                            // A woman got better offer
                            const prevChoice = womenMaybe[woman].value;
                            delete womenMaybe[woman];
                            delete menBusy[prevChoice];
                        }

                        if (!(woman in womenMaybe)) {
                            womenMaybe[woman] = {
                                value: man,
                                distance,
                            };

                            menBusy[man] = true;
                        }
                    }

                    prefIndex++;
                }

                const result = {};
                for (const woman of Object.keys(womenMaybe)) {
                    result[womenMaybe[woman].value] = {
                        value: woman,
                        distance: womenMaybe[woman].distance,
                    };
                }

                return result;
            }

            function getMapping(source, target) {
                function sumEdges(points) {
                    let result = 0;
                    for (let i = 1; i < points.length; i += 2) {
                        const distance = Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2)
                            + Math.pow(points[i].y - points[i - 1].y, 2));
                        result += distance;
                    }

                    // Corner case when work with one point
                    // Mapping in this case can't be wrong
                    if (!result) {
                        return Number.MAX_SAFE_INTEGER;
                    }

                    return result;
                }

                function computeDeviation(points, average) {
                    let result = 0;
                    for (let i = 1; i < points.length; i += 2) {
                        const distance = Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2)
                            + Math.pow(points[i].y - points[i - 1].y, 2));
                        result += Math.pow(distance - average, 2);
                    }

                    return result;
                }

                const processedSource = [];
                const processedTarget = [];

                const distances = computeDistances(source, target);
                const mapping = stableMarriageProblem(Array.from(source.keys()),
                    Array.from(target.keys()), distances);

                const average = (sumEdges(target)
                    + sumEdges(source)) / (target.length + source.length);
                const meanSquareDeviation = Math.sqrt((computeDeviation(source, average)
                    + computeDeviation(target, average)) / (source.length + target.length));
                const threshold = average + 3 * meanSquareDeviation; // 3 sigma rule
                truncateByThreshold(mapping, threshold);
                for (const key of Object.keys(mapping)) {
                    mapping[key] = mapping[key].value;
                }

                // const receivingOrder = Object.keys(mapping).map(x => +x).sort((a,b) => a - b);
                const receivingOrder = this.appendMapping(mapping, source, target);

                for (const pointIdx of receivingOrder) {
                    processedSource.push(source[pointIdx]);
                    processedTarget.push(target[mapping[pointIdx]]);
                }

                return [processedSource, processedTarget];
            }

            let leftBox = findBox(leftPosition.points);
            let rightBox = findBox(rightPosition.points);

            // Sometimes (if shape has one point or shape is line),
            // We can get box with zero area
            // Next computation will be with NaN in this case
            // We have to prevent it
            const delta = 1;
            if (leftBox.xmax - leftBox.xmin < delta || rightBox.ymax - rightBox.ymin < delta) {
                leftBox = {
                    xmin: 0,
                    xmax: 1024, // TODO: Get actual image size
                    ymin: 0,
                    ymax: 768,
                };

                rightBox = leftBox;
            }

            const leftPoints = toPoints(normalize(leftPosition.points, leftBox));
            const rightPoints = toPoints(normalize(rightPosition.points, rightBox));

            let newLeftPoints = [];
            let newRightPoints = [];
            if (leftPoints.length > rightPoints.length) {
                const [
                    processedRight,
                    processedLeft,
                ] = getMapping.call(this, rightPoints, leftPoints);
                newLeftPoints = processedLeft;
                newRightPoints = processedRight;
            } else {
                const [
                    processedLeft,
                    processedRight,
                ] = getMapping.call(this, leftPoints, rightPoints);
                newLeftPoints = processedLeft;
                newRightPoints = processedRight;
            }

            const absoluteLeftPoints = denormalize(toArray(newLeftPoints), leftBox);
            const absoluteRightPoints = denormalize(toArray(newRightPoints), rightBox);

            const offset = (targetFrame - leftPosition.frame) / (
                rightPosition.frame - leftPosition.frame);

            const interpolation = [];
            for (let i = 0; i < absoluteLeftPoints.length; i++) {
                interpolation.push(absoluteLeftPoints[i] + (
                    absoluteRightPoints[i] - absoluteLeftPoints[i]) * offset);
            }

            return {
                points: interpolation,
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }

        // mapping is predicted order of points sourse_idx:target_idx
        // some points from source and target can absent in mapping
        // source, target - arrays of points. Target array size >= sourse array size
        appendMapping(mapping, source, target) {
            const targetMatched = Object.values(mapping).map(x => +x);
            const sourceMatched = Object.keys(mapping).map(x => +x);
            const orderForReceive = [];

            function findNeighbors(point) {
                let prev = point;
                let next = point;

                if (!targetMatched.length) {
                    // Prevent infinity loop
                    throw window.cvat.exceptions.ScriptingError('Interpolation mapping is empty');
                }

                while (!targetMatched.includes(prev)) {
                    prev--;
                    if (prev < 0) {
                        prev = target.length - 1;
                    }
                }

                while (!targetMatched.includes(next)) {
                    next++;
                    if (next >= target.length) {
                        next = 0;
                    }
                }

                return [prev, next];
            }

            function computeOffset(point, prev, next) {
                const pathPoints = [];

                while (prev !== next) {
                    pathPoints.push(target[prev]);
                    prev++;
                    if (prev >= target.length) {
                        prev = 0;
                    }
                }
                pathPoints.push(target[next]);

                let curveLength = 0;
                let offset = 0;
                let iCrossed = false;
                for (let k = 1; k < pathPoints.length; k++) {
                    const p1 = pathPoints[k];
                    const p2 = pathPoints[k - 1];
                    const distance = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

                    if (!iCrossed) {
                        offset += distance;
                    }
                    curveLength += distance;
                    if (target[point] === pathPoints[k]) {
                        iCrossed = true;
                    }
                }

                if (!curveLength) {
                    return 0;
                }

                return offset / curveLength;
            }

            for (let i = 0; i < target.length; i++) {
                const index = targetMatched.indexOf(i);
                if (index === -1) {
                    // We have to find a neighbours which have been mapped
                    const [prev, next] = findNeighbors(i);

                    // Now compute edge offset
                    const offset = computeOffset(i, prev, next);

                    // Get point between two neighbors points
                    const prevPoint = target[prev];
                    const nextPoint = target[next];
                    const autoPoint = {
                        x: prevPoint.x + (nextPoint.x - prevPoint.x) * offset,
                        y: prevPoint.y + (nextPoint.y - prevPoint.y) * offset,
                    };

                    // Put it into matched
                    source.push(autoPoint);
                    mapping[source.length - 1] = i;
                    orderForReceive.push(source.length - 1);
                } else {
                    orderForReceive.push(sourceMatched[index]);
                }
            }

            return orderForReceive;
        }
    }

    class PolygonTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POLYGON;
        }
    }

    class PolylineTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POLYLINE;
        }

        appendMapping() {
            // TODO after checking how it works with polygons
        }
    }

    class PointsTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shape = window.cvat.enums.ObjectShape.POINTS;
        }
    }

    module.exports = {
        RectangleShape,
        PolygonShape,
        PolylineShape,
        PointsShape,
        RectangleTrack,
        PolygonTrack,
        PolylineTrack,
        PointsTrack,
        Tag,
        objectStateFactory,
    };
})();
