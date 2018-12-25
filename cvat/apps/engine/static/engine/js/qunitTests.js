/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

let qUnitTests = [];
window.cvat = {
    translate: {}
};

// Run all tests
window.addEventListener('DOMContentLoaded', function() {
    for (let qUnitTest of qUnitTests) {
        qUnitTest();
    }
});

qUnitTests.push(function() {
    let labelsInfo = null;

    QUnit.module('LabelsInfo_class', {
        before: function() {
            labelsInfo = makeLabelsInfo();
        }
    });

    QUnit.test('labelIdOf', function(assert) {
        assert.equal(labelsInfo.labelIdOf('person'), 13, 'Id of "person" must be 13');
        assert.equal(labelsInfo.labelIdOf('face'), 14, 'Id of "face" must be 14');
        assert.equal(labelsInfo.labelIdOf('car'), 15, 'Id of "car" must be 15');
        assert.equal(labelsInfo.labelIdOf('bicycle'), 16, 'Id of "bicycle" must be 16');
        assert.equal(labelsInfo.labelIdOf('motorcycle'), 17, 'Id of "motorcycle" must be 17');
        assert.equal(labelsInfo.labelIdOf('road'), 18, 'Id of "road" must be 18');
        assert.equal(labelsInfo.labelIdOf('unknown'), null, 'Id of "unknown" must be null');
    });

    QUnit.test('attrIdOf', function(assert) {
        assert.equal(labelsInfo.attrIdOf('14','beard'), 38, 'Attribute id must be equal 38');
        assert.equal(labelsInfo.attrIdOf('15','parked'), 42, 'Attribute id must be equal 42');
        assert.equal(labelsInfo.attrIdOf('unknown','driver'), null, 'Attribute id must be equal null');
        assert.equal(labelsInfo.attrIdOf('15','unknown'), null, 'Attribute id must be equal null');
    });

    QUnit.test('strToValues', function(assert) {
        assert.deepEqual(labelsInfo.strToValues('checkbox', 'false'), [false]);
        assert.deepEqual(labelsInfo.strToValues('checkbox', 'false,true'), [true]);
        assert.deepEqual(labelsInfo.strToValues('checkbox', '0'), [false]);
        assert.deepEqual(labelsInfo.strToValues('checkbox', false), [false]);
        assert.deepEqual(labelsInfo.strToValues('checkbox', 'abrakadabra'), [true]);
        assert.deepEqual(labelsInfo.strToValues('select', 'value1,value2,value3'), ['value1', 'value2', 'value3']);
        assert.deepEqual(labelsInfo.strToValues('select', 'value1'), ['value1']);
        assert.deepEqual(labelsInfo.strToValues('text', 'value1,together value2 and 3'), ['value1,together value2 and 3']);
        assert.deepEqual(labelsInfo.strToValues('radio', 'value'), ['value']);
        assert.deepEqual(labelsInfo.strToValues('number', '1,2,3'), ['1','2','3']);
        assert.deepEqual(labelsInfo.strToValues('number', 1), ['1']);
    });

    QUnit.test('labels', function(assert) {
        let expected = {
            13:"person",
            14:"face",
            15:"car",
            16:"bicycle",
            17:"motorcycle",
            18:"road"
        };

        assert.deepEqual(labelsInfo.labels(), expected, 'Return value must be like expected');
    });

    QUnit.test('attributes', function(assert) {
        let expected = {
            35:"action",
            32:"age",
            33:"gender",
            31:"false_positive",
            34:"clother",
            37:"age",
            36:"glass",
            38:"beard",
            39:"race",
            40:"model",
            41:"driver",
            42:"parked",
            44:"driver",
            43:"sport",
            45:"model"
        };

        assert.deepEqual(labelsInfo.attributes(), expected, 'Return value must be like expected');
    });

    QUnit.test('labelAttributes', function(assert) {
        assert.deepEqual(labelsInfo.labelAttributes(13), {
            35:"action",
            32:"age",
            33:"gender",
            31:"false_positive",
            34:"clother"
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.labelAttributes("14"), {
            37:"age",
            36:"glass",
            38:"beard",
            39:"race"
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.labelAttributes(15), {
            40:"model",
            41:"driver",
            42:"parked"
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.labelAttributes(16), {
            44:"driver",
            43:"sport"
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.labelAttributes(13), labelsInfo.labelAttributes("13"), 'Return values must be equal');
        assert.deepEqual(labelsInfo.labelAttributes(100), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.labelAttributes(), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.labelAttributes(null), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.labelAttributes("road"), {}, 'Return value must be empty object');
    });

    QUnit.test('attrInfo', function(assert) {
        assert.deepEqual(labelsInfo.attrInfo(35), {
            name:"action",
            type:"select",
            mutable:true,
            values: [
                "__undefined__",
                "sitting",
                "raising_hand",
                "standing"
            ]
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.attrInfo(34), {
            name:"clother",
            type:"text",
            mutable:true,
            values: [
                "non-initialized"
            ]
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.attrInfo(41), {
            name:"driver",
            type:"select",
            mutable:false,
            values: [
                "__undefined__",
                "man",
                "woman"
            ]
        }, 'Return value must be like expected');

        assert.deepEqual(labelsInfo.attrInfo(37), labelsInfo.attrInfo("37"), 'Return values must be equal');
        assert.deepEqual(labelsInfo.attrInfo(100), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.attrInfo(), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.attrInfo("clother"), {}, 'Return value must be empty object');
        assert.deepEqual(labelsInfo.attrInfo(null), {}, 'Return value must be empty object');
    });
});


// annotation parser unit tests
qUnitTests.push(function() {
    let annotationParser = null;

    QUnit.module('AnnotatinParser_class', {
        before: function() {
            annotationParser = makeAnnotationParser();
        }
    });

    let metaBlock =
    `<meta>
        <task>
            <id>5</id>
            <name>QUnitTests</name>
            <size>16</size>
            <mode>annotation</mode>
            <overlap>0</overlap>
            <bugtracker></bugtracker>
            <flipped>False</flipped>
            <created>2018-12-24 16:43:33.275376+03:00</created>
            <updated>2018-12-24 16:52:19.644934+03:00</updated>
            <source>16 images: 12642-1.jpg, 24443-ycfych.jpeg, ...</source>
            <labels>
                <label>
                <name>person</name>
                <attributes>
                    <attribute>@checkbox=false_positive:false</attribute>
                    <attribute>@number=age:1,100,1</attribute>
                    <attribute>@select=gender:male,female</attribute>
                    <attribute>~text=clother:non-initialized</attribute>
                    <attribute>~select=action:__undefined__,sitting,raising_hand,standing</attribute>
                </attributes>
                </label>
                <label>
                <name>face</name>
                <attributes>
                    <attribute>@select=glass:__undefined__,skip,no,sunglass,transparent,other</attribute>
                    <attribute>@select=age:__undefined__,skip,baby (0-5),child (6-12),adolescent (13-19),adult (20-45),middle-age (46-64),old (65-)</attribute>
                    <attribute>@select=beard:__undefined__,skip,no,yes</attribute>
                    <attribute>@select=race:__undefined__,skip,asian,black,caucasian,other</attribute>
                </attributes>
                </label>
                <label>
                <name>car</name>
                <attributes>
                    <attribute>@select=model:__undefined__,bmw,mazda,suzuki,kia</attribute>
                    <attribute>@select=driver:__undefined__,man,woman</attribute>
                    <attribute>~checkbox=parked:true</attribute>
                </attributes>
                </label>
                <label>
                <name>bicycle</name>
                <attributes>
                    <attribute>~checkbox=sport:false</attribute>
                    <attribute>@radio=driver:man,woman</attribute>
                </attributes>
                </label>
                <label>
                <name>motorcycle</name>
                <attributes>
                    <attribute>@text=model:unknown</attribute>
                </attributes>
                </label>
                <label>
                <name>road</name>
                <attributes>
                </attributes>
                </label>
            </labels>
            <segments>
                <segment>
                <id>3</id>
                <start>0</start>
                <stop>15</stop>
                <url>http://localhost:8081/?id=3</url>
                </segment>
            </segments>
            <owner>
                <username>admin</username>
                <email></email>
            </owner>
        </task>
        <dumped>2018-12-25 11:58:50.400406+03:00</dumped>
    </meta>
    `;

    let correctXml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
        ${metaBlock}
        <image id="0" name="12642-1.jpg" width="1920" height="1280">
            <box label="face" xtl="438.21" ytl="291.96" xbr="1043.12" ybr="764.95" occluded="0" z_order="8">
                <attribute name="glass">no</attribute>
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
            <box label="face" xtl="1077.47" ytl="489.11" xbr="1682.38" ybr="962.10" occluded="0" z_order="9">
                <attribute name="glass">no</attribute>
                <attribute name="age">__undefined__</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
            <polygon label="person" points="328.74,1031.61;633.30,1219.68;1010.84,1106.00;641.72,929.16" occluded="0" z_order="10">
                <attribute name="false_positive">false</attribute>
                <attribute name="age">25</attribute>
                <attribute name="gender">female</attribute>
                <attribute name="clother">non-initialized</attribute>
                <attribute name="action">standing</attribute>
            </polygon>
            <polygon label="person" points="1064.14,997.18;1368.70,1185.26;1746.24,1071.57;1377.12,894.73" occluded="0" z_order="11">
                <attribute name="false_positive">false</attribute>
                <attribute name="age">25</attribute>
                <attribute name="gender">female</attribute>
                <attribute name="clother">non-initialized</attribute>
                <attribute name="action">standing</attribute>
            </polygon>
            <polyline label="road" points="108.39,1021.79;275.40,329.86" occluded="1" z_order="13">
            </polyline>
            <points label="road" points="1304.18,345.30;1544.18,317.23;1643.82,196.53;1309.79,190.91" occluded="0" z_order="14">
            </points>
        </image>
    </annotations>`;

    let incorrectXml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
        ${metaBlock}
        <image id="0" name="12642-1.jpg" width="1920" height="1280">
            <box label="face" xtl="438.21" ytl="291.96" xbr="1043.12" ybr="764.95" occluded="0" z_order="8">
                <attribute name="glass">no</attribute>
                <attribute name="age">adult (20-
        </image>
    </annotations>`;

    let unknownLabel =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
        ${metaBlock}
        <image id="0" name="12642-1.jpg" width="1920" height="1280">
            <box label="unknown" xtl="438.21" ytl="291.96" xbr="1043.12" ybr="764.95" occluded="0" z_order="8">
                <attribute name="glass">no</attribute>
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
        </image>
    </annotations>`;

    let unknownAttribute =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
        ${metaBlock}
        <image id="0" name="12642-1.jpg" width="1920" height="1280">
            <box label="face" xtl="438.21" ytl="291.96" xbr="1043.12" ybr="764.95" occluded="0" z_order="8">
                <attribute name="unknown">no</attribute>
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
        </image>
    </annotations>`;

    let badAttributeValues =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
        ${metaBlock}
        <image id="0" name="12642-1.jpg" width="1920" height="1280">
            <box label="face" xtl="438.21" ytl="291.96" xbr="1043.12" ybr="764.95" occluded="0" z_order="8">
                <attribute name="glass">some bad value</attribute>
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
        </image>
    </annotations>`;

    let emptyXml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
        <version>1.1</version>
    </annotations>`;

    let empty = {
        "boxes": [],
        "box_paths": [],
        "polygons": [],
        "polygon_paths": [],
        "points": [],
        "points_paths": [],
        "polylines": [],
        "polyline_paths": [],
    };

    QUnit.test('parse', function(assert) {
        assert.deepEqual(annotationParser.parse(correctXml), window.jobData, 'Return value must be like expected.');
        assert.deepEqual(annotationParser.parse(emptyXml), empty, 'Return value must be like expected.');
        assert.throws(annotationParser.parse.bind(annotationParser, badAttributeValues), 'This function must throw exception. Bad attribute values into XML.');
        assert.throws(annotationParser.parse.bind(annotationParser, incorrectXml),'This function must throw exception. Bad input xml.');
        assert.throws(annotationParser.parse.bind(annotationParser, unknownLabel),'This function must throw exception. Unknown label in input xml.');
        assert.throws(annotationParser.parse.bind(annotationParser, unknownAttribute),'This function must throw exception. Unknown attribute in input xml.');
    });
});



// listener interface
qUnitTests.push(function() {
    QUnit.module('Listener_interface');
    QUnit.test('subscribe', function(assert) {
        let listenerInterface = new Listener('onUpdate', () => {return {};});

        let dummyListener1 = {
            onUpdate: function() {}
        };

        let dummyListener2 = {
            onUpdate: 'someProp'
        };

        let dummyListener3 = {
            // no onUpdate property
        };

        let dummyListener4 = {
            onUpdate: function() {}
        };

        let dummyListener5 = {
            onUpdate: function() {}
        };

        listenerInterface.subscribe(dummyListener1); // no exceptions, listener added
        assert.throws(listenerInterface.subscribe.bind(listenerInterface, dummyListener2), 'Function must be throw exception. Fake listener does not have onUpdate function');
        assert.throws(listenerInterface.subscribe.bind(listenerInterface, dummyListener3), 'Function must be throw exception. Fake listener does not have onUpdate function');
        assert.deepEqual(listenerInterface._listeners, [dummyListener1], 'One listener must be added'); // check internal state
        listenerInterface.subscribe(dummyListener4); // no exceptions, listener added
        listenerInterface.subscribe(dummyListener5); // no exceptions, listener added
        assert.deepEqual(listenerInterface._listeners, [dummyListener1, dummyListener4, dummyListener5], 'Three listener must be added'); // check internal state
    });


    QUnit.test('unsubscribe', function(assert) {
        let listenerInterface = new Listener('onUpdate', () => {return {};});

        let dummyListener1 = {
            onUpdate: function() {}
        };

        let dummyListener2 = {
            onUpdate: function() {}
        };

        let dummyListener3 = {
            onUpdate: function() {}
        };

        let dummyListener4 = {
            onUpdate: function() {}
        };

        listenerInterface.subscribe(dummyListener1);
        listenerInterface.subscribe(dummyListener2);
        listenerInterface.subscribe(dummyListener3);
        listenerInterface.subscribe(dummyListener4);

        listenerInterface.unsubscribe(dummyListener2);
        listenerInterface.unsubscribe(dummyListener4);

        assert.throws(listenerInterface.unsubscribe.bind(listenerInterface, null), 'Function must throw exception. Listener is not an object.');
        assert.throws(listenerInterface.unsubscribe.bind(listenerInterface), 'Function must throw exception. Listener is not an object.');
        assert.deepEqual(listenerInterface._listeners, [dummyListener1, dummyListener3], 'Two listeners must be added');

        listenerInterface.unsubscribe(dummyListener1);
        listenerInterface.unsubscribe(dummyListener3);

        assert.deepEqual(listenerInterface._listeners, [], 'Listener state must be empty');
    });

    QUnit.test('unsubscribeAll', function(assert) {
        let listenerInterface = new Listener('onUpdate', () => {return {};});
        let dummyListener1 = { onUpdate: function() {} };
        let dummyListener2 = { onUpdate: function() {} };

        listenerInterface.subscribe(dummyListener1);
        listenerInterface.subscribe(dummyListener2);

        listenerInterface.unsubscribeAll();
        assert.deepEqual(listenerInterface._listeners, [], 'Listener state must be empty');
    });
});



// player model unit tests
qUnitTests.push(function() {
    let playerModel = null;
    QUnit.module('PlayerModel_class', {
        before: function() {
            playerModel = makePlayerModel();
        }
    });

    QUnit.test('scale', function(assert) {
        // Scale when player is not ready
        assert.expect(0);
        playerModel.scale(20,20,1);
    });


    QUnit.test('fit', function(assert) {
        // Fit when player is not ready
        assert.expect(0);
        playerModel.fit();
    });
});

function makeLabelsInfo() {
    return new LabelsInfo(window.job);
}

function makeAnnotationParser() {
    return new AnnotationParser(window.job, makeLabelsInfo(), makeIncrementIdGenerator());
}

function makeIncrementIdGenerator() {
    return new IncrementIdGenerator(window.job.max_shape_id + 1);
}

function makePlayerModel() {
    let dummyPlayerGeometry = {
        width: 800,
        height: 600,
        left: 10,
        top: 10
    };

    return new PlayerModel(window.job, dummyPlayerGeometry);
}


// stub data
window.job = {
    "image_meta_data": {
        "original_size": [{
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1024,
            "width": 962
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 200,
            "width": 200
        }, {
            "height": 256,
            "width": 128
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }, {
            "height": 1280,
            "width": 1920
        }]
    },
    "z_order": true,
    "start": 0,
    "slug": "QUnitTests",
    "mode": "annotation",
    "labels": {
        "18": "road",
        "17": "motorcycle",
        "16": "bicycle",
        "15": "car",
        "14": "face",
        "13": "person"
    },
    "status": "annotation",
    "flipped": false,
    "taskid": 5,
    "overlap": 0,
    "max_shape_id": 6,
    "stop": 15,
    "jobid": 3,
    "attributes": {
        "16": {
            "43": "~checkbox=sport:false",
            "44": "@radio=driver:man,woman"
        },
        "17": {
            "45": "@text=model:unknown"
        },
        "18": {

        },
        "13": {
            "32": "@number=age:1,100,1",
            "33": "@select=gender:male,female",
            "34": "~text=clother:non-initialized",
            "35": "~select=action:__undefined__,sitting,raising_hand,standing",
            "31": "@checkbox=false_positive:false"
        },
        "14": {
            "36": "@select=glass:__undefined__,skip,no,sunglass,transparent,other",
            "37": "@select=age:__undefined__,skip,baby (0-5),child (6-12),adolescent (13-19),adult (20-45),middle-age (46-64),old (65-)",
            "38": "@select=beard:__undefined__,skip,no,yes",
            "39": "@select=race:__undefined__,skip,asian,black,caucasian,other"
        },
        "15": {
            "40": "@select=model:__undefined__,bmw,mazda,suzuki,kia",
            "41": "@select=driver:__undefined__,man,woman",
            "42": "~checkbox=parked:true"
        }
    }
};

window.jobData = {
    "polyline_paths": [],
    "points_paths": [],
    "box_paths": [],
    "polygon_paths": [],
    "polygons": [{
        "occluded": 0,
        "group_id": 0,
        "attributes": [{
            "id": "31",
            "value": false
        }, {
            "id": "32",
            "value": "25"
        }, {
            "id": "33",
            "value": "female"
        }, {
            "id": "34",
            "value": "non-initialized"
        }, {
            "id": "35",
            "value": "standing"
        }],
        "label_id": 13,
        "z_order": 10,
        "id": 9,
        "points": "328.74,1031.61 633.3,1219.68 1010.84,1106 641.72,929.16",
        "frame": 0
    }, {
        "occluded": 0,
        "group_id": 0,
        "attributes": [{
            "id": "31",
            "value": false
        }, {
            "id": "32",
            "value": "25"
        }, {
            "id": "33",
            "value": "female"
        }, {
            "id": "34",
            "value": "non-initialized"
        }, {
            "id": "35",
            "value": "standing"
        }],
        "label_id": 13,
        "z_order": 11,
        "id": 10,
        "points": "1064.14,997.18 1368.7,1185.26 1746.24,1071.57 1377.12,894.73",
        "frame": 0
    }],
    "polylines": [{
        "occluded": 1,
        "group_id": 0,
        "attributes": [],
        "label_id": 18,
        "z_order": 13,
        "id": 11,
        "points": "108.39,1021.79 275.4,329.86",
        "frame": 0
    }],
    "points": [{
        "occluded": 0,
        "group_id": 0,
        "attributes": [],
        "label_id": 18,
        "z_order": 14,
        "id": 12,
        "points": "1304.18,345.3 1544.18,317.23 1643.82,196.53 1309.79,190.91",
        "frame": 0
    }],
    "boxes": [{
        "xtl": 438.21,
        "group_id": 0,
        "xbr": 1043.12,
        "ytl": 291.96,
        "label_id": 14,
        "z_order": 8,
        "id": 7,
        "attributes": [{
            "id": "36",
            "value": "no"
        }, {
            "id": "37",
            "value": "adult (20-45)"
        }, {
            "id": "38",
            "value": "no"
        }, {
            "id": "39",
            "value": "asian"
        }],
        "ybr": 764.95,
        "occluded": 0,
        "frame": 0
    }, {
        "xtl": 1077.47,
        "group_id": 0,
        "xbr": 1682.38,
        "ytl": 489.11,
        "label_id": 14,
        "z_order": 9,
        "id": 8,
        "attributes": [{
            "id": "36",
            "value": "no"
        }, {
            "id": "37",
            "value": "__undefined__"
        }, {
            "id": "38",
            "value": "no"
        }, {
            "id": "39",
            "value": "asian"
        }],
        "ybr": 962.1,
        "occluded": 0,
        "frame": 0
    }],
};
