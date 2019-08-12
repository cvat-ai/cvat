/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const {
        RectangleShape,
        PolygonShape,
        PolylineShape,
        PointsShape,
        RectangleTrack,
        PolygonTrack,
        PolylineTrack,
        PointsTrack,
        Track,
        Shape,
        Tag,
        objectStateFactory,
    } = require('./annotations-objects');
    const { checkObjectType } = require('./common');
    const Statistics = require('./statistics');
    const { Label } = require('./labels');
    const {
        DataError,
        ArgumentError,
        ScriptingError,
    } = require('./exceptions');

    const {
        ObjectShape,
        ObjectType,
    } = require('./enums');
    const ObjectState = require('./object-state');

    const colors = [
        '#0066FF', '#AF593E', '#01A368', '#FF861F', '#ED0A3F', '#FF3F34', '#76D7EA',
        '#8359A3', '#FBE870', '#C5E17A', '#03BB85', '#FFDF00', '#8B8680', '#0A6B0D',
        '#8FD8D8', '#A36F40', '#F653A6', '#CA3435', '#FFCBA4', '#FF99CC', '#FA9D5A',
        '#FFAE42', '#A78B00', '#788193', '#514E49', '#1164B4', '#F4FA9F', '#FED8B1',
        '#C32148', '#01796F', '#E90067', '#FF91A4', '#404E5A', '#6CDAE7', '#FFC1CC',
        '#006A93', '#867200', '#E2B631', '#6EEB6E', '#FFC800', '#CC99BA', '#FF007C',
        '#BC6CAC', '#DCCCD7', '#EBE1C2', '#A6AAAE', '#B99685', '#0086A7', '#5E4330',
        '#C8A2C8', '#708EB3', '#BC8777', '#B2592D', '#497E48', '#6A2963', '#E6335F',
        '#00755E', '#B5A895', '#0048ba', '#EED9C4', '#C88A65', '#FF6E4A', '#87421F',
        '#B2BEB5', '#926F5B', '#00B9FB', '#6456B7', '#DB5079', '#C62D42', '#FA9C44',
        '#DA8A67', '#FD7C6E', '#93CCEA', '#FCF686', '#503E32', '#FF5470', '#9DE093',
        '#FF7A00', '#4F69C6', '#A50B5E', '#F0E68C', '#FDFF00', '#F091A9', '#FFFF66',
        '#6F9940', '#FC74FD', '#652DC1', '#D6AEDD', '#EE34D2', '#BB3385', '#6B3FA0',
        '#33CC99', '#FFDB00', '#87FF2A', '#6EEB6E', '#FFC800', '#CC99BA', '#7A89B8',
        '#006A93', '#867200', '#E2B631', '#D9D6CF',
    ];

    function shapeFactory(shapeData, clientID, injection) {
        const { type } = shapeData;
        const color = colors[clientID % colors.length];

        let shapeModel = null;
        switch (type) {
        case 'rectangle':
            shapeModel = new RectangleShape(shapeData, clientID, color, injection);
            break;
        case 'polygon':
            shapeModel = new PolygonShape(shapeData, clientID, color, injection);
            break;
        case 'polyline':
            shapeModel = new PolylineShape(shapeData, clientID, color, injection);
            break;
        case 'points':
            shapeModel = new PointsShape(shapeData, clientID, color, injection);
            break;
        default:
            throw new DataError(
                `An unexpected type of shape "${type}"`,
            );
        }

        return shapeModel;
    }


    function trackFactory(trackData, clientID, injection) {
        if (trackData.shapes.length) {
            const { type } = trackData.shapes[0];
            const color = colors[clientID % colors.length];

            let trackModel = null;
            switch (type) {
            case 'rectangle':
                trackModel = new RectangleTrack(trackData, clientID, color, injection);
                break;
            case 'polygon':
                trackModel = new PolygonTrack(trackData, clientID, color, injection);
                break;
            case 'polyline':
                trackModel = new PolylineTrack(trackData, clientID, color, injection);
                break;
            case 'points':
                trackModel = new PointsTrack(trackData, clientID, color, injection);
                break;
            default:
                throw new DataError(
                    `An unexpected type of track "${type}"`,
                );
            }

            return trackModel;
        }

        console.warn('The track without any shapes had been found. It was ignored.');
        return null;
    }

    class Collection {
        constructor(data) {
            this.startFrame = data.startFrame;
            this.stopFrame = data.stopFrame;
            this.frameMeta = data.frameMeta;

            this.labels = data.labels.reduce((labelAccumulator, label) => {
                labelAccumulator[label.id] = label;
                return labelAccumulator;
            }, {});

            this.shapes = {}; // key is a frame
            this.tags = {}; // key is a frame
            this.tracks = [];
            this.objects = {}; // key is a client id
            this.count = 0;
            this.flush = false;
            this.collectionZ = {}; // key is a frame, {max, min} are values
            this.groups = {
                max: 0,
            }; // it is an object to we can pass it as an argument by a reference
            this.injection = {
                labels: this.labels,
                collectionZ: this.collectionZ,
                groups: this.groups,
                frameMeta: this.frameMeta,
            };
        }

        import(data) {
            for (const tag of data.tags) {
                const clientID = ++this.count;
                const tagModel = new Tag(tag, clientID, this.injection);
                this.tags[tagModel.frame] = this.tags[tagModel.frame] || [];
                this.tags[tagModel.frame].push(tagModel);
                this.objects[clientID] = tagModel;
            }

            for (const shape of data.shapes) {
                const clientID = ++this.count;
                const shapeModel = shapeFactory(shape, clientID, this.injection);
                this.shapes[shapeModel.frame] = this.shapes[shapeModel.frame] || [];
                this.shapes[shapeModel.frame].push(shapeModel);
                this.objects[clientID] = shapeModel;
            }

            for (const track of data.tracks) {
                const clientID = ++this.count;
                const trackModel = trackFactory(track, clientID, this.injection);
                // The function can return null if track doesn't have any shapes.
                // In this case a corresponded message will be sent to the console
                if (trackModel) {
                    this.tracks.push(trackModel);
                    this.objects[clientID] = trackModel;
                }
            }

            return this;
        }

        export() {
            const data = {
                tracks: this.tracks.filter(track => !track.removed)
                    .map(track => track.toJSON()),
                shapes: Object.values(this.shapes)
                    .reduce((accumulator, value) => {
                        accumulator.push(...value);
                        return accumulator;
                    }, []).filter(shape => !shape.removed)
                    .map(shape => shape.toJSON()),
                tags: Object.values(this.tags).reduce((accumulator, value) => {
                    accumulator.push(...value);
                    return accumulator;
                }, []).filter(tag => !tag.removed)
                    .map(tag => tag.toJSON()),
            };

            return data;
        }

        get(frame) {
            const { tracks } = this;
            const shapes = this.shapes[frame] || [];
            const tags = this.tags[frame] || [];

            const objects = tracks.concat(shapes).concat(tags).filter(object => !object.removed);
            // filtering here

            const objectStates = [];
            for (const object of objects) {
                const stateData = object.get(frame);
                if (stateData.outside && !stateData.keyframe) {
                    continue;
                }

                const objectState = objectStateFactory.call(object, frame, stateData);
                objectStates.push(objectState);
            }

            return objectStates;
        }

        merge(objectStates) {
            checkObjectType('shapes for merge', objectStates, null, Array);
            if (!objectStates.length) return;
            const objectsForMerge = objectStates.map((state) => {
                checkObjectType('object state', state, null, ObjectState);
                const object = this.objects[state.clientID];
                if (typeof (object) === 'undefined') {
                    throw new ArgumentError(
                        'The object has not been saved yet. Call ObjectState.put([state]) before you can merge it',
                    );
                }
                return object;
            });

            const keyframes = {}; // frame: position
            const { label, shapeType } = objectStates[0];
            if (!(label.id in this.labels)) {
                throw new ArgumentError(
                    `Unknown label for the task: ${label.id}`,
                );
            }

            if (!Object.values(ObjectShape).includes(shapeType)) {
                throw new ArgumentError(
                    `Got unknown shapeType "${shapeType}"`,
                );
            }

            const labelAttributes = label.attributes.reduce((accumulator, attribute) => {
                accumulator[attribute.id] = attribute;
                return accumulator;
            }, {});

            for (let i = 0; i < objectsForMerge.length; i++) {
                // For each state get corresponding object
                const object = objectsForMerge[i];
                const state = objectStates[i];
                if (state.label.id !== label.id) {
                    throw new ArgumentError(
                        `All shape labels are expected to be ${label.name}, but got ${state.label.name}`,
                    );
                }

                if (state.shapeType !== shapeType) {
                    throw new ArgumentError(
                        `All shapes are expected to be ${shapeType}, but got ${state.shapeType}`,
                    );
                }

                // If this object is shape, get it position and save as a keyframe
                if (object instanceof Shape) {
                    // Frame already saved and it is not outside
                    if (object.frame in keyframes && !keyframes[object.frame].outside) {
                        throw new ArgumentError(
                            'Expected only one visible shape per frame',
                        );
                    }

                    keyframes[object.frame] = {
                        type: shapeType,
                        frame: object.frame,
                        points: [...object.points],
                        occluded: object.occluded,
                        zOrder: object.zOrder,
                        outside: false,
                        attributes: Object.keys(object.attributes).reduce((accumulator, attrID) => {
                            // We save only mutable attributes inside a keyframe
                            if (attrID in labelAttributes && labelAttributes[attrID].mutable) {
                                accumulator.push({
                                    spec_id: +attrID,
                                    value: object.attributes[attrID],
                                });
                            }
                            return accumulator;
                        }, []),
                    };

                    // Push outside shape after each annotation shape
                    // Any not outside shape rewrites it
                    if (!((object.frame + 1) in keyframes)) {
                        keyframes[object.frame + 1] = JSON
                            .parse(JSON.stringify(keyframes[object.frame]));
                        keyframes[object.frame + 1].outside = true;
                        keyframes[object.frame + 1].frame++;
                    }
                } else if (object instanceof Track) {
                    // If this object is track, iterate through all its
                    // keyframes and push copies to new keyframes
                    const attributes = {}; // id:value
                    for (const keyframe of Object.keys(object.shapes)) {
                        const shape = object.shapes[keyframe];
                        // Frame already saved and it is not outside
                        if (keyframe in keyframes && !keyframes[keyframe].outside) {
                            // This shape is outside and non-outside shape already exists
                            if (shape.outside) {
                                continue;
                            }

                            throw new ArgumentError(
                                'Expected only one visible shape per frame',
                            );
                        }

                        // We do not save an attribute if it has the same value
                        // We save only updates
                        let updatedAttributes = false;
                        for (const attrID in shape.attributes) {
                            if (!(attrID in attributes)
                                || attributes[attrID] !== shape.attributes[attrID]) {
                                updatedAttributes = true;
                                attributes[attrID] = shape.attributes[attrID];
                            }
                        }

                        keyframes[keyframe] = {
                            type: shapeType,
                            frame: +keyframe,
                            points: [...shape.points],
                            occluded: shape.occluded,
                            outside: shape.outside,
                            zOrder: shape.zOrder,
                            attributes: updatedAttributes ? Object.keys(attributes)
                                .reduce((accumulator, attrID) => {
                                    accumulator.push({
                                        spec_id: +attrID,
                                        value: attributes[attrID],
                                    });

                                    return accumulator;
                                }, []) : [],
                        };
                    }
                } else {
                    throw new ArgumentError(
                        `Trying to merge unknown object type: ${object.constructor.name}. `
                            + 'Only shapes and tracks are expected.',
                    );
                }
            }

            let firstNonOutside = false;
            for (const frame of Object.keys(keyframes).sort((a, b) => +a - +b)) {
                // Remove all outside frames at the begin
                firstNonOutside = firstNonOutside || keyframes[frame].outside;
                if (!firstNonOutside && keyframes[frame].outside) {
                    delete keyframes[frame];
                } else {
                    break;
                }
            }

            const clientID = ++this.count;
            const track = {
                frame: Math.min.apply(null, Object.keys(keyframes).map(frame => +frame)),
                shapes: Object.values(keyframes),
                group: 0,
                label_id: label.id,
                attributes: Object.keys(objectStates[0].attributes)
                    .reduce((accumulator, attrID) => {
                        if (!labelAttributes[attrID].mutable) {
                            accumulator.push({
                                spec_id: +attrID,
                                value: objectStates[0].attributes[attrID],
                            });
                        }

                        return accumulator;
                    }, []),
            };

            const trackModel = trackFactory(track, clientID, this.injection);
            this.tracks.push(trackModel);
            this.objects[clientID] = trackModel;

            // Remove other shapes
            for (const object of objectsForMerge) {
                object.removed = true;
                if (typeof (object.resetCache) === 'function') {
                    object.resetCache();
                }
            }
        }

        split(objectState, frame) {
            checkObjectType('object state', objectState, null, ObjectState);
            checkObjectType('frame', frame, 'integer', null);

            const object = this.objects[objectState.clientID];
            if (typeof (object) === 'undefined') {
                throw new ArgumentError(
                    'The object has not been saved yet. Call annotations.put([state]) before',
                );
            }

            if (objectState.objectType !== ObjectType.TRACK) {
                return;
            }

            const keyframes = Object.keys(object.shapes).sort((a, b) => +a - +b);
            if (frame <= +keyframes[0] || frame > keyframes[keyframes.length - 1]) {
                return;
            }

            const labelAttributes = object.label.attributes.reduce((accumulator, attribute) => {
                accumulator[attribute.id] = attribute;
                return accumulator;
            }, {});

            const exported = object.toJSON();
            const position = {
                type: objectState.shapeType,
                points: [...objectState.points],
                occluded: objectState.occluded,
                outside: objectState.outside,
                zOrder: 0,
                attributes: Object.keys(objectState.attributes)
                    .reduce((accumulator, attrID) => {
                        if (!labelAttributes[attrID].mutable) {
                            accumulator.push({
                                spec_id: +attrID,
                                value: objectState.attributes[attrID],
                            });
                        }

                        return accumulator;
                    }, []),
                frame,
            };

            const prev = {
                frame: exported.frame,
                group: 0,
                label_id: exported.label_id,
                attributes: exported.attributes,
                shapes: [],
            };

            const next = JSON.parse(JSON.stringify(prev));
            next.frame = frame;

            next.shapes.push(JSON.parse(JSON.stringify(position)));
            exported.shapes.map((shape) => {
                delete shape.id;
                if (shape.frame < frame) {
                    prev.shapes.push(JSON.parse(JSON.stringify(shape)));
                } else if (shape.frame > frame) {
                    next.shapes.push(JSON.parse(JSON.stringify(shape)));
                }

                return shape;
            });
            prev.shapes.push(position);
            prev.shapes[prev.shapes.length - 1].outside = true;

            let clientID = ++this.count;
            const prevTrack = trackFactory(prev, clientID, this.injection);
            this.tracks.push(prevTrack);
            this.objects[clientID] = prevTrack;

            clientID = ++this.count;
            const nextTrack = trackFactory(next, clientID, this.injection);
            this.tracks.push(nextTrack);
            this.objects[clientID] = nextTrack;

            // Remove source object
            object.removed = true;
            object.resetCache();
        }

        group(objectStates, reset) {
            checkObjectType('shapes for group', objectStates, null, Array);

            const objectsForGroup = objectStates.map((state) => {
                checkObjectType('object state', state, null, ObjectState);
                const object = this.objects[state.clientID];
                if (typeof (object) === 'undefined') {
                    throw new ArgumentError(
                        'The object has not been saved yet. Call annotations.put([state]) before',
                    );
                }
                return object;
            });

            const groupIdx = reset ? 0 : ++this.groups.max;
            for (const object of objectsForGroup) {
                object.group = groupIdx;
                if (typeof (object.resetCache) === 'function') {
                    object.resetCache();
                }
            }

            return groupIdx;
        }

        clear() {
            this.shapes = {};
            this.tags = {};
            this.tracks = [];
            this.objects = {}; // by id
            this.count = 0;

            this.flush = true;
        }

        statistics() {
            const labels = {};
            const skeleton = {
                rectangle: {
                    shape: 0,
                    track: 0,
                },
                polygon: {
                    shape: 0,
                    track: 0,
                },
                polyline: {
                    shape: 0,
                    track: 0,
                },
                points: {
                    shape: 0,
                    track: 0,
                },
                tags: 0,
                manually: 0,
                interpolated: 0,
                total: 0,
            };

            const total = JSON.parse(JSON.stringify(skeleton));
            for (const label of Object.values(this.labels)) {
                const { name } = label;
                labels[name] = JSON.parse(JSON.stringify(skeleton));
            }

            for (const object of Object.values(this.objects)) {
                let objectType = null;
                if (object instanceof Shape) {
                    objectType = 'shape';
                } else if (object instanceof Track) {
                    objectType = 'track';
                } else if (object instanceof Tag) {
                    objectType = 'tag';
                } else {
                    throw new ScriptingError(
                        `Unexpected object type: "${objectType}"`,
                    );
                }

                const label = object.label.name;
                if (objectType === 'tag') {
                    labels[label].tags++;
                    labels[label].manually++;
                    labels[label].total++;
                } else {
                    const { shapeType } = object;
                    labels[label][shapeType][objectType]++;

                    if (objectType === 'track') {
                        const keyframes = Object.keys(object.shapes)
                            .sort((a, b) => +a - +b).map(el => +el);

                        let prevKeyframe = keyframes[0];
                        let visible = false;

                        for (const keyframe of keyframes) {
                            if (visible) {
                                const interpolated = keyframe - prevKeyframe - 1;
                                labels[label].interpolated += interpolated;
                                labels[label].total += interpolated;
                            }
                            visible = !object.shapes[keyframe].outside;
                            prevKeyframe = keyframe;

                            if (visible) {
                                labels[label].manually++;
                                labels[label].total++;
                            }
                        }

                        const lastKey = keyframes[keyframes.length - 1];
                        if (lastKey !== this.stopFrame && !object.shapes[lastKey].outside) {
                            const interpolated = this.stopFrame - lastKey;
                            labels[label].interpolated += interpolated;
                            labels[label].total += interpolated;
                        }
                    } else {
                        labels[label].manually++;
                        labels[label].total++;
                    }
                }
            }

            for (const label of Object.keys(labels)) {
                for (const key of Object.keys(labels[label])) {
                    if (typeof (labels[label][key]) === 'object') {
                        for (const objectType of Object.keys(labels[label][key])) {
                            total[key][objectType] += labels[label][key][objectType];
                        }
                    } else {
                        total[key] += labels[label][key];
                    }
                }
            }

            return new Statistics(labels, total);
        }

        put(objectStates) {
            checkObjectType('shapes for put', objectStates, null, Array);
            const constructed = {
                shapes: [],
                tracks: [],
                tags: [],
            };

            function convertAttributes(accumulator, attrID) {
                const specID = +attrID;
                const value = this.attributes[attrID];

                checkObjectType('attribute id', specID, 'integer', null);
                checkObjectType('attribute value', value, 'string', null);

                accumulator.push({
                    spec_id: specID,
                    value,
                });

                return accumulator;
            }

            for (const state of objectStates) {
                checkObjectType('object state', state, null, ObjectState);
                checkObjectType('state client ID', state.clientID, 'undefined', null);
                checkObjectType('state frame', state.frame, 'integer', null);
                checkObjectType('state attributes', state.attributes, null, Object);
                checkObjectType('state label', state.label, null, Label);

                const attributes = Object.keys(state.attributes)
                    .reduce(convertAttributes.bind(state), []);
                const labelAttributes = state.label.attributes.reduce((accumulator, attribute) => {
                    accumulator[attribute.id] = attribute;
                    return accumulator;
                }, {});

                // Construct whole objects from states
                if (state.objectType === 'tag') {
                    constructed.tags.push({
                        attributes,
                        frame: state.frame,
                        label_id: state.label.id,
                        group: 0,
                    });
                } else {
                    checkObjectType('state occluded', state.occluded, 'boolean', null);
                    checkObjectType('state points', state.points, null, Array);

                    for (const coord of state.points) {
                        checkObjectType('point coordinate', coord, 'number', null);
                    }

                    if (!Object.values(ObjectShape).includes(state.shapeType)) {
                        throw new ArgumentError(
                            'Object shape must be one of: '
                                + `${JSON.stringify(Object.values(ObjectShape))}`,
                        );
                    }

                    if (state.objectType === 'shape') {
                        constructed.shapes.push({
                            attributes,
                            frame: state.frame,
                            group: 0,
                            label_id: state.label.id,
                            occluded: state.occluded || false,
                            points: [...state.points],
                            type: state.shapeType,
                            z_order: 0,
                        });
                    } else if (state.objectType === 'track') {
                        constructed.tracks.push({
                            attributes: attributes
                                .filter(attr => !labelAttributes[attr.spec_id].mutable),
                            frame: state.frame,
                            group: 0,
                            label_id: state.label.id,
                            shapes: [{
                                attributes: attributes
                                    .filter(attr => labelAttributes[attr.spec_id].mutable),
                                frame: state.frame,
                                occluded: state.occluded || false,
                                outside: false,
                                points: [...state.points],
                                type: state.shapeType,
                                z_order: 0,
                            }],
                        });
                    } else {
                        throw new ArgumentError(
                            'Object type must be one of: '
                                + `${JSON.stringify(Object.values(ObjectType))}`,
                        );
                    }
                }
            }

            // Add constructed objects to a collection
            this.import(constructed);
        }

        select(objectStates, x, y) {
            checkObjectType('shapes for select', objectStates, null, Array);
            checkObjectType('x coordinate', x, 'number', null);
            checkObjectType('y coordinate', y, 'number', null);

            let minimumDistance = null;
            let minimumState = null;
            for (const state of objectStates) {
                checkObjectType('object state', state, null, ObjectState);
                if (state.outside) continue;

                const object = this.objects[state.clientID];
                if (typeof (object) === 'undefined') {
                    throw new ArgumentError(
                        'The object has not been saved yet. Call annotations.put([state]) before',
                    );
                }

                const distance = object.constructor.distance(state.points, x, y);
                if (distance !== null && (minimumDistance === null || distance < minimumDistance)) {
                    minimumDistance = distance;
                    minimumState = state;
                }
            }

            return {
                state: minimumState,
                distance: minimumDistance,
            };
        }
    }

    module.exports = Collection;
})();
