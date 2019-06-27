/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const serverProxy = require('./server-proxy');
    const ObjectState = require('./object-state');

    class Annotation {
        constructor(data, clientID, injection) {
            this._clientID = clientID;
            this._serverID = data.id;
            this._labelID = data.label_id;
            this._frame = data.frame;
            this._attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});
            this._taskLabels = injection.labels;
        }
    }

    class Shape extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, injection);
            this._points = data.points;
            this._occluded = data.occluded;
            this._zOrder = data.z_order;
            this._color = color;
            this._type = null;
        }

        toJSON() {
            return {
                type: this._type,
                occluded: this._occluded,
                z_order: this._zOrder,
                points: [...this._points],
                attributes: Object.keys(this._attributes).reduce((attributeAccumulator, attrId) => {
                    attributeAccumulator.push({
                        spec_id: attrId,
                        value: this._attributes[attrId],
                    });

                    return attributeAccumulator;
                }, []),
                id: this._serverID,
                frame: this._frame,
                label_id: this._labelID,
                group: this._group,
            };
        }

        get(frame) {
            if (frame !== this._frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }

            return {
                clientID: this._clientID,
                type: this._type,
                occluded: this._occluded,
                zOrder: this._zOrder,
                points: [...this._points],
                attributes: Object.assign({}, this._attributes),
                label: this._labelID,
                group: this._group,
            };
        }
    }

    class Track extends Annotation {
        constructor(data, clientID, color, injection) {
            super(data, clientID, injection);
            this._shapes = data.shapes.reduce((shapeAccumulator, value) => {
                shapeAccumulator[value.frame] = {
                    serverID: value.id,
                    occluded: value.occluded,
                    zOrder: value.z_order,
                    points: value.points,
                    id: value.id,
                    frame: value.frame,
                    outside: value.outside,
                    attributes: value.attributes.reduce((attributeAccumulator, attr) => {
                        attributeAccumulator[attr.spec_id] = attr.value;
                        return attributeAccumulator;
                    }, {}),
                };

                return shapeAccumulator;
            }, {});

            this._attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});
            this._color = color;
            this._type = null;
        }

        toJSON() {
            return {
                occluded: this._occluded,
                z_order: this._zOrder,
                points: [...this._points],
                attributes: Object.keys(this._attributes).reduce((attributeAccumulator, attrId) => {
                    attributeAccumulator.push({
                        spec_id: attrId,
                        value: this._attributes[attrId],
                    });

                    return attributeAccumulator;
                }, []),

                id: this._serverID,
                frame: this._frame,
                label_id: this._labelID,
                group: this._group,
                shapes: Object.keys(this._shapes).reduce((shapesAccumulator, frame) => {
                    shapesAccumulator.push({
                        type: this._type,
                        occluded: this._shapes[frame].occluded,
                        z_order: this._shapes[frame].zOrder,
                        points: [...this._shapes[frame].points],
                        outside: [...this._shapes[frame].outside],
                        attributes: Object.keys(...this._shapes[frame].attributes)
                            .reduce((attributeAccumulator, attrId) => {
                                attributeAccumulator.push({
                                    spec_id: attrId,
                                    value: this._shapes[frame].attributes[attrId],
                                });

                                return attributeAccumulator;
                            }, []),
                        id: this._shapes[frame].serverID,
                        frame: +frame,
                    });

                    return shapesAccumulator;
                }, []),
            };
        }

        get(targetFrame) {
            return Object.assign(
                {},
                this.interpolatePosition(targetFrame),
                this.interpolateAttributes(targetFrame),
                {
                    label: this._labelID,
                    group: this._group,
                    type: this._type,
                    clientID: this._clientID,
                },
            );
        }

        neighborsFrames(targetFrame) {
            const frames = Object.keys(this._shapes).map(frame => +frame);
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
                left: leftFrame,
                right: rightFrame,
            };
        }

        interpolatePosition(targetFrame) {
            const {
                leftFrame,
                rightFrame,
            } = this.neighborsFrames(targetFrame);

            const rightPosition = rightFrame ? this._shapes[rightFrame] : null;
            const leftPosition = leftFrame ? this._shapes[leftFrame] : null;

            if (leftPosition && leftFrame === targetFrame) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: leftPosition.zOrder,
                };
            }

            if (rightPosition && leftPosition) {
                const offset = (targetFrame - leftFrame) / (rightPosition - leftPosition);
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

            if (rightPosition) {
                return {
                    points: [...rightPosition.points],
                    occluded: rightPosition.occluded,
                    outside: true,
                    zOrder: 0,
                };
            }

            if (leftPosition) {
                return {
                    points: [...leftPosition.points],
                    occluded: leftPosition.occluded,
                    outside: leftPosition.outside,
                    zOrder: 0,
                };
            }

            throw new window.cvat.exceptions.ScriptingError(
                `No one neightbour frame found for the track with client ID: "${this._id}"`,
            );
        }

        interpolateAttributes(targetFrame) {
            const result = {};

            // First of all copy all unmutable attributes
            for (const attrID in this._attributes) {
                if (Object.prototype.hasOwnProperty.call(this._attributes, attrID)) {
                    result[attrID] = this._attributes[attrID];
                }
            }

            // Secondly get latest mutable attributes up to target frame
            const frames = Object.keys(this._shapes).sort((a, b) => +a - +b);
            for (const frame of frames) {
                if (frame <= targetFrame) {
                    const { attributes } = this._shapes[frame];

                    for (const attrID in attributes) {
                        if (Object.prototype.hasOwnProperty.call(attributes, attrID)) {
                            result[attrID] = attributes[attrID];
                        }
                    }
                }
            }

            // Finally fill up remained attributes if they exist
            const labelAttributes = this._taskLabels.attributes;
            const defValuesByID = labelAttributes.reduce((accumulator, attr) => {
                accumulator[attr.id] = attr.defaultValue;
                return accumulator;
            }, {});

            for (const attrID of Object.keys(defValuesByID)) {
                if (!(attrID in result)) {
                    result[attrID] = defValuesByID[attrID];
                }
            }

            return result;
        }
    }

    class Tag extends Annotation {
        constructor(data, clientID, injection) {
            super(data, clientID, injection);
        }

        toJSON() {
            // TODO: Tags support
            return {};
        }

        get(frame) {
            if (frame !== this._frame) {
                throw new window.cvat.exceptions.ScriptingError(
                    'Got frame is not equal to the frame of the shape',
                );
            }
        }
    }

    class RectangleShape extends Shape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'rectangle';
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
            this._type = 'polygon';
        }
    }

    class PolylineShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'polyline';
        }
    }

    class PointsShape extends PolyShape {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'points';
        }
    }

    class RectangleTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'rectangle';
        }
    }

    class PolyTrack extends Track {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
        }
    }

    class PolygonTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'polygon';
        }
    }

    class PolylineTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'polyline';
        }
    }

    class PointsTrack extends PolyTrack {
        constructor(data, clientID, color, injection) {
            super(data, clientID, color, injection);
            this._type = 'points';
        }
    }

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


    class Collection {
        constructor() {
            this.empty();
        }

        import(data, labels) {
            this.empty();
            const injection = {
                labels,
            };

            function shapeFactory(shapeData, clientID) {
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
                    throw new window.cvat.exceptions.DataError(
                        `An unexpected type of shape "${type}"`,
                    );
                }

                return shapeModel;
            }


            function trackFactory(trackData, clientID) {
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
                        throw new window.cvat.exceptions.DataError(
                            `An unexpected type of track "${type}"`,
                        );
                    }

                    return trackModel;
                }

                console.warn('The track without any shapes had been found. It was ignored.');
                return null;
            }

            for (const tag of data.tags) {
                const clientID = ++this._count;
                const tagModel = new Tag(tag, clientID, injection);
                this._tags[tagModel.frame] = this._tags[tagModel.frame] || [];
                this._tags[tagModel.frame].push(tagModel);
                this._objects[clientID] = tagModel;
            }

            for (const shape of data.shapes) {
                const clientID = ++this._count;
                const shapeModel = shapeFactory(shape, clientID);
                this._shapes[shapeModel.frame] = this._shapes[shapeModel.frame] || [];
                this._shapes[shapeModel.frame].push(shapeModel);
                this._objects[clientID] = shapeModel;
            }

            for (const track of data.tracks) {
                const clientID = ++this._count;
                const trackModel = trackFactory(track, clientID);
                // The function can return null if track doesn't have any shapes.
                // In this case a corresponded message will be sent to the console
                if (trackModel) {
                    this._tracks.push(trackModel);
                    this._objects[clientID] = trackModel;
                }
            }
        }

        export() {
            const data = {
                tracks: Object.values(this._tracks).reduce((accumulator, value) => {
                    accumulator.push(...value);
                    return accumulator;
                }, []).map(track => track.toJSON()),
                shapes: this._shapes.map(shape => shape.toJSON()),
                tags: this._shapes.map(tag => tag.toJSON()),
            };

            return data;
        }

        empty() {
            this._shapes = {};
            this._tags = {};
            this._tracks = [];
            this._objects = {}; // by id
            this._count = 0;
        }

        get(frame, filters) {
            const tracks = this._tracks;
            const shapes = this._shapes[frame];
            const tags = this._tags[frame];

            const states = tracks.map(track => track.get(frame))
                .concat(shapes.map(shape => shape.get(frame)))
                .concat(tags.map(tag => tag.get(frame)));

            // filtering here

            const objectStates = [];
            for (const state of states) {
                const { clientID } = state;
                const objectModel = this._objects[clientID];
                const objectState = new ObjectState(state);
                objectState.save = objectModel.save.bind(objectState);
                objectState.delete = objectModel.save.bind(objectState);
                objectStates.push(objectState);
            }

            return objectStates;
        }
    }

    const jobCache = {};
    const taskCache = {};

    async function getJobAnnotations(job, frame, filter) {
        if (!(job.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getJobAnnotations(job.id);
            jobCache[job.id] = new Collection(job.task.labels);
            jobCache[job.id].import(rawAnnotations);
        }

        return jobCache[job.id].get(frame, filter);
    }

    async function getTaskAnnotations(task, frame, filter) {
        if (!(task.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getTaskAnnotations(task.id);
            taskCache[task.id] = new Collection(task.labels);
            taskCache[task.id].import(rawAnnotations);
        }

        return taskCache[task.id].get(frame, filter);
    }

    module.exports = {
        getJobAnnotations,
        getTaskAnnotations,
    };
})();
