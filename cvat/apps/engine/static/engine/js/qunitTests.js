/*
* Copyright (C) 2018 Intel Corporation
*
* SPDX-License-Identifier: MIT
*/

/* global
    LabelsInfo:false
    Listener:false
    PlayerModel:false
*/

const tests = [];
const jobData = {
    url: 'http://localhost:7000/api/v1/jobs/3',
    id: 3,
    assignee: null,
    status: 'annotation',
    start_frame: 0,
    stop_frame: 7,
    task_id: 3,
};

window.cvat = {
    player: {
        frames: {
            start: jobData.start_frame,
            stop: jobData.stop_frame,
            current: 0,
        },
        geometry: {},
    },
    translate: {},
};

const taskData = {
    url: 'http://localhost:7000/api/v1/tasks/3',
    id: 3,
    name: 'QUnitTests',
    size: 8,
    mode: 'annotation',
    owner: 1,
    assignee: null,
    bug_tracker: '',
    created_date: '2019-03-27T16:19:24.525806+03:00',
    updated_date: '2019-03-27T16:19:24.525858+03:00',
    overlap: 0,
    segment_size: 0,
    z_order: false,
    flipped: false,
    status: 'annotation',
    labels: [
        {
            id: 17,
            name: 'bicycle',
            attributes: [
                {
                    id: 28,
                    name: 'driver',
                    mutable: false,
                    input_type: 'radio',
                    default_value: 'man',
                    values: [
                        'man',
                        'woman',
                    ],
                },
                {
                    id: 29,
                    name: 'sport',
                    mutable: true,
                    input_type: 'checkbox',
                    default_value: 'false',
                    values: [
                        'false',
                    ],
                },
            ],
        },
        {
            id: 16,
            name: 'car',
            attributes: [
                {
                    id: 25,
                    name: 'model',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'bmw',
                        'mazda',
                        'suzuki',
                        'kia',
                    ],
                },
                {
                    id: 26,
                    name: 'driver',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'man',
                        'woman',
                    ],
                },
                {
                    id: 27,
                    name: 'parked',
                    mutable: true,
                    input_type: 'checkbox',
                    default_value: 'true',
                    values: [
                        'true',
                    ],
                },
            ],
        },
        {
            id: 15,
            name: 'face',
            attributes: [
                {
                    id: 21,
                    name: 'age',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'skip',
                        'baby (0-5)',
                        'child (6-12)',
                        'adolescent (13-19)',
                        'adult (20-45)',
                        'middle-age (46-64)',
                        'old (65-)',
                    ],
                },
                {
                    id: 22,
                    name: 'glass',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'skip',
                        'no',
                        'sunglass',
                        'transparent',
                        'other',
                    ],
                },
                {
                    id: 23,
                    name: 'beard',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'skip',
                        'no',
                        'yes',
                    ],
                },
                {
                    id: 24,
                    name: 'race',
                    mutable: false,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'skip',
                        'asian',
                        'black',
                        'caucasian',
                        'other',
                    ],
                },
            ],
        },
        {
            id: 18,
            name: 'motorcycle',
            attributes: [
                {
                    id: 30,
                    name: 'model',
                    mutable: false,
                    input_type: 'text',
                    default_value: 'unknown',
                    values: [
                        'unknown',
                    ],
                },
            ],
        },
        {
            id: 14,
            name: 'person, pedestrian',
            attributes: [
                {
                    id: 16,
                    name: 'action',
                    mutable: true,
                    input_type: 'select',
                    default_value: '__undefined__',
                    values: [
                        '__undefined__',
                        'sitting',
                        'raising_hand',
                        'standing',
                    ],
                },
                {
                    id: 17,
                    name: 'age',
                    mutable: false,
                    input_type: 'number',
                    default_value: '1',
                    values: [
                        '1',
                        '100',
                        '1',
                    ],
                },
                {
                    id: 18,
                    name: 'gender',
                    mutable: false,
                    input_type: 'select',
                    default_value: 'male',
                    values: [
                        'male',
                        'female',
                    ],
                },
                {
                    id: 19,
                    name: 'false positive',
                    mutable: false,
                    input_type: 'checkbox',
                    default_value: 'false',
                    values: [
                        'false',
                    ],
                },
                {
                    id: 20,
                    name: 'clother',
                    mutable: true,
                    input_type: 'text',
                    default_value: 'non, initialized',
                    values: [
                        'non, initialized',
                    ],
                },
            ],
        },
        {
            id: 19,
            name: 'road',
            attributes: [],
        },
    ],
    segments: [
        {
            start_frame: 0,
            stop_frame: 7,
            jobs: [
                {
                    url: 'http://localhost:7000/api/v1/jobs/3',
                    id: 3,
                    assignee: null,
                    status: 'annotation',
                },
            ],
        },
    ],
    image_quality: 95,
};


function makeLabelsInfo() {
    return new LabelsInfo(taskData.labels);
}

function makePlayerModel() {
    const dummyPlayerGeometry = {
        width: 800,
        height: 600,
        left: 10,
        top: 10,
    };

    return new PlayerModel(taskData, dummyPlayerGeometry);
}

// Run all tests
window.addEventListener('DOMContentLoaded', () => {
    for (const test of tests) {
        test();
    }
});

tests.push(() => {
    let labelsInfo = null;
    QUnit.module('LabelsInfo', {
        before() {
            labelsInfo = makeLabelsInfo();
        },
    });

    QUnit.test('labelIdOf', (assert) => {
        assert.equal(labelsInfo.labelIdOf('bicycle'), 17);
        assert.equal(labelsInfo.labelIdOf('car'), 16);
        assert.equal(labelsInfo.labelIdOf('face'), 15);
        assert.equal(labelsInfo.labelIdOf('motorcycle'), 18);
        assert.equal(labelsInfo.labelIdOf('person, pedestrian'), 14);
        assert.equal(labelsInfo.labelIdOf('road'), 19);
        assert.throws(labelsInfo.labelIdOf.bind(labelsInfo, 'unknown_label'));
    });

    QUnit.test('attrIdOf', (assert) => {
        assert.equal(labelsInfo.attrIdOf(14, 'action'), labelsInfo.attrIdOf('14', 'action'));
        assert.equal(labelsInfo.attrIdOf(18, 'model'), 30);
        assert.equal(labelsInfo.attrIdOf(15, 'age'), 21);
        assert.throws(labelsInfo.attrIdOf.bind(labelsInfo, 15, 'unknown_attribute'));
        assert.throws(labelsInfo.attrIdOf.bind(labelsInfo, 99, 'age'));
        assert.throws(labelsInfo.attrIdOf.bind(labelsInfo, undefined, 'driver'));
        assert.throws(labelsInfo.attrIdOf.bind(labelsInfo, '15', undefined));
    });

    QUnit.test('normalize', (assert) => {
        assert.equal(LabelsInfo.normalize('checkbox', 'false'), false);
        assert.equal(LabelsInfo.normalize('checkbox', 'false,true'), true);
        assert.equal(LabelsInfo.normalize('checkbox', '0'), false);
        assert.equal(LabelsInfo.normalize('checkbox', false), false);
        assert.equal(LabelsInfo.normalize('checkbox', 'abrakadabra'), true);
        assert.equal(LabelsInfo.normalize('select', 'value1'), 'value1');
        assert.equal(LabelsInfo.normalize('text', 'value1,together value2 and 3'), 'value1,together value2 and 3');
        assert.equal(LabelsInfo.normalize('radio', 'value'), 'value');
        assert.equal(LabelsInfo.normalize('number', '1'), 1);
        assert.equal(LabelsInfo.normalize('number', 1), 1);
        assert.throws(LabelsInfo.normalize.bind(LabelsInfo, 'number', 'abrakadabra'));
    });

    QUnit.test('labels', (assert) => {
        const expected = {
            14: 'person, pedestrian',
            15: 'face',
            16: 'car',
            17: 'bicycle',
            18: 'motorcycle',
            19: 'road',
        };

        assert.deepEqual(labelsInfo.labels(), expected);
    });

    QUnit.test('attributes', (assert) => {
        const expected = {
            16: 'action',
            17: 'age',
            18: 'gender',
            19: 'false positive',
            20: 'clother',
            21: 'age',
            22: 'glass',
            23: 'beard',
            24: 'race',
            25: 'model',
            26: 'driver',
            27: 'parked',
            28: 'driver',
            29: 'sport',
            30: 'model',
        };

        assert.deepEqual(labelsInfo.attributes(), expected);
    });

    QUnit.test('labelAttributes', (assert) => {
        assert.deepEqual(labelsInfo.labelAttributes(14), {
            16: 'action',
            17: 'age',
            18: 'gender',
            19: 'false positive',
            20: 'clother',
        });

        assert.deepEqual(labelsInfo.labelAttributes(15), {
            21: 'age',
            22: 'glass',
            23: 'beard',
            24: 'race',
        });

        assert.deepEqual(labelsInfo.labelAttributes(19), {});
        assert.deepEqual(labelsInfo.labelAttributes(14), labelsInfo.labelAttributes('14'));
        assert.throws(labelsInfo.labelAttributes.bind(labelsInfo, 100));
        assert.throws(labelsInfo.labelAttributes.bind(labelsInfo));
        assert.throws(labelsInfo.labelAttributes.bind(labelsInfo, null));
    });

    QUnit.test('attrInfo', (assert) => {
        assert.deepEqual(labelsInfo.attrInfo(21), {
            mutable: false,
            type: 'select',
            name: 'age',
            values: [
                '__undefined__',
                'skip',
                'baby (0-5)',
                'child (6-12)',
                'adolescent (13-19)',
                'adult (20-45)',
                'middle-age (46-64)',
                'old (65-)',
            ],
        });

        assert.deepEqual(labelsInfo.attrInfo(29), {
            mutable: true,
            type: 'checkbox',
            name: 'sport',
            values: [
                false,
            ],
        });

        assert.deepEqual(labelsInfo.attrInfo(23), labelsInfo.attrInfo('23'));
        assert.throws(labelsInfo.attrInfo.bind(labelsInfo, 100));
        assert.throws(labelsInfo.attrInfo.bind(labelsInfo));
        assert.throws(labelsInfo.attrInfo.bind(labelsInfo, 'clother'));
        assert.throws(labelsInfo.attrInfo.bind(labelsInfo, null));
    });
});


tests.push(() => {
    QUnit.module('Listener');

    QUnit.test('subscribe', (assert) => {
        const listenerInterface = new Listener('onUpdate', () => {});
        const dummyListener1 = {
            onUpdate() {},
        };
        const dummyListener2 = {
            onUpdate: 'someProp',
        };
        const dummyListener3 = {};
        const dummyListener4 = {
            onUpdate() {},
        };
        const dummyListener5 = {
            onUpdate() {},
        };

        listenerInterface.subscribe(dummyListener1); // no exceptions, listener added
        listenerInterface.subscribe(dummyListener4); // no exceptions, listener added
        listenerInterface.subscribe(dummyListener5); // no exceptions, listener added

        assert.throws(listenerInterface.subscribe.bind(listenerInterface, dummyListener2));
        assert.throws(listenerInterface.subscribe.bind(listenerInterface, dummyListener3));
    });

    QUnit.test('unsubscribe', (assert) => {
        const listenerInterface = new Listener('onUpdate', () => {});

        const dummyListener1 = {
            onUpdate() {},
        };

        const dummyListener2 = {
            onUpdate() {},
        };

        const dummyListener3 = {
            onUpdate() {},
        };

        const dummyListener4 = {
            onUpdate() {},
        };

        listenerInterface.subscribe(dummyListener1);
        listenerInterface.subscribe(dummyListener2);
        listenerInterface.subscribe(dummyListener3);
        listenerInterface.subscribe(dummyListener4);

        listenerInterface.unsubscribe(dummyListener2);
        listenerInterface.unsubscribe(dummyListener4);

        assert.throws(listenerInterface.unsubscribe.bind(listenerInterface, null));
        assert.throws(listenerInterface.unsubscribe.bind(listenerInterface));

        listenerInterface.unsubscribe(dummyListener1);
        listenerInterface.unsubscribe(dummyListener3);
    });

    QUnit.test('unsubscribeAll', (assert) => {
        const listenerInterface = new Listener('onUpdate', () => {});
        const dummyListener1 = {
            onUpdate() {},
        };

        const dummyListener2 = {
            onUpdate() {},
        };

        listenerInterface.subscribe(dummyListener1);
        listenerInterface.subscribe(dummyListener2);

        listenerInterface.unsubscribeAll();

        assert.expect(0);
    });
});

tests.push(() => {
    let playerModel = null;
    QUnit.module('PlayerModel', {
        before() {
            playerModel = makePlayerModel();
        },
    });

    QUnit.test('scale', (assert) => {
        // Scale when player is not ready
        assert.expect(0);
        playerModel.scale(20, 20, 1);
    });


    QUnit.test('fit', (assert) => {
        // Fit when player is not ready
        assert.expect(0);
        playerModel.fit();
    });
});

// TODO TESTS FOR ANNOTATIONS PARSER
