// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const ObjectState = require('./object-state');
    const { checkObjectType } = require('./common');
    const {
        colors, Source, ObjectShape, ObjectType, AttributeType, HistoryActions,
    } = require('./enums');

    const { DataError, ArgumentError, ScriptingError } = require('./exceptions');

    const { Label } = require('./labels');

    const defaultGroupColor = '#E0E0E0';

    // Called with the Annotation context
    function objectStateFactory(frame, data) {
        const objectState = new ObjectState(data);

        // eslint-disable-next-line no-underscore-dangle
        objectState.__internal = {
            save: this.save.bind(this, frame, objectState),
            delete: this.delete.bind(this),
        };

        return objectState;
    }

    function checkNumberOfPoints(shapeType, points) {
        if (shapeType === ObjectShape.RECTANGLE) {
            if (points.length / 2 !== 2) {
                throw new DataError(`Rectangle must have 2 points, but got ${points.length / 2}`);
            }
        } else if (shapeType === ObjectShape.POLYGON) {
            if (points.length / 2 < 3) {
                throw new DataError(`Polygon must have at least 3 points, but got ${points.length / 2}`);
            }
        } else if (shapeType === ObjectShape.POLYLINE) {
            if (points.length / 2 < 2) {
                throw new DataError(`Polyline must have at least 2 points, but got ${points.length / 2}`);
            }
        } else if (shapeType === ObjectShape.POINTS) {
            if (points.length / 2 < 1) {
                throw new DataError(`Points must have at least 1 points, but got ${points.length / 2}`);
            }
        } else if (shapeType === ObjectShape.CUBOID) {
            if (points.length / 2 !== 8) {
                throw new DataError(`Points must have exact 8 points, but got ${points.length / 2}`);
            }
        } else {
            throw new ArgumentError(`Unknown value of shapeType has been recieved ${shapeType}`);
        }
    }

    function checkShapeArea(shapeType, points) {
        const MIN_SHAPE_LENGTH = 3;
        const MIN_SHAPE_AREA = 9;

        if (shapeType === ObjectShape.POINTS) {
            return true;
        }

        let xmin = Number.MAX_SAFE_INTEGER;
        let xmax = Number.MIN_SAFE_INTEGER;
        let ymin = Number.MAX_SAFE_INTEGER;
        let ymax = Number.MIN_SAFE_INTEGER;

        for (let i = 0; i < points.length - 1; i += 2) {
            xmin = Math.min(xmin, points[i]);
            xmax = Math.max(xmax, points[i]);
            ymin = Math.min(ymin, points[i + 1]);
            ymax = Math.max(ymax, points[i + 1]);
        }

        if (shapeType === ObjectShape.POLYLINE) {
            const length = Math.max(xmax - xmin, ymax - ymin);

            return length >= MIN_SHAPE_LENGTH;
        }

        const area = (xmax - xmin) * (ymax - ymin);
        return area >= MIN_SHAPE_AREA;
    }

    function fitPoints(shapeType, points, maxX, maxY) {
        const fittedPoints = [];

        for (let i = 0; i < points.length - 1; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            checkObjectType('coordinate', x, 'number', null);
            checkObjectType('coordinate', y, 'number', null);

            fittedPoints.push(Math.clamp(x, 0, maxX), Math.clamp(y, 0, maxY));
        }

        return shapeType === ObjectShape.CUBOID ? points : fittedPoints;
    }

    function checkOutside(points, width, height) {
        let inside = false;
        for (let i = 0; i < points.length - 1; i += 2) {
            const [x, y] = points.slice(i);
            inside = inside || (x >= 0 && x <= width && y >= 0 && y <= height);
        }

        return !inside;
    }

    function validateAttributeValue(value, attr) {
        const { values } = attr;
        const type = attr.inputType;

        if (typeof value !== 'string') {
            throw new ArgumentError(`Attribute value is expected to be string, but got ${typeof value}`);
        }

        if (type === AttributeType.NUMBER) {
            return +value >= +values[0] && +value <= +values[1];
        }

        if (type === AttributeType.CHECKBOX) {
            return ['true', 'false'].includes(value.toLowerCase());
        }

        if (type === AttributeType.TEXT) {
            return true;
        }

        return values.includes(value);
    }

    class Annotation {
        constructor(data, clientID, color, injection) {
            this.taskLabels = injection.labels;
            this.history = injection.history;
            this.groupColors = injection.groupColors;
            this.clientID = clientID;
            this.serverID = data.id;
            this.group = data.group;
            this.label = this.taskLabels[data.label_id];
            this.frame = data.frame;
            this.removed = false;
            this.lock = false;
            this.color = color;
            this.source = data.source;
            this.updated = Date.now();
            this.attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});
            this.groupObject = Object.defineProperties(
                {},
                {
                    color: {
                        get: () => {
                            if (this.group) {
                                return this.groupColors[this.group] || colors[this.group % colors.length];
                            }
                            return defaultGroupColor;
                        },
                        set: (newColor) => {
                            if (this.group && typeof newColor === 'string' && /^#[0-9A-F]{6}$/i.test(newColor)) {
                                this.groupColors[this.group] = newColor;
                            }
                        },
                    },
                    id: {
                        get: () => this.group,
                    },
                },
            );
            this.appendDefaultAttributes(this.label);

            injection.groups.max = Math.max(injection.groups.max, this.group);
        }

        _saveLock(lock, frame) {
            const undoLock = this.lock;
            const redoLock = lock;

            this.history.do(
                HistoryActions.CHANGED_LOCK,
                () => {
                    this.lock = undoLock;
                    this.updated = Date.now();
                },
                () => {
                    this.lock = redoLock;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.lock = lock;
        }

        _saveColor(color, frame) {
            const undoColor = this.color;
            const redoColor = color;

            this.history.do(
                HistoryActions.CHANGED_COLOR,
                () => {
                    this.color = undoColor;
                    this.updated = Date.now();
                },
                () => {
                    this.color = redoColor;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.color = color;
        }

        _saveHidden(hidden, frame) {
            const undoHidden = this.hidden;
            const redoHidden = hidden;

            this.history.do(
                HistoryActions.CHANGED_HIDDEN,
                () => {
                    this.hidden = undoHidden;
                    this.updated = Date.now();
                },
                () => {
                    this.hidden = redoHidden;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.hidden = hidden;
        }

        _saveLabel(label, frame) {
            const undoLabel = this.label;
            const redoLabel = label;
            const undoAttributes = { ...this.attributes };
            this.label = label;
            this.attributes = {};
            this.appendDefaultAttributes(label);
            const redoAttributes = { ...this.attributes };

            this.history.do(
                HistoryActions.CHANGED_LABEL,
                () => {
                    this.label = undoLabel;
                    this.attributes = undoAttributes;
                    this.updated = Date.now();
                },
                () => {
                    this.label = redoLabel;
                    this.attributes = redoAttributes;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        _saveAttributes(attributes, frame) {
            const undoAttributes = { ...this.attributes };

            for (const attrID of Object.keys(attributes)) {
                this.attributes[attrID] = attributes[attrID];
            }

            const redoAttributes = { ...this.attributes };

            this.history.do(
                HistoryActions.CHANGED_ATTRIBUTES,
                () => {
                    this.attributes = undoAttributes;
                    this.updated = Date.now();
                },
                () => {
                    this.attributes = redoAttributes;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        _validateStateBeforeSave(frame, data, updated) {
            let fittedPoints = [];

            if (updated.label) {
                checkObjectType('label', data.label, null, Label);
            }

            const labelAttributes = data.label.attributes.reduce((accumulator, value) => {
                accumulator[value.id] = value;
                return accumulator;
            }, {});

            if (updated.attributes) {
                for (const attrID of Object.keys(data.attributes)) {
                    const value = data.attributes[attrID];
                    if (attrID in labelAttributes) {
                        if (!validateAttributeValue(value, labelAttributes[attrID])) {
                            throw new ArgumentError(
                                `Trying to save an attribute attribute with id ${attrID} and invalid value ${value}`,
                            );
                        }
                    } else {
                        throw new ArgumentError(
                            `The label of the shape doesn't have the attribute with id ${attrID} and value ${value}`,
                        );
                    }
                }
            }

            if (updated.points) {
                checkObjectType('points', data.points, null, Array);
                checkNumberOfPoints(this.shapeType, data.points);
                // cut points
                const { width, height } = this.frameMeta[frame];
                fittedPoints = fitPoints(this.shapeType, data.points, width, height);

                if (!checkShapeArea(this.shapeType, fittedPoints) || checkOutside(fittedPoints, width, height)) {
                    fittedPoints = [];
                }
            }

            if (updated.occluded) {
                checkObjectType('occluded', data.occluded, 'boolean', null);
            }

            if (updated.outside) {
                checkObjectType('outside', data.outside, 'boolean', null);
            }

            if (updated.zOrder) {
                checkObjectType('zOrder', data.zOrder, 'integer', null);
            }

            if (updated.lock) {
                checkObjectType('lock', data.lock, 'boolean', null);
            }

            if (updated.pinned) {
                checkObjectType('pinned', data.pinned, 'boolean', null);
            }

            if (updated.color) {
                checkObjectType('color', data.color, 'string', null);
                if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
                    throw new ArgumentError(`Got invalid color value: "${data.color}"`);
                }
            }

            if (updated.hidden) {
                checkObjectType('hidden', data.hidden, 'boolean', null);
            }

            if (updated.keyframe) {
                checkObjectType('keyframe', data.keyframe, 'boolean', null);
                if (!this.shapes || (Object.keys(this.shapes).length === 1 && !data.keyframe)) {
                    throw new ArgumentError(
                        'Can not remove the latest keyframe of an object. Consider removing the object instead',
                    );
                }
            }

            return fittedPoints;
        }

        appendDefaultAttributes(label) {
            const labelAttributes = label.attributes;
            for (const attribute of labelAttributes) {
                if (!(attribute.id in this.attributes)) {
                    this.attributes[attribute.id] = attribute.defaultValue;
                }
            }
        }

        updateTimestamp(updated) {
            const anyChanges = updated.label
                || updated.attributes
                || updated.points
                || updated.outside
                || updated.occluded
                || updated.keyframe
                || updated.zOrder
                || updated.hidden
                || updated.lock
                || updated.pinned;

            if (anyChanges) {
                this.updated = Date.now();
            }
        }

        delete(frame, force) {
            if (!this.lock || force) {
                this.removed = true;

                this.history.do(
                    HistoryActions.REMOVED_OBJECT,
                    () => {
                        this.serverID = undefined;
                        this.removed = false;
                        this.updated = Date.now();
                    },
                    () => {
                        this.removed = true;
                        this.updated = Date.now();
                    },
                    [this.clientID],
                    frame,
                );
            }

            return this.removed;
        }
    }

    class Drawn extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.frameMeta = injection.frameMeta;
            this.hidden = false;
            this.pinned = true;
            this.shapeType = null;
        }

        _savePinned(pinned, frame) {
            const undoPinned = this.pinned;
            const redoPinned = pinned;

            this.history.do(
                HistoryActions.CHANGED_PINNED,
                () => {
                    this.pinned = undoPinned;
                    this.updated = Date.now();
                },
                () => {
                    this.pinned = redoPinned;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.pinned = pinned;
        }

        save() {
            throw new ScriptingError('Is not implemented');
        }

        get() {
            throw new ScriptingError('Is not implemented');
        }

        toJSON() {
            throw new ScriptingError('Is not implemented');
        }
    }

    class Shape extends Drawn {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.points = data.points;
            this.occluded = data.occluded;
            this.zOrder = data.z_order;
        }

        // Method is used to export data to the server
        toJSON() {
            return {
                type: this.shapeType,
                clientID: this.clientID,
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
                source: this.source,
            };
        }

        // Method is used to construct ObjectState objects
        get(frame) {
            if (frame !== this.frame) {
                throw new ScriptingError('Got frame is not equal to the frame of the shape');
            }

            return {
                objectType: ObjectType.SHAPE,
                shapeType: this.shapeType,
                clientID: this.clientID,
                serverID: this.serverID,
                occluded: this.occluded,
                lock: this.lock,
                zOrder: this.zOrder,
                points: [...this.points],
                attributes: { ...this.attributes },
                label: this.label,
                group: this.groupObject,
                color: this.color,
                hidden: this.hidden,
                updated: this.updated,
                pinned: this.pinned,
                frame,
                source: this.source,
            };
        }

        _savePoints(points, frame) {
            const undoPoints = this.points;
            const redoPoints = points;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;

            this.history.do(
                HistoryActions.CHANGED_POINTS,
                () => {
                    this.points = undoPoints;
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    this.points = redoPoints;
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.source = Source.MANUAL;
            this.points = points;
        }

        _saveOccluded(occluded, frame) {
            const undoOccluded = this.occluded;
            const redoOccluded = occluded;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;

            this.history.do(
                HistoryActions.CHANGED_OCCLUDED,
                () => {
                    this.occluded = undoOccluded;
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    this.occluded = redoOccluded;
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.source = Source.MANUAL;
            this.occluded = occluded;
        }

        _saveZOrder(zOrder, frame) {
            const undoZOrder = this.zOrder;
            const redoZOrder = zOrder;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;

            this.history.do(
                HistoryActions.CHANGED_ZORDER,
                () => {
                    this.zOrder = undoZOrder;
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    this.zOrder = redoZOrder;
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.source = Source.MANUAL;
            this.zOrder = zOrder;
        }

        save(frame, data) {
            if (frame !== this.frame) {
                throw new ScriptingError('Got frame is not equal to the frame of the shape');
            }

            if (this.lock && data.lock) {
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            const updated = data.updateFlags;
            const fittedPoints = this._validateStateBeforeSave(frame, data, updated);

            // Now when all fields are validated, we can apply them
            if (updated.label) {
                this._saveLabel(data.label, frame);
            }

            if (updated.attributes) {
                this._saveAttributes(data.attributes, frame);
            }

            if (updated.points && fittedPoints.length) {
                this._savePoints(fittedPoints, frame);
            }

            if (updated.occluded) {
                this._saveOccluded(data.occluded, frame);
            }

            if (updated.zOrder) {
                this._saveZOrder(data.zOrder, frame);
            }

            if (updated.lock) {
                this._saveLock(data.lock, frame);
            }

            if (updated.pinned) {
                this._savePinned(data.pinned, frame);
            }

            if (updated.color) {
                this._saveColor(data.color, frame);
            }

            if (updated.hidden) {
                this._saveHidden(data.hidden, frame);
            }

            this.updateTimestamp(updated);
            updated.reset();

            return objectStateFactory.call(this, frame, this.get(frame));
        }
    }

    class Track extends Drawn {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapes = data.shapes.reduce((shapeAccumulator, value) => {
                shapeAccumulator[value.frame] = {
                    serverID: value.id,
                    occluded: value.occluded,
                    zOrder: value.z_order,
                    points: value.points,
                    outside: value.outside,
                    attributes: value.attributes.reduce((attributeAccumulator, attr) => {
                        attributeAccumulator[attr.spec_id] = attr.value;
                        return attributeAccumulator;
                    }, {}),
                };

                return shapeAccumulator;
            }, {});
        }

        // Method is used to export data to the server
        toJSON() {
            const labelAttributes = this.label.attributes.reduce((accumulator, attribute) => {
                accumulator[attribute.id] = attribute;
                return accumulator;
            }, {});

            return {
                clientID: this.clientID,
                id: this.serverID,
                frame: this.frame,
                label_id: this.label.id,
                group: this.group,
                source: this.source,
                attributes: Object.keys(this.attributes).reduce((attributeAccumulator, attrId) => {
                    if (!labelAttributes[attrId].mutable) {
                        attributeAccumulator.push({
                            spec_id: attrId,
                            value: this.attributes[attrId],
                        });
                    }

                    return attributeAccumulator;
                }, []),
                shapes: Object.keys(this.shapes).reduce((shapesAccumulator, frame) => {
                    shapesAccumulator.push({
                        type: this.shapeType,
                        occluded: this.shapes[frame].occluded,
                        z_order: this.shapes[frame].zOrder,
                        points: [...this.shapes[frame].points],
                        outside: this.shapes[frame].outside,
                        attributes: Object.keys(this.shapes[frame].attributes).reduce(
                            (attributeAccumulator, attrId) => {
                                if (labelAttributes[attrId].mutable) {
                                    attributeAccumulator.push({
                                        spec_id: attrId,
                                        value: this.shapes[frame].attributes[attrId],
                                    });
                                }

                                return attributeAccumulator;
                            },
                            [],
                        ),
                        id: this.shapes[frame].serverID,
                        frame: +frame,
                    });

                    return shapesAccumulator;
                }, []),
            };
        }

        // Method is used to construct ObjectState objects
        get(frame) {
            const {
                prev, next, first, last,
            } = this.boundedKeyframes(frame);

            return {
                ...this.getPosition(frame, prev, next),
                attributes: this.getAttributes(frame),
                group: this.groupObject,
                objectType: ObjectType.TRACK,
                shapeType: this.shapeType,
                clientID: this.clientID,
                serverID: this.serverID,
                lock: this.lock,
                color: this.color,
                hidden: this.hidden,
                updated: this.updated,
                label: this.label,
                pinned: this.pinned,
                keyframes: {
                    prev,
                    next,
                    first,
                    last,
                },
                frame,
                source: this.source,
            };
        }

        boundedKeyframes(targetFrame) {
            const frames = Object.keys(this.shapes).map((frame) => +frame);
            let lDiff = Number.MAX_SAFE_INTEGER;
            let rDiff = Number.MAX_SAFE_INTEGER;
            let first = Number.MAX_SAFE_INTEGER;
            let last = Number.MIN_SAFE_INTEGER;

            for (const frame of frames) {
                if (frame < first) {
                    first = frame;
                }
                if (frame > last) {
                    last = frame;
                }

                const diff = Math.abs(targetFrame - frame);

                if (frame < targetFrame && diff < lDiff) {
                    lDiff = diff;
                } else if (frame > targetFrame && diff < rDiff) {
                    rDiff = diff;
                }
            }

            const prev = lDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame - lDiff;
            const next = rDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame + rDiff;

            return {
                prev,
                next,
                first,
                last,
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

        _saveLabel(label, frame) {
            const undoLabel = this.label;
            const redoLabel = label;
            const undoAttributes = {
                unmutable: { ...this.attributes },
                mutable: Object.keys(this.shapes).map((key) => ({
                    frame: +key,
                    attributes: { ...this.shapes[key].attributes },
                })),
            };

            this.label = label;
            this.attributes = {};
            for (const shape of Object.values(this.shapes)) {
                shape.attributes = {};
            }
            this.appendDefaultAttributes(label);

            const redoAttributes = {
                unmutable: { ...this.attributes },
                mutable: Object.keys(this.shapes).map((key) => ({
                    frame: +key,
                    attributes: { ...this.shapes[key].attributes },
                })),
            };

            this.history.do(
                HistoryActions.CHANGED_LABEL,
                () => {
                    this.label = undoLabel;
                    this.attributes = undoAttributes.unmutable;
                    for (const mutable of undoAttributes.mutable) {
                        this.shapes[mutable.frame].attributes = mutable.attributes;
                    }
                    this.updated = Date.now();
                },
                () => {
                    this.label = redoLabel;
                    this.attributes = redoAttributes.unmutable;
                    for (const mutable of redoAttributes.mutable) {
                        this.shapes[mutable.frame].attributes = mutable.attributes;
                    }
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        _saveAttributes(attributes, frame) {
            const current = this.get(frame);
            const labelAttributes = this.label.attributes.reduce((accumulator, value) => {
                accumulator[value.id] = value;
                return accumulator;
            }, {});

            const wasKeyframe = frame in this.shapes;
            const undoAttributes = this.attributes;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;

            let mutableAttributesUpdated = false;
            const redoAttributes = { ...this.attributes };
            for (const attrID of Object.keys(attributes)) {
                if (!labelAttributes[attrID].mutable) {
                    redoAttributes[attrID] = attributes[attrID];
                } else if (attributes[attrID] !== current.attributes[attrID]) {
                    mutableAttributesUpdated = mutableAttributesUpdated
                        // not keyframe yet
                        || !(frame in this.shapes)
                        // keyframe, but without this attrID
                        || !(attrID in this.shapes[frame].attributes)
                        // keyframe with attrID, but with another value
                        || this.shapes[frame].attributes[attrID] !== attributes[attrID];
                }
            }
            let redoShape;
            if (mutableAttributesUpdated) {
                if (wasKeyframe) {
                    redoShape = {
                        ...this.shapes[frame],
                        attributes: {
                            ...this.shapes[frame].attributes,
                        },
                    };
                } else {
                    redoShape = {
                        frame,
                        zOrder: current.zOrder,
                        points: current.points,
                        outside: current.outside,
                        occluded: current.occluded,
                        attributes: {},
                    };
                }
            }

            for (const attrID of Object.keys(attributes)) {
                if (labelAttributes[attrID].mutable && attributes[attrID] !== current.attributes[attrID]) {
                    redoShape.attributes[attrID] = attributes[attrID];
                }
            }

            this.attributes = redoAttributes;
            if (redoShape) {
                this.shapes[frame] = redoShape;
            }

            this.history.do(
                HistoryActions.CHANGED_ATTRIBUTES,
                () => {
                    this.attributes = undoAttributes;
                    if (undoShape) {
                        this.shapes[frame] = undoShape;
                    } else if (redoShape) {
                        delete this.shapes[frame];
                    }
                    this.updated = Date.now();
                },
                () => {
                    this.attributes = redoAttributes;
                    if (redoShape) {
                        this.shapes[frame] = redoShape;
                    }
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        _appendShapeActionToHistory(actionType, frame, undoShape, redoShape, undoSource, redoSource) {
            this.history.do(
                actionType,
                () => {
                    if (!undoShape) {
                        delete this.shapes[frame];
                    } else {
                        this.shapes[frame] = undoShape;
                    }
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    if (!redoShape) {
                        delete this.shapes[frame];
                    } else {
                        this.shapes[frame] = redoShape;
                    }
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        _savePoints(points, frame) {
            const current = this.get(frame);
            const wasKeyframe = frame in this.shapes;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
            const redoShape = wasKeyframe
                ? { ...this.shapes[frame], points }
                : {
                    frame,
                    points,
                    zOrder: current.zOrder,
                    outside: current.outside,
                    occluded: current.occluded,
                    attributes: {},
                };

            this.shapes[frame] = redoShape;
            this.source = Source.MANUAL;
            this._appendShapeActionToHistory(
                HistoryActions.CHANGED_POINTS,
                frame,
                undoShape,
                redoShape,
                undoSource,
                redoSource,
            );
        }

        _saveOutside(frame, outside) {
            const current = this.get(frame);
            const wasKeyframe = frame in this.shapes;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
            const redoShape = wasKeyframe
                ? { ...this.shapes[frame], outside }
                : {
                    frame,
                    outside,
                    zOrder: current.zOrder,
                    points: current.points,
                    occluded: current.occluded,
                    attributes: {},
                };

            this.shapes[frame] = redoShape;
            this.source = Source.MANUAL;
            this._appendShapeActionToHistory(
                HistoryActions.CHANGED_OUTSIDE,
                frame,
                undoShape,
                redoShape,
                undoSource,
                redoSource,
            );
        }

        _saveOccluded(occluded, frame) {
            const current = this.get(frame);
            const wasKeyframe = frame in this.shapes;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
            const redoShape = wasKeyframe
                ? { ...this.shapes[frame], occluded }
                : {
                    frame,
                    occluded,
                    zOrder: current.zOrder,
                    points: current.points,
                    outside: current.outside,
                    attributes: {},
                };

            this.shapes[frame] = redoShape;
            this.source = Source.MANUAL;
            this._appendShapeActionToHistory(
                HistoryActions.CHANGED_OCCLUDED,
                frame,
                undoShape,
                redoShape,
                undoSource,
                redoSource,
            );
        }

        _saveZOrder(zOrder, frame) {
            const current = this.get(frame);
            const wasKeyframe = frame in this.shapes;
            const undoSource = this.source;
            const redoSource = Source.MANUAL;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
            const redoShape = wasKeyframe
                ? { ...this.shapes[frame], zOrder }
                : {
                    frame,
                    zOrder,
                    occluded: current.occluded,
                    points: current.points,
                    outside: current.outside,
                    attributes: {},
                };

            this.shapes[frame] = redoShape;
            this.source = Source.MANUAL;
            this._appendShapeActionToHistory(
                HistoryActions.CHANGED_ZORDER,
                frame,
                undoShape,
                redoShape,
                undoSource,
                redoSource,
            );
        }

        _saveKeyframe(frame, keyframe) {
            const current = this.get(frame);
            const wasKeyframe = frame in this.shapes;

            if ((keyframe && wasKeyframe) || (!keyframe && !wasKeyframe)) {
                return;
            }

            const undoSource = this.source;
            const redoSource = Source.MANUAL;
            const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
            const redoShape = keyframe
                ? {
                    frame,
                    zOrder: current.zOrder,
                    points: current.points,
                    outside: current.outside,
                    occluded: current.occluded,
                    attributes: {},
                    source: current.source,
                }
                : undefined;

            this.source = Source.MANUAL;
            if (redoShape) {
                this.shapes[frame] = redoShape;
            } else {
                delete this.shapes[frame];
            }

            this._appendShapeActionToHistory(
                HistoryActions.CHANGED_KEYFRAME,
                frame,
                undoShape,
                redoShape,
                undoSource,
                redoSource,
            );
        }

        save(frame, data) {
            if (this.lock && data.lock) {
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            const updated = data.updateFlags;
            const fittedPoints = this._validateStateBeforeSave(frame, data, updated);

            if (updated.label) {
                this._saveLabel(data.label, frame);
            }

            if (updated.lock) {
                this._saveLock(data.lock, frame);
            }

            if (updated.pinned) {
                this._savePinned(data.pinned, frame);
            }

            if (updated.color) {
                this._saveColor(data.color, frame);
            }

            if (updated.hidden) {
                this._saveHidden(data.hidden, frame);
            }

            if (updated.points && fittedPoints.length) {
                this._savePoints(fittedPoints, frame);
            }

            if (updated.outside) {
                this._saveOutside(frame, data.outside);
            }

            if (updated.occluded) {
                this._saveOccluded(data.occluded, frame);
            }

            if (updated.zOrder) {
                this._saveZOrder(data.zOrder, frame);
            }

            if (updated.attributes) {
                this._saveAttributes(data.attributes, frame);
            }

            if (updated.keyframe) {
                this._saveKeyframe(frame, data.keyframe);
            }

            this.updateTimestamp(updated);
            updated.reset();

            return objectStateFactory.call(this, frame, this.get(frame));
        }

        getPosition(targetFrame, leftKeyframe, rightFrame) {
            const leftFrame = targetFrame in this.shapes ? targetFrame : leftKeyframe;
            const rightPosition = Number.isInteger(rightFrame) ? this.shapes[rightFrame] : null;
            const leftPosition = Number.isInteger(leftFrame) ? this.shapes[leftFrame] : null;

            if (leftPosition && rightPosition) {
                return {
                    ...this.interpolatePosition(
                        leftPosition,
                        rightPosition,
                        (targetFrame - leftFrame) / (rightFrame - leftFrame),
                    ),
                    keyframe: targetFrame in this.shapes,
                };
            }

            if (leftPosition) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: leftPosition.zOrder,
                    keyframe: targetFrame in this.shapes,
                };
            }

            if (rightPosition) {
                return {
                    points: [...rightPosition.points],
                    occluded: rightPosition.occluded,
                    outside: true,
                    zOrder: rightPosition.zOrder,
                    keyframe: targetFrame in this.shapes,
                };
            }

            throw new DataError(
                'No one left position or right position was found. '
                    + `Interpolation impossible. Client ID: ${this.clientID}`,
            );
        }
    }

    class Tag extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
        }

        // Method is used to export data to the server
        toJSON() {
            return {
                clientID: this.clientID,
                id: this.serverID,
                frame: this.frame,
                label_id: this.label.id,
                group: this.group,
                source: this.source,
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
                throw new ScriptingError('Got frame is not equal to the frame of the shape');
            }

            return {
                objectType: ObjectType.TAG,
                clientID: this.clientID,
                serverID: this.serverID,
                lock: this.lock,
                attributes: { ...this.attributes },
                label: this.label,
                group: this.groupObject,
                color: this.color,
                updated: this.updated,
                frame,
                source: this.source,
            };
        }

        save(frame, data) {
            if (frame !== this.frame) {
                throw new ScriptingError('Got frame is not equal to the frame of the tag');
            }

            if (this.lock && data.lock) {
                return objectStateFactory.call(this, frame, this.get(frame));
            }

            const updated = data.updateFlags;
            this._validateStateBeforeSave(frame, data, updated);

            // Now when all fields are validated, we can apply them
            if (updated.label) {
                this._saveLabel(data.label, frame);
            }

            if (updated.attributes) {
                this._saveAttributes(data.attributes, frame);
            }

            if (updated.lock) {
                this._saveLock(data.lock, frame);
            }

            if (updated.color) {
                this._saveColor(data.color, frame);
            }

            this.updateTimestamp(updated);
            updated.reset();

            return objectStateFactory.call(this, frame, this.get(frame));
        }
    }

    class RectangleShape extends Shape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.RECTANGLE;
            this.pinned = false;
            checkNumberOfPoints(this.shapeType, this.points);
        }

        static distance(points, x, y) {
            const [xtl, ytl, xbr, ybr] = points;

            if (!(x >= xtl && x <= xbr && y >= ytl && y <= ybr)) {
                // Cursor is outside of a box
                return null;
            }

            // The shortest distance from point to an edge
            return Math.min.apply(null, [x - xtl, y - ytl, xbr - x, ybr - y]);
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
            this.shapeType = ObjectShape.POLYGON;
            checkNumberOfPoints(this.shapeType, this.points);
        }

        static distance(points, x, y) {
            function position(x1, y1, x2, y2) {
                return (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
            }

            let wn = 0;
            const distances = [];

            for (let i = 0, j = points.length - 2; i < points.length - 1; j = i, i += 2) {
                // Current point
                const x1 = points[j];
                const y1 = points[j + 1];

                // Next point
                const x2 = points[i];
                const y2 = points[i + 1];

                // Check if a point is inside a polygon
                // with a winding numbers algorithm
                // https://en.wikipedia.org/wiki/Point_in_polygon#Winding_number_algorithm
                if (y1 <= y) {
                    if (y2 > y) {
                        if (position(x1, y1, x2, y2) > 0) {
                            wn++;
                        }
                    }
                } else if (y2 <= y) {
                    if (position(x1, y1, x2, y2) < 0) {
                        wn--;
                    }
                }

                // Find the shortest distance from point to an edge
                // Get an equation of a line in general
                const aCoef = y1 - y2;
                const bCoef = x2 - x1;

                // Vector (aCoef, bCoef) is a perpendicular to line
                // Now find the point where two lines
                // (edge and its perpendicular through the point (x,y)) are cross
                const xCross = x - aCoef;
                const yCross = y - bCoef;

                if ((xCross - x1) * (x2 - xCross) >= 0 && (yCross - y1) * (y2 - yCross) >= 0) {
                    // Cross point is on segment between p1(x1,y1) and p2(x2,y2)
                    distances.push(Math.sqrt(Math.pow(x - xCross, 2) + Math.pow(y - yCross, 2)));
                } else {
                    distances.push(
                        Math.min(
                            Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)),
                            Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2)),
                        ),
                    );
                }
            }

            if (wn !== 0) {
                return Math.min.apply(null, distances);
            }

            return null;
        }
    }

    class PolylineShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.POLYLINE;
            checkNumberOfPoints(this.shapeType, this.points);
        }

        static distance(points, x, y) {
            const distances = [];
            for (let i = 0; i < points.length - 2; i += 2) {
                // Current point
                const x1 = points[i];
                const y1 = points[i + 1];

                // Next point
                const x2 = points[i + 2];
                const y2 = points[i + 3];

                // Find the shortest distance from point to an edge
                if ((x - x1) * (x2 - x) >= 0 && (y - y1) * (y2 - y) >= 0) {
                    // Find the length of a perpendicular
                    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
                    distances.push(
                        Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
                            / Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2)),
                    );
                } else {
                    // The link below works for lines (which have infinit length)
                    // There is a case when perpendicular doesn't cross the edge
                    // In this case we don't use the computed distance
                    // Instead we use just distance to the nearest point
                    distances.push(
                        Math.min(
                            Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)),
                            Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2)),
                        ),
                    );
                }
            }

            return Math.min.apply(null, distances);
        }
    }

    class PointsShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.POINTS;
            checkNumberOfPoints(this.shapeType, this.points);
        }

        static distance(points, x, y) {
            const distances = [];
            for (let i = 0; i < points.length; i += 2) {
                const x1 = points[i];
                const y1 = points[i + 1];

                distances.push(Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)));
            }

            return Math.min.apply(null, distances);
        }
    }

    class CuboidShape extends Shape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.CUBOID;
            this.pinned = false;
            checkNumberOfPoints(this.shapeType, this.points);
        }

        static makeHull(geoPoints) {
            // Returns the convex hull, assuming that each points[i] <= points[i + 1].
            function makeHullPresorted(points) {
                if (points.length <= 1) return points.slice();

                // Andrew's monotone chain algorithm. Positive y coordinates correspond to 'up'
                // as per the mathematical convention, instead of 'down' as per the computer
                // graphics convention. This doesn't affect the correctness of the result.

                const upperHull = [];
                for (let i = 0; i < points.length; i += 1) {
                    const p = points[`${i}`];
                    while (upperHull.length >= 2) {
                        const q = upperHull[upperHull.length - 1];
                        const r = upperHull[upperHull.length - 2];
                        if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upperHull.pop();
                        else break;
                    }
                    upperHull.push(p);
                }
                upperHull.pop();

                const lowerHull = [];
                for (let i = points.length - 1; i >= 0; i -= 1) {
                    const p = points[`${i}`];
                    while (lowerHull.length >= 2) {
                        const q = lowerHull[lowerHull.length - 1];
                        const r = lowerHull[lowerHull.length - 2];
                        if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
                        else break;
                    }
                    lowerHull.push(p);
                }
                lowerHull.pop();

                if (
                    upperHull.length === 1
                    && lowerHull.length === 1
                    && upperHull[0].x === lowerHull[0].x
                    && upperHull[0].y === lowerHull[0].y
                ) return upperHull;
                return upperHull.concat(lowerHull);
            }

            function POINT_COMPARATOR(a, b) {
                if (a.x < b.x) return -1;
                if (a.x > b.x) return +1;
                if (a.y < b.y) return -1;
                if (a.y > b.y) return +1;
                return 0;
            }

            const newPoints = geoPoints.slice();
            newPoints.sort(POINT_COMPARATOR);
            return makeHullPresorted(newPoints);
        }

        static contain(points, x, y) {
            function isLeft(P0, P1, P2) {
                return (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y);
            }
            points = CuboidShape.makeHull(points);
            let wn = 0;
            for (let i = 0; i < points.length; i += 1) {
                const p1 = points[`${i}`];
                const p2 = points[i + 1] || points[0];

                if (p1.y <= y) {
                    if (p2.y > y) {
                        if (isLeft(p1, p2, { x, y }) > 0) {
                            wn += 1;
                        }
                    }
                } else if (p2.y < y) {
                    if (isLeft(p1, p2, { x, y }) < 0) {
                        wn -= 1;
                    }
                }
            }

            return wn !== 0;
        }

        static distance(actualPoints, x, y) {
            const points = [];

            for (let i = 0; i < 16; i += 2) {
                points.push({ x: actualPoints[i], y: actualPoints[i + 1] });
            }

            if (!CuboidShape.contain(points, x, y)) return null;

            let minDistance = Number.MAX_SAFE_INTEGER;
            for (let i = 0; i < points.length; i += 1) {
                const p1 = points[`${i}`];
                const p2 = points[i + 1] || points[0];

                // perpendicular from point to straight length
                const distance = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x)
                    / Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));

                // check if perpendicular belongs to the straight segment
                const a = Math.pow(p1.x - x, 2) + Math.pow(p1.y - y, 2);
                const b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
                const c = Math.pow(p2.x - x, 2) + Math.pow(p2.y - y, 2);
                if (distance < minDistance && a + b - c >= 0 && c + b - a >= 0) {
                    minDistance = distance;
                }
            }
            return minDistance;
        }
    }

    class RectangleTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.RECTANGLE;
            this.pinned = false;
            for (const shape of Object.values(this.shapes)) {
                checkNumberOfPoints(this.shapeType, shape.points);
            }
        }

        interpolatePosition(leftPosition, rightPosition, offset) {
            const positionOffset = leftPosition.points.map((point, index) => rightPosition.points[index] - point);

            return {
                points: leftPosition.points.map((point, index) => point + positionOffset[index] * offset),
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

        interpolatePosition(leftPosition, rightPosition, offset) {
            if (offset === 0) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: leftPosition.zOrder,
                };
            }

            function toArray(points) {
                return points.reduce((acc, val) => {
                    acc.push(val.x, val.y);
                    return acc;
                }, []);
            }

            function toPoints(array) {
                return array.reduce((acc, _, index) => {
                    if (index % 2) {
                        acc.push({
                            x: array[index - 1],
                            y: array[index],
                        });
                    }

                    return acc;
                }, []);
            }

            function curveLength(points) {
                return points.slice(1).reduce((acc, _, index) => {
                    const dx = points[index + 1].x - points[index].x;
                    const dy = points[index + 1].y - points[index].y;
                    return acc + Math.sqrt(dx ** 2 + dy ** 2);
                }, 0);
            }

            function curveToOffsetVec(points, length) {
                const offsetVector = [0]; // with initial value
                let accumulatedLength = 0;

                points.slice(1).forEach((_, index) => {
                    const dx = points[index + 1].x - points[index].x;
                    const dy = points[index + 1].y - points[index].y;
                    accumulatedLength += Math.sqrt(dx ** 2 + dy ** 2);
                    offsetVector.push(accumulatedLength / length);
                });

                return offsetVector;
            }

            function findNearestPair(value, curve) {
                let minimum = [0, Math.abs(value - curve[0])];
                for (let i = 1; i < curve.length; i++) {
                    const distance = Math.abs(value - curve[i]);
                    if (distance < minimum[1]) {
                        minimum = [i, distance];
                    }
                }

                return minimum[0];
            }

            function matchLeftRight(leftCurve, rightCurve) {
                const matching = {};
                for (let i = 0; i < leftCurve.length; i++) {
                    matching[i] = [findNearestPair(leftCurve[i], rightCurve)];
                }

                return matching;
            }

            function matchRightLeft(leftCurve, rightCurve, leftRightMatching) {
                const matchedRightPoints = Object.values(leftRightMatching).flat();
                const unmatchedRightPoints = rightCurve
                    .map((_, index) => index)
                    .filter((index) => !matchedRightPoints.includes(index));
                const updatedMatching = { ...leftRightMatching };

                for (const rightPoint of unmatchedRightPoints) {
                    const leftPoint = findNearestPair(rightCurve[rightPoint], leftCurve);
                    updatedMatching[leftPoint].push(rightPoint);
                }

                for (const key of Object.keys(updatedMatching)) {
                    const sortedRightIndexes = updatedMatching[key].sort((a, b) => a - b);
                    updatedMatching[key] = sortedRightIndexes;
                }

                return updatedMatching;
            }

            function reduceInterpolation(interpolatedPoints, matching, leftPoints, rightPoints) {
                function averagePoint(points) {
                    let sumX = 0;
                    let sumY = 0;
                    for (const point of points) {
                        sumX += point.x;
                        sumY += point.y;
                    }

                    return {
                        x: sumX / points.length,
                        y: sumY / points.length,
                    };
                }

                function computeDistance(point1, point2) {
                    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
                }

                function minimizeSegment(baseLength, N, startInterpolated, stopInterpolated) {
                    const threshold = baseLength / (2 * N);
                    const minimized = [interpolatedPoints[startInterpolated]];
                    let latestPushed = startInterpolated;
                    for (let i = startInterpolated + 1; i < stopInterpolated; i++) {
                        const distance = computeDistance(interpolatedPoints[latestPushed], interpolatedPoints[i]);

                        if (distance >= threshold) {
                            minimized.push(interpolatedPoints[i]);
                            latestPushed = i;
                        }
                    }

                    minimized.push(interpolatedPoints[stopInterpolated]);

                    if (minimized.length === 2) {
                        const distance = computeDistance(
                            interpolatedPoints[startInterpolated],
                            interpolatedPoints[stopInterpolated],
                        );

                        if (distance < threshold) {
                            return [averagePoint(minimized)];
                        }
                    }

                    return minimized;
                }

                const reduced = [];
                const interpolatedIndexes = {};
                let accumulated = 0;
                for (let i = 0; i < leftPoints.length; i++) {
                    // eslint-disable-next-line
                    interpolatedIndexes[i] = matching[i].map(() => accumulated++);
                }

                function leftSegment(start, stop) {
                    const startInterpolated = interpolatedIndexes[start][0];
                    const stopInterpolated = interpolatedIndexes[stop][0];

                    if (startInterpolated === stopInterpolated) {
                        reduced.push(interpolatedPoints[startInterpolated]);
                        return;
                    }

                    const baseLength = curveLength(leftPoints.slice(start, stop + 1));
                    const N = stop - start + 1;

                    reduced.push(...minimizeSegment(baseLength, N, startInterpolated, stopInterpolated));
                }

                function rightSegment(leftPoint) {
                    const start = matching[leftPoint][0];
                    const [stop] = matching[leftPoint].slice(-1);
                    const startInterpolated = interpolatedIndexes[leftPoint][0];
                    const [stopInterpolated] = interpolatedIndexes[leftPoint].slice(-1);
                    const baseLength = curveLength(rightPoints.slice(start, stop + 1));
                    const N = stop - start + 1;

                    reduced.push(...minimizeSegment(baseLength, N, startInterpolated, stopInterpolated));
                }

                let previousOpened = null;
                for (let i = 0; i < leftPoints.length; i++) {
                    if (matching[i].length === 1) {
                        // check if left segment is opened
                        if (previousOpened !== null) {
                            // check if we should continue the left segment
                            if (matching[i][0] === matching[previousOpened][0]) {
                                continue;
                            } else {
                                // left segment found
                                const start = previousOpened;
                                const stop = i - 1;
                                leftSegment(start, stop);

                                // start next left segment
                                previousOpened = i;
                            }
                        } else {
                            // start next left segment
                            previousOpened = i;
                        }
                    } else {
                        // check if left segment is opened
                        if (previousOpened !== null) {
                            // left segment found
                            const start = previousOpened;
                            const stop = i - 1;
                            leftSegment(start, stop);

                            previousOpened = null;
                        }

                        // right segment found
                        rightSegment(i);
                    }
                }

                // check if there is an opened segment
                if (previousOpened !== null) {
                    leftSegment(previousOpened, leftPoints.length - 1);
                }

                return reduced;
            }

            // the algorithm below is based on fact that both left and right
            // polyshapes have the same start point and the same draw direction
            const leftPoints = toPoints(leftPosition.points);
            const rightPoints = toPoints(rightPosition.points);
            const leftOffsetVec = curveToOffsetVec(leftPoints, curveLength(leftPoints));
            const rightOffsetVec = curveToOffsetVec(rightPoints, curveLength(rightPoints));

            const matching = matchLeftRight(leftOffsetVec, rightOffsetVec);
            const completedMatching = matchRightLeft(leftOffsetVec, rightOffsetVec, matching);

            const interpolatedPoints = Object.keys(completedMatching)
                .map((leftPointIdx) => +leftPointIdx)
                .sort((a, b) => a - b)
                .reduce((acc, leftPointIdx) => {
                    const leftPoint = leftPoints[leftPointIdx];
                    for (const rightPointIdx of completedMatching[leftPointIdx]) {
                        const rightPoint = rightPoints[rightPointIdx];
                        acc.push({
                            x: leftPoint.x + (rightPoint.x - leftPoint.x) * offset,
                            y: leftPoint.y + (rightPoint.y - leftPoint.y) * offset,
                        });
                    }

                    return acc;
                }, []);

            const reducedPoints = reduceInterpolation(interpolatedPoints, completedMatching, leftPoints, rightPoints);

            return {
                points: toArray(reducedPoints),
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }
    }

    class PolygonTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.POLYGON;
            for (const shape of Object.values(this.shapes)) {
                checkNumberOfPoints(this.shapeType, shape.points);
            }
        }

        interpolatePosition(leftPosition, rightPosition, offset) {
            const copyLeft = {
                ...leftPosition,
                points: [...leftPosition.points, leftPosition.points[0], leftPosition.points[1]],
            };

            const copyRight = {
                ...rightPosition,
                points: [...rightPosition.points, rightPosition.points[0], rightPosition.points[1]],
            };

            const result = PolyTrack.prototype.interpolatePosition.call(this, copyLeft, copyRight, offset);

            return {
                ...result,
                points: result.points.slice(0, -2),
            };
        }
    }

    class PolylineTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.POLYLINE;
            for (const shape of Object.values(this.shapes)) {
                checkNumberOfPoints(this.shapeType, shape.points);
            }
        }
    }

    class PointsTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.POINTS;
            for (const shape of Object.values(this.shapes)) {
                checkNumberOfPoints(this.shapeType, shape.points);
            }
        }

        interpolatePosition(leftPosition, rightPosition, offset) {
            // interpolate only when one point in both left and right positions
            if (leftPosition.points.length === 2 && rightPosition.points.length === 2) {
                return {
                    points: leftPosition.points.map(
                        (value, index) => value + (rightPosition.points[index] - value) * offset,
                    ),
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: leftPosition.zOrder,
                };
            }

            return {
                points: [...leftPosition.points],
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }
    }

    class CuboidTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this.shapeType = ObjectShape.CUBOID;
            this.pinned = false;
            for (const shape of Object.values(this.shapes)) {
                checkNumberOfPoints(this.shapeType, shape.points);
            }
        }

        interpolatePosition(leftPosition, rightPosition, offset) {
            const positionOffset = leftPosition.points.map((point, index) => rightPosition.points[index] - point);

            return {
                points: leftPosition.points.map((point, index) => point + positionOffset[index] * offset),
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }
    }

    RectangleTrack.distance = RectangleShape.distance;
    PolygonTrack.distance = PolygonShape.distance;
    PolylineTrack.distance = PolylineShape.distance;
    PointsTrack.distance = PointsShape.distance;
    CuboidTrack.distance = CuboidShape.distance;

    module.exports = {
        RectangleShape,
        PolygonShape,
        PolylineShape,
        PointsShape,
        CuboidShape,
        RectangleTrack,
        PolygonTrack,
        PolylineTrack,
        PointsTrack,
        CuboidTrack,
        Track,
        Shape,
        Tag,
        objectStateFactory,
    };
})();
