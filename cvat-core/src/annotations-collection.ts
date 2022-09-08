// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

(() => {
    const {
        shapeFactory,
        trackFactory,
        Track,
        Shape,
        Tag,
    } = require('./annotations-objects');
    const AnnotationsFilter = require('./annotations-filter').default;
    const { checkObjectType } = require('./common');
    const Statistics = require('./statistics');
    const { Label } = require('./labels');
    const { ArgumentError, ScriptingError } = require('./exceptions');
    const ObjectState = require('./object-state').default;

    const {
        HistoryActions, ShapeType, ObjectType, colors, Source,
    } = require('./enums');

    class Collection {
        constructor(data) {
            this.startFrame = data.startFrame;
            this.stopFrame = data.stopFrame;
            this.frameMeta = data.frameMeta;

            this.labels = data.labels.reduce((labelAccumulator, label) => {
                labelAccumulator[label.id] = label;
                (label?.structure?.sublabels || []).forEach((sublabel) => {
                    labelAccumulator[sublabel.id] = sublabel;
                });

                return labelAccumulator;
            }, {});

            this.annotationsFilter = new AnnotationsFilter();
            this.history = data.history;
            this.shapes = {}; // key is a frame
            this.tags = {}; // key is a frame
            this.tracks = [];
            this.objects = {}; // key is a client id
            this.count = 0;
            this.flush = false;
            this.groups = {
                max: 0,
            }; // it is an object to we can pass it as an argument by a reference
            this.injection = {
                labels: this.labels,
                groups: this.groups,
                frameMeta: this.frameMeta,
                history: this.history,
                nextClientID: () => ++this.count,
                groupColors: {},
            };
        }

        import(data) {
            const result = {
                tags: [],
                shapes: [],
                tracks: [],
            };

            for (const tag of data.tags) {
                const clientID = ++this.count;
                const color = colors[clientID % colors.length];
                const tagModel = new Tag(tag, clientID, color, this.injection);
                this.tags[tagModel.frame] = this.tags[tagModel.frame] || [];
                this.tags[tagModel.frame].push(tagModel);
                this.objects[clientID] = tagModel;

                result.tags.push(tagModel);
            }

            for (const shape of data.shapes) {
                const clientID = ++this.count;
                const shapeModel = shapeFactory(shape, clientID, this.injection);
                this.shapes[shapeModel.frame] = this.shapes[shapeModel.frame] || [];
                this.shapes[shapeModel.frame].push(shapeModel);
                this.objects[clientID] = shapeModel;

                result.shapes.push(shapeModel);
            }

            for (const track of data.tracks) {
                const clientID = ++this.count;
                const trackModel = trackFactory(track, clientID, this.injection);
                // The function can return null if track doesn't have any shapes.
                // In this case a corresponded message will be sent to the console
                if (trackModel) {
                    this.tracks.push(trackModel);
                    this.objects[clientID] = trackModel;

                    result.tracks.push(trackModel);
                }
            }

            return result;
        }

        export() {
            const data = {
                tracks: this.tracks.filter((track) => !track.removed).map((track) => track.toJSON()),
                shapes: Object.values(this.shapes)
                    .reduce((accumulator, value) => {
                        accumulator.push(...value);
                        return accumulator;
                    }, [])
                    .filter((shape) => !shape.removed)
                    .map((shape) => shape.toJSON()),
                tags: Object.values(this.tags)
                    .reduce((accumulator, value) => {
                        accumulator.push(...value);
                        return accumulator;
                    }, [])
                    .filter((tag) => !tag.removed)
                    .map((tag) => tag.toJSON()),
            };

            return data;
        }

        get(frame, allTracks, filters) {
            const { tracks } = this;
            const shapes = this.shapes[frame] || [];
            const tags = this.tags[frame] || [];

            const objects = [].concat(tracks, shapes, tags);
            const visible = [];

            for (const object of objects) {
                if (object.removed) {
                    continue;
                }

                const stateData = object.get(frame);
                if (stateData.outside && !stateData.keyframe && !allTracks && object instanceof Track) {
                    continue;
                }

                visible.push(stateData);
            }

            const objectStates = [];
            const filtered = this.annotationsFilter.filter(visible, filters);

            visible.forEach((stateData, idx) => {
                if (!filters.length || filtered.includes(stateData.clientID)) {
                    const objectState = new ObjectState(stateData);
                    objectStates.push(objectState);
                }
            });

            return objectStates;
        }

        _mergeInternal(objectsForMerge, shapeType, label): any {
            const keyframes = {}; // frame: position
            const elements = {}; // element_sublabel_id: [element], each sublabel will be merged recursively

            if (!Object.values(ShapeType).includes(shapeType)) {
                throw new ArgumentError(`Got unknown shapeType "${shapeType}"`);
            }

            const labelAttributes = label.attributes.reduce((accumulator, attribute) => {
                accumulator[attribute.id] = attribute;
                return accumulator;
            }, {});

            for (let i = 0; i < objectsForMerge.length; i++) {
                // For each state get corresponding object
                const object = objectsForMerge[i];
                if (object.label.id !== label.id) {
                    throw new ArgumentError(
                        `All object labels are expected to be "${label.name}", but got "${object.label.name}"`,
                    );
                }

                if (object.shapeType !== shapeType) {
                    throw new ArgumentError(
                        `All shapes are expected to be "${shapeType}", but got "${object.shapeType}"`,
                    );
                }

                // If this object is shape, get it position and save as a keyframe
                if (object instanceof Shape) {
                    // Frame already saved and it is not outside
                    if (object.frame in keyframes && !keyframes[object.frame].outside) {
                        throw new ArgumentError('Expected only one visible shape per frame');
                    }

                    keyframes[object.frame] = {
                        type: shapeType,
                        frame: object.frame,
                        points: object.shapeType === ShapeType.SKELETON ? undefined : [...object.points],
                        occluded: object.occluded,
                        rotation: object.rotation,
                        z_order: object.zOrder,
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
                    // Any not outside shape will rewrite it later
                    if (!(object.frame + 1 in keyframes) && object.frame + 1 <= this.stopFrame) {
                        keyframes[object.frame + 1] = JSON.parse(JSON.stringify(keyframes[object.frame]));
                        keyframes[object.frame + 1].outside = true;
                        keyframes[object.frame + 1].frame++;
                        keyframes[object.frame + 1].attributes = [];
                        (keyframes[object.frame + 1].elements || []).forEach((el) => {
                            el.outside = keyframes[object.frame + 1].outside;
                            el.frame = keyframes[object.frame + 1].frame;
                        });
                    }
                } else if (object instanceof Track) {
                    // If this object is a track, iterate through all its
                    // keyframes and push copies to new keyframes
                    const attributes = {}; // id:value
                    const trackShapes = object.shapes;
                    for (const keyframe of Object.keys(trackShapes)) {
                        const shape = trackShapes[keyframe];
                        // Frame already saved and it is not outside
                        if (keyframe in keyframes && !keyframes[keyframe].outside) {
                            // This shape is outside and non-outside shape already exists
                            if (shape.outside) {
                                continue;
                            }

                            throw new ArgumentError('Expected only one visible shape per frame');
                        }

                        // We do not save an attribute if it has the same value
                        // We save only updates
                        let updatedAttributes = false;
                        for (const attrID in shape.attributes) {
                            if (!(attrID in attributes) || attributes[attrID] !== shape.attributes[attrID]) {
                                updatedAttributes = true;
                                attributes[attrID] = shape.attributes[attrID];
                            }
                        }

                        keyframes[keyframe] = {
                            type: shapeType,
                            frame: +keyframe,
                            points: object.shapeType === ShapeType.SKELETON ? undefined : [...shape.points],
                            rotation: shape.rotation,
                            occluded: shape.occluded,
                            outside: shape.outside,
                            z_order: shape.zOrder,
                            attributes: updatedAttributes ? Object.keys(attributes).reduce((accumulator, attrID) => {
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
                        `Trying to merge unknown object type: ${object.constructor.name}. ` +
                            'Only shapes and tracks are expected.',
                    );
                }

                if (object.shapeType === ShapeType.SKELETON) {
                    for (const element of object.elements) {
                        // for each track/shape element get its first objectState and keep it
                        elements[element.label.id] = [
                            ...(elements[element.label.id] || []), element,
                        ];
                    }
                }
            }

            const mergedElements = [];
            if (shapeType === ShapeType.SKELETON) {
                for (const sublabel of label.structure.sublabels) {
                    if (!(sublabel.id in elements)) {
                        throw new ArgumentError(
                            `Merged skeleton is absent some of its elements (sublabel id: ${sublabel.id})`,
                        );
                    }

                    try {
                        mergedElements.push(this._mergeInternal(
                            elements[sublabel.id], elements[sublabel.id][0].shapeType, sublabel,
                        ));
                    } catch (error) {
                        throw new ArgumentError(
                            `Could not merge some skeleton parts (sublabel id: ${sublabel.id}).
                            Original error is ${error.toString()}`,
                        );
                    }
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

            const track = {
                frame: Math.min.apply(
                    null,
                    Object.keys(keyframes).map((frame) => +frame),
                ),
                shapes: Object.values(keyframes),
                elements: shapeType === ShapeType.SKELETON ? mergedElements : undefined,
                group: 0,
                source: Source.MANUAL,
                label_id: label.id,
                attributes: Object.keys(objectsForMerge[0].attributes).reduce((accumulator, attrID) => {
                    if (!labelAttributes[attrID].mutable) {
                        accumulator.push({
                            spec_id: +attrID,
                            value: objectsForMerge[0].attributes[attrID],
                        });
                    }

                    return accumulator;
                }, []),
            };

            return track;
        }

        merge(objectStates) {
            checkObjectType('shapes for merge', objectStates, null, Array);
            if (!objectStates.length) return;
            const objectsForMerge = objectStates.map((state) => {
                checkObjectType('object state', state, null, ObjectState);
                const object = this.objects[state.clientID];
                if (typeof object === 'undefined') {
                    throw new ArgumentError(
                        'The object is not in collection yet. Call ObjectState.put([state]) before you can merge it',
                    );
                }
                return object;
            });

            const { label, shapeType } = objectStates[0];
            if (!(label.id in this.labels)) {
                throw new ArgumentError(`Unknown label for the task: ${label.id}`);
            }

            const track = this._mergeInternal(objectsForMerge, shapeType, label);
            const imported = this.import({
                tracks: [track],
                tags: [],
                shapes: [],
            });

            // Remove other shapes
            for (const object of objectsForMerge) {
                object.removed = true;
            }

            const [importedTrack] = imported.tracks;
            this.history.do(
                HistoryActions.MERGED_OBJECTS,
                () => {
                    importedTrack.removed = true;
                    for (const object of objectsForMerge) {
                        object.removed = false;
                    }
                },
                () => {
                    importedTrack.removed = false;
                    for (const object of objectsForMerge) {
                        object.removed = true;
                    }
                },
                [...objectsForMerge.map((object) => object.clientID), importedTrack.clientID],
                objectStates[0].frame,
            );
        }

        _splitInternal(objectState, object, frame): ObjectState[] {
            const labelAttributes = object.label.attributes.reduce((accumulator, attribute) => {
                accumulator[attribute.id] = attribute;
                return accumulator;
            }, {});

            // first clear all server ids which may exist in the object being splitted
            const copy = trackFactory(object.toJSON(), -1, this.injection);
            copy.clearServerID();
            const exported = copy.toJSON();

            // then create two copies, before this frame and after this frame
            const prev = {
                frame: exported.frame,
                group: 0,
                label_id: exported.label_id,
                attributes: exported.attributes,
                shapes: [],
                source: Source.MANUAL,
                elements: [],
            };

            // after this frame copy is almost the same, except of starting frame
            const next = JSON.parse(JSON.stringify(prev));
            next.frame = frame;

            // get position of the object on a frame where user does split and push it to next shape
            const position = {
                type: objectState.shapeType,
                points: objectState.shapeType === ShapeType.SKELETON ? undefined : [...objectState.points],
                rotation: objectState.rotation,
                occluded: objectState.occluded,
                outside: objectState.outside,
                z_order: objectState.zOrder,
                attributes: Object.keys(objectState.attributes).reduce((accumulator, attrID) => {
                    if (labelAttributes[attrID].mutable) {
                        accumulator.push({
                            spec_id: +attrID,
                            value: objectState.attributes[attrID],
                        });
                    }

                    return accumulator;
                }, []),
                frame,
            };
            next.shapes.push(JSON.parse(JSON.stringify(position)));
            // split all shapes of an initial object into two groups (before/after the frame)
            exported.shapes.forEach((shape) => {
                if (shape.frame < frame) {
                    prev.shapes.push(JSON.parse(JSON.stringify(shape)));
                } else if (shape.frame > frame) {
                    next.shapes.push(JSON.parse(JSON.stringify(shape)));
                }
            });
            prev.shapes.push(JSON.parse(JSON.stringify(position)));
            prev.shapes[prev.shapes.length - 1].outside = true;

            // do the same recursively for all objet elements if there are any
            objectState.elements.forEach((elementState, idx) => {
                const elementObject = object.elements[idx];
                const [prevEl, nextEl] = this._splitInternal(elementState, elementObject, frame);
                prev.elements.push(prevEl);
                next.elements.push(nextEl);
            });

            return [prev, next];
        }

        split(objectState, frame) {
            checkObjectType('object state', objectState, null, ObjectState);
            checkObjectType('frame', frame, 'integer', null);

            const object = this.objects[objectState.clientID];
            if (typeof object === 'undefined') {
                throw new ArgumentError('The object has not been saved yet. Call annotations.put([state]) before');
            }

            if (objectState.objectType !== ObjectType.TRACK) return;
            const keyframes = Object.keys(object.shapes).sort((a, b) => +a - +b);
            if (frame <= +keyframes[0]) return;

            const [prev, next] = this._splitInternal(objectState, object, frame);
            const imported = this.import({
                tracks: [prev, next],
                tags: [],
                shapes: [],
            });

            // Remove source object
            object.removed = true;

            const [prevImported, nextImported] = imported.tracks;
            this.history.do(
                HistoryActions.SPLITTED_TRACK,
                () => {
                    object.removed = false;
                    prevImported.removed = true;
                    nextImported.removed = true;
                },
                () => {
                    object.removed = true;
                    prevImported.removed = false;
                    nextImported.removed = false;
                },
                [object.clientID, prevImported.clientID, nextImported.clientID],
                frame,
            );
        }

        group(objectStates, reset) {
            checkObjectType('shapes for group', objectStates, null, Array);

            const objectsForGroup = objectStates.map((state) => {
                checkObjectType('object state', state, null, ObjectState);
                const object = this.objects[state.clientID];
                if (typeof object === 'undefined') {
                    throw new ArgumentError('The object has not been saved yet. Call annotations.put([state]) before');
                }
                return object;
            });

            const groupIdx = reset ? 0 : ++this.groups.max;
            const undoGroups = objectsForGroup.map((object) => object.group);
            for (const object of objectsForGroup) {
                object.group = groupIdx;
                object.updated = Date.now();
            }
            const redoGroups = objectsForGroup.map((object) => object.group);

            this.history.do(
                HistoryActions.GROUPED_OBJECTS,
                () => {
                    objectsForGroup.forEach((object, idx) => {
                        object.group = undoGroups[idx];
                        object.updated = Date.now();
                    });
                },
                () => {
                    objectsForGroup.forEach((object, idx) => {
                        object.group = redoGroups[idx];
                        object.updated = Date.now();
                    });
                },
                objectsForGroup.map((object) => object.clientID),
                objectStates[0].frame,
            );

            return groupIdx;
        }

        clear(startframe, endframe, delTrackKeyframesOnly) {
            if (startframe !== undefined && endframe !== undefined) {
                // If only a range of annotations need to be cleared
                for (let frame = startframe; frame <= endframe; frame++) {
                    this.shapes[frame] = [];
                    this.tags[frame] = [];
                }
                const { tracks } = this;
                tracks.forEach((track) => {
                    if (track.frame <= endframe) {
                        if (delTrackKeyframesOnly) {
                            for (const keyframe of Object.keys(track.shapes)) {
                                if (+keyframe >= startframe && +keyframe <= endframe) {
                                    delete track.shapes[keyframe];
                                    (track.elements || []).forEach((element) => {
                                        if (keyframe in element.shapes) {
                                            delete element.shapes[keyframe];
                                            element.updated = Date.now();
                                        }
                                    });
                                    track.updated = Date.now();
                                }
                            }
                        } else if (track.frame >= startframe) {
                            const index = tracks.indexOf(track);
                            if (index > -1) { tracks.splice(index, 1); }
                        }
                    }
                });
            } else if (startframe === undefined && endframe === undefined) {
                // If all annotations need to be cleared
                this.shapes = {};
                this.tags = {};
                this.tracks = [];
                this.objects = {};
                this.count = 0;

                this.flush = true;
            } else {
                // If inputs provided were wrong
                throw Error('Could not remove the annotations, please provide both inputs or' +
                    ' leave the inputs below empty to remove all the annotations from this job');
            }
        }

        statistics() {
            const labels = {};
            const shapes = ['rectangle', 'polygon', 'polyline', 'points', 'ellipse', 'cuboid', 'skeleton'];
            const body = {
                ...(shapes.reduce((acc, val) => ({
                    ...acc,
                    [val]: { shape: 0, track: 0 },
                }), {})),

                tag: 0,
                manually: 0,
                interpolated: 0,
                total: 0,
            };

            const sep = '{{cvat.skeleton.lbl.sep}}';
            const fillBody = (spec, prefix = ''): void => {
                const pref = prefix ? `${prefix}${sep}` : '';
                for (const label of spec) {
                    const { name } = label;
                    labels[`${pref}${name}`] = JSON.parse(JSON.stringify(body));

                    if (label?.structure?.sublabels) {
                        fillBody(label.structure.sublabels, `${pref}${name}`);
                    }
                }
            };

            const total = JSON.parse(JSON.stringify(body));
            fillBody(Object.values(this.labels).filter((label) => !label.hasParent));

            const scanTrack = (track, prefix = ''): void => {
                const pref = prefix ? `${prefix}${sep}` : '';
                const label = `${pref}${track.label.name}`;
                labels[label][track.shapeType].track++;
                const keyframes = Object.keys(track.shapes)
                    .sort((a, b) => +a - +b)
                    .map((el) => +el);

                let prevKeyframe = keyframes[0];
                let visible = false;
                for (const keyframe of keyframes) {
                    if (visible) {
                        const interpolated = keyframe - prevKeyframe - 1;
                        labels[label].interpolated += interpolated;
                        labels[label].total += interpolated;
                    }
                    visible = !track.shapes[keyframe].outside;
                    prevKeyframe = keyframe;

                    if (visible) {
                        labels[label].manually++;
                        labels[label].total++;
                    }
                }

                let lastKey = keyframes[keyframes.length - 1];
                if (track.shapeType === ShapeType.SKELETON) {
                    track.elements.forEach((element) => {
                        scanTrack(element, label);
                        lastKey = Math.max(lastKey, ...Object.keys(element.shapes).map((key) => +key));
                    });
                }

                if (lastKey !== this.stopFrame && !track.get(lastKey).outside) {
                    const interpolated = this.stopFrame - lastKey;
                    labels[label].interpolated += interpolated;
                    labels[label].total += interpolated;
                }
            };

            for (const object of Object.values(this.objects)) {
                if (object.removed) {
                    continue;
                }

                let objectType = null;
                if (object instanceof Shape) {
                    objectType = 'shape';
                } else if (object instanceof Track) {
                    objectType = 'track';
                } else if (object instanceof Tag) {
                    objectType = 'tag';
                } else {
                    throw new ScriptingError(`Unexpected object type: "${objectType}"`);
                }

                const { name: label } = object.label;
                if (objectType === 'tag') {
                    labels[label].tag++;
                    labels[label].manually++;
                    labels[label].total++;
                } else if (objectType === 'track') {
                    scanTrack(object);
                } else {
                    const { shapeType } = object;
                    labels[label][shapeType].shape++;
                    labels[label].manually++;
                    labels[label].total++;
                    if (shapeType === ShapeType.SKELETON) {
                        object.elements.forEach((element) => {
                            const combinedName = [label, element.label.name].join(sep);
                            labels[combinedName][element.shapeType].shape++;
                            labels[combinedName].manually++;
                            labels[combinedName].total++;
                        });
                    }
                }
            }

            for (const label of Object.keys(labels)) {
                for (const shapeType of Object.keys(labels[label])) {
                    if (typeof labels[label][shapeType] === 'object') {
                        for (const objectType of Object.keys(labels[label][shapeType])) {
                            total[shapeType][objectType] += labels[label][shapeType][objectType];
                        }
                    } else {
                        total[shapeType] += labels[label][shapeType];
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
                checkObjectType('state client ID', state.clientID, null, null);
                checkObjectType('state frame', state.frame, 'integer', null);
                checkObjectType('state rotation', state.rotation || 0, 'number', null);
                checkObjectType('state attributes', state.attributes, null, Object);
                checkObjectType('state label', state.label, null, Label);

                const attributes = Object.keys(state.attributes).reduce(convertAttributes.bind(state), []);
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
                    checkObjectType('state zOrder', state.zOrder, 'integer', null);
                    checkObjectType('state descriptions', state.descriptions, null, Array);
                    state.descriptions.forEach((desc) => checkObjectType('state description', desc, 'string'));

                    for (const coord of state.points) {
                        checkObjectType('point coordinate', coord, 'number', null);
                    }

                    if (!Object.values(ShapeType).includes(state.shapeType)) {
                        throw new ArgumentError(
                            `Object shape must be one of: ${JSON.stringify(Object.values(ShapeType))}`,
                        );
                    }

                    if (state.objectType === 'shape') {
                        constructed.shapes.push({
                            attributes,
                            descriptions: state.descriptions,
                            frame: state.frame,
                            group: 0,
                            label_id: state.label.id,
                            occluded: state.occluded || false,
                            points: [...state.points],
                            rotation: state.rotation || 0,
                            type: state.shapeType,
                            z_order: state.zOrder,
                            source: state.source,
                            elements: state.shapeType === 'skeleton' ? state.elements.map((element) => ({
                                attributes: [],
                                frame: element.frame,
                                group: 0,
                                label_id: element.label.id,
                                points: [...element.points],
                                rotation: 0,
                                type: element.shapeType,
                                z_order: 0,
                                outside: element.outside || false,
                                occluded: element.occluded || false,
                            })) : undefined,
                        });
                    } else if (state.objectType === 'track') {
                        constructed.tracks.push({
                            attributes: attributes.filter((attr) => !labelAttributes[attr.spec_id].mutable),
                            descriptions: state.descriptions,
                            frame: state.frame,
                            group: 0,
                            source: state.source,
                            label_id: state.label.id,
                            shapes: [
                                {
                                    attributes: attributes.filter((attr) => labelAttributes[attr.spec_id].mutable),
                                    frame: state.frame,
                                    occluded: false,
                                    outside: false,
                                    points: [...state.points],
                                    rotation: state.rotation || 0,
                                    type: state.shapeType,
                                    z_order: state.zOrder,
                                },
                            ],
                            elements: state.shapeType === 'skeleton' ? state.elements.map((element) => {
                                const elementAttrValues = Object.keys(state.attributes)
                                    .reduce(convertAttributes.bind(state), []);
                                const elementAttributes = element.label.attributes.reduce((accumulator, attribute) => {
                                    accumulator[attribute.id] = attribute;
                                    return accumulator;
                                }, {});

                                return ({
                                    attributes: elementAttrValues
                                        .filter((attr) => !elementAttributes[attr.spec_id].mutable),
                                    frame: state.frame,
                                    group: 0,
                                    label_id: element.label.id,
                                    shapes: [{
                                        frame: state.frame,
                                        type: element.shapeType,
                                        points: [...element.points],
                                        zOrder: state.zOrder,
                                        outside: element.outside || false,
                                        occluded: element.occluded || false,
                                        rotation: element.rotation || 0,
                                        attributes: elementAttrValues
                                            .filter((attr) => !elementAttributes[attr.spec_id].mutable),
                                    }],
                                });
                            }) : undefined,
                        });
                    } else {
                        throw new ArgumentError(
                            `Object type must be one of: ${JSON.stringify(Object.values(ObjectType))}`,
                        );
                    }
                }
            }

            // Add constructed objects to a collection
            // eslint-disable-next-line no-unsanitized/method
            const imported = this.import(constructed);
            const importedArray = imported.tags.concat(imported.tracks).concat(imported.shapes);

            if (objectStates.length) {
                this.history.do(
                    HistoryActions.CREATED_OBJECTS,
                    () => {
                        importedArray.forEach((object) => {
                            object.removed = true;
                        });
                    },
                    () => {
                        importedArray.forEach((object) => {
                            object.removed = false;
                            object.serverID = undefined;
                        });
                    },
                    importedArray.map((object) => object.clientID),
                    objectStates[0].frame,
                );
            }

            return importedArray.map((value) => value.clientID);
        }

        select(objectStates, x, y) {
            checkObjectType('shapes for select', objectStates, null, Array);
            checkObjectType('x coordinate', x, 'number', null);
            checkObjectType('y coordinate', y, 'number', null);

            let minimumDistance = null;
            let minimumState = null;
            for (const state of objectStates) {
                checkObjectType('object state', state, null, ObjectState);
                if (state.outside || state.hidden || state.objectType === ObjectType.TAG) {
                    continue;
                }

                const object = this.objects[state.clientID];
                if (typeof object === 'undefined') {
                    throw new ArgumentError('The object has not been saved yet. Call annotations.put([state]) before');
                }
                const distance = object.constructor.distance(state.points, x, y, state.rotation);
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

        searchEmpty(frameFrom, frameTo) {
            const sign = Math.sign(frameTo - frameFrom);
            const predicate = sign > 0 ? (frame) => frame <= frameTo : (frame) => frame >= frameTo;
            const update = sign > 0 ? (frame) => frame + 1 : (frame) => frame - 1;
            for (let frame = frameFrom; predicate(frame); frame = update(frame)) {
                if (frame in this.shapes && this.shapes[frame].some((shape) => !shape.removed)) {
                    continue;
                }
                if (frame in this.tags && this.tags[frame].some((tag) => !tag.removed)) {
                    continue;
                }
                const filteredTracks = this.tracks.filter((track) => !track.removed);
                let found = false;
                for (const track of filteredTracks) {
                    const keyframes = track.boundedKeyframes(frame);
                    const { prev, first } = keyframes;
                    const last = prev === null ? first : prev;
                    const lastShape = track.shapes[last];
                    const isKeyfame = frame in track.shapes;
                    if (first <= frame && (!lastShape.outside || isKeyfame)) {
                        found = true;
                        break;
                    }
                }

                if (found) continue;

                return frame;
            }

            return null;
        }

        search(filters, frameFrom, frameTo) {
            const sign = Math.sign(frameTo - frameFrom);
            const filtersStr = JSON.stringify(filters);
            const linearSearch = filtersStr.match(/"var":"width"/) || filtersStr.match(/"var":"height"/);

            const predicate = sign > 0 ? (frame) => frame <= frameTo : (frame) => frame >= frameTo;
            const update = sign > 0 ? (frame) => frame + 1 : (frame) => frame - 1;
            for (let frame = frameFrom; predicate(frame); frame = update(frame)) {
                // First prepare all data for the frame
                // Consider all shapes, tags, and not outside tracks that have keyframe here
                // In particular consider first and last frame as keyframes for all tracks
                const statesData = [].concat(
                    (frame in this.shapes ? this.shapes[frame] : [])
                        .filter((shape) => !shape.removed)
                        .map((shape) => shape.get(frame)),
                    (frame in this.tags ? this.tags[frame] : [])
                        .filter((tag) => !tag.removed)
                        .map((tag) => tag.get(frame)),
                );
                const tracks = Object.values(this.tracks)
                    .filter((track) => (
                        frame in track.shapes || frame === frameFrom ||
                        frame === frameTo || linearSearch))
                    .filter((track) => !track.removed);
                statesData.push(...tracks.map((track) => track.get(frame)).filter((state) => !state.outside));

                // Nothing to filtering, go to the next iteration
                if (!statesData.length) {
                    continue;
                }

                // Filtering
                const filtered = this.annotationsFilter.filter(statesData, filters);
                if (filtered.length) {
                    return frame;
                }
            }

            return null;
        }
    }

    module.exports = Collection;
})();
