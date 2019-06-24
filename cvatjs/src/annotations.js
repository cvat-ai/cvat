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
        constructor(data, clientID) {
            this._clientID = clientID;
            this._serverID = data.id;
            this._labelID = data.label_id;
            this._frame = data.frame;
            this._attributes = data.attributes.reduce((attributeAccumulator, attr) => {
                attributeAccumulator[attr.spec_id] = attr.value;
                return attributeAccumulator;
            }, {});
        }
    }

    class Shape extends Annotation {
        constructor(data, clientID, color) {
            super(data, clientID);
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
    }

    class Track extends Annotation {
        constructor(data, clientID, color) {
            super(data, clientID);
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
    }

    class Tag extends Annotation {
        constructor(data, clientID) {
            super(data, clientID);
        }

        toJSON() {
            // TODO: Tags support
            return {};
        }
    }

    class RectangleShape extends Shape {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'rectangle';
        }
    }

    class PolyShape extends Shape {
        constructor(data, clientID, color) {
            super(data, clientID, color);
        }
    }

    class PolygonShape extends PolyShape {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'polygon';
        }
    }

    class PolylineShape extends PolyShape {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'polyline';
        }
    }

    class PointsShape extends PolyShape {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'points';
        }
    }

    class RectangleTrack extends Track {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'rectangle';
        }
    }

    class PolyTrack extends Track {
        constructor(data, clientID, color) {
            super(data, clientID, color);
        }
    }

    class PolygonTrack extends PolyTrack {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'polygon';
        }
    }

    class PolylineTrack extends PolyTrack {
        constructor(data, clientID, color) {
            super(data, clientID, color);
            this._type = 'polyline';
        }
    }

    class PointsTrack extends PolyTrack {
        constructor(data, clientID, color) {
            super(data, clientID, color);
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

        import(data) {
            this.empty();

            function shapeFactory(shapeData, clientID) {
                const { type } = shapeData;
                const color = colors[clientID % colors.length];
                let shapeModel = null;
                switch (type) {
                case 'rectangle':
                    shapeModel = new RectangleShape(shapeData, clientID, color);
                    break;
                case 'polygon':
                    shapeModel = new PolygonShape(shapeData, clientID, color);
                    break;
                case 'polyline':
                    shapeModel = new PolylineShape(shapeData, clientID, color);
                    break;
                case 'points':
                    shapeModel = new PointsShape(shapeData, clientID, color);
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
                        trackModel = new RectangleTrack(trackData, clientID, color);
                        break;
                    case 'polygon':
                        trackModel = new PolygonTrack(trackData, clientID, color);
                        break;
                    case 'polyline':
                        trackModel = new PolylineTrack(trackData, clientID, color);
                        break;
                    case 'points':
                        trackModel = new PointsTrack(trackData, clientID, color);
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
                const tagModel = new Tag(tag, ++this._count);
                this._tags[tagModel.frame] = this._tags[tagModel.frame] || [];
                this._tags[tagModel.frame].push(tagModel);
            }

            for (const shape of data.shapes) {
                const shapeModel = shapeFactory(shape, this._count++);
                this._shapes[shapeModel.frame] = this._shapes[shapeModel.frame] || [];
                this._shapes[shapeModel.frame].push(shapeModel);
            }

            for (const track of data.tracks) {
                const trackModel = trackFactory(track, ++this._count);
                if (trackModel) {
                    this._tracks.push(trackModel);
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
            this._count = 0;
        }

        get(frame, filters) {
            const tracks = this._tracks;
            const shapes = this._shapes[frame];
            const tags = this._tags[frame];

            return [];
/*
            const map = new WeakMap();
            for (const object of tracks.concat(shapes).concat(tags)) {
                map.set(object, object.get(frame));
            }

            let objects = tracks.map(track => track.get(frame))
                .concat(shapes.map(shape => shape.get(frame)))
                .concat(tags.map(tag => tag.get(frame)));

            if (Object.keys(filters).length) {
                objects = objects.filter(object => object.filter(filters));
            }

            return objects; */
        }
    }

    const jobCache = {};
    const taskCache = {};

    async function getJobAnnotations(jobID, frame, filter) {
        if (!(jobID in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getJobAnnotations(jobID);
            jobCache[jobID] = new Collection();
            jobCache[jobID].import(rawAnnotations);
        }

        return jobCache[jobID].get(frame, filter);
    }

    async function getTaskAnnotations(taskID, frame, filter) {
        if (!(taskID in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getTaskAnnotations(taskID);
            taskCache[taskID] = new Collection();
            taskCache[taskID].import(rawAnnotations);
        }

        return taskCache[taskID].get(frame, filter);
    }

    module.exports = {
        getJobAnnotations,
        getTaskAnnotations,
    };
})();
