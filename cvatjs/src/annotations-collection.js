/*
* Copyright (C) 2018 Intel Corporation
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
        Tag,
        objectStateFactory,
    } = require('./annotations-objects');

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
        constructor(labels) {
            this.labels = labels.reduce((labelAccumulator, label) => {
                labelAccumulator[label.id] = label;
                return labelAccumulator;
            }, {});

            this.shapes = {}; // key is frame
            this.tags = {}; // key is frame
            this.tracks = [];
            this.objects = {}; // key is client id
            this.count = 0;
            this.flush = false;
        }

        import(data) {
            const injection = {
                labels: this.labels,
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
                const clientID = ++this.count;
                const tagModel = new Tag(tag, clientID, injection);
                this.tags[tagModel.frame] = this.tags[tagModel.frame] || [];
                this.tags[tagModel.frame].push(tagModel);
                this.objects[clientID] = tagModel;
            }

            for (const shape of data.shapes) {
                const clientID = ++this.count;
                const shapeModel = shapeFactory(shape, clientID);
                this.shapes[shapeModel.frame] = this.shapes[shapeModel.frame] || [];
                this.shapes[shapeModel.frame].push(shapeModel);
                this.objects[clientID] = shapeModel;
            }

            for (const track of data.tracks) {
                const clientID = ++this.count;
                const trackModel = trackFactory(track, clientID);
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
                tracks: this.tracks.map(track => track.toJSON()),
                shapes: Object.values(this.shapes).reduce((accumulator, value) => {
                    accumulator.push(...value);
                    return accumulator;
                }, []).map(shape => shape.toJSON()),
                tags: Object.values(this.tags).reduce((accumulator, value) => {
                    accumulator.push(...value);
                    return accumulator;
                }, []).map(tag => tag.toJSON()),
            };

            return data;
        }

        empty() {
            this.shapes = {};
            this.tags = {};
            this.tracks = [];
            this.objects = {}; // by id
            this.count = 0;

            this.flush = true;
        }

        get(frame) {
            const { tracks } = this;
            const shapes = this.shapes[frame] || [];
            const tags = this.tags[frame] || [];

            const objects = tracks.concat(shapes).concat(tags).filter(object => !object.removed);
            // filtering here

            const objectStates = [];
            for (const object of objects) {
                const objectState = objectStateFactory.call(object, frame, object.get(frame));
                objectStates.push(objectState);
            }

            return objectStates;
        }
    }

    module.exports = Collection;
})();
