"use strict";

let qunit_tests = [];

// RUN ALL TESTS
window.addEventListener('DOMContentLoaded', function() {
    for (let qunit_test of qunit_tests) {
        qunit_test();
    }
});


// labels info unit tests
qunit_tests.push(function() {
    let labels_info = null;

    QUnit.module('labels_info_class', {
        before: function() {
            labels_info = make_labels_info();
        }
    });

    QUnit.test('labelIdOf', function(assert) {
        assert.equal(labels_info.labelIdOf('car'), 1, 'Id of "car" must be 1');
        assert.equal(labels_info.labelIdOf('bicycle'), 2, 'Id of "bicycle" must be 2');
        assert.equal(labels_info.labelIdOf('person'), 3, 'Id of "person" must be 3');
        assert.equal(labels_info.labelIdOf('motorcycle'), 4, 'Id of "motorcycle" must be 4');
        assert.equal(labels_info.labelIdOf('unknown'), null, 'Id of "unknown" must be null');
    });


    QUnit.test('attrIdOf', function(assert) {
        assert.equal(labels_info.attrIdOf('2','driver'), 4, 'Attribute id must be equal 4');
        assert.equal(labels_info.attrIdOf('3','age'), 7, 'Attribute id must be equal 7');
        assert.equal(labels_info.attrIdOf('unknown','driver'), null, 'Attribute id must be equal null');
        assert.equal(labels_info.attrIdOf('1','unknown'), null, 'Attribute id must be equal null');
    });


    QUnit.test('strToValues', function(assert) {
        assert.deepEqual(labels_info.strToValues('checkbox', 'false'), [false]);
        assert.deepEqual(labels_info.strToValues('checkbox', 'false,true'), [true]);
        assert.deepEqual(labels_info.strToValues('checkbox', '0'), [false]);
        assert.deepEqual(labels_info.strToValues('checkbox', false), [false]);
        assert.deepEqual(labels_info.strToValues('checkbox', 'abrakadabra'), [true]);
        assert.deepEqual(labels_info.strToValues('select', 'value1,value2,value3'), ['value1', 'value2', 'value3']);
        assert.deepEqual(labels_info.strToValues('select', 'value1'), ['value1']);
        assert.deepEqual(labels_info.strToValues('text', 'value1,together value2 and 3'), ['value1,together value2 and 3']);
        assert.deepEqual(labels_info.strToValues('radio', 'value'), ['value']);
        assert.deepEqual(labels_info.strToValues('number', '1,2,3'), ['1','2','3']);
    });


    QUnit.test('labels', function(assert) {
        let expected = {
            1: "car",
            2: "bicycle",
            3: "person",
            4: "motorcycle",
            5: "road",
        };
        assert.deepEqual(labels_info.labels(), expected, 'Return value must be like expected');
    });


    QUnit.test('attributes', function(assert) {
        let expected = {
            1: "model",
            2: "driver",
            3: "parked",
            4: "driver",
            5: "sport",
            6: "clother",
            7: "age",
            8: "model",
        };
        assert.deepEqual(labels_info.attributes(), expected, 'Return value must be like expected');
    });


    QUnit.test('labelAttributes', function(assert) {
        let expected_1 = {
            1: "model",
            2: "driver",
            3: "parked",
        };

        let expected_2 = {
            4: "driver",
            5: "sport",
        };

        let expected_3 = {
            6: "clother",
            7: "age",
        };

        let expected_4 = {
            8: "model",
        };

        assert.deepEqual(labels_info.labelAttributes(1), labels_info.labelAttributes("1"), 'Return values must be equal');
        assert.deepEqual(labels_info.labelAttributes("1"), expected_1, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes("2"), expected_2, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(3), expected_3, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(4), expected_4, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(45), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes(), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes(null), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes("car"), {}, 'Return value must be empty object');
    });


    QUnit.test('attrInfo', function(assert) {
        let expected_4 = {
            name: "driver",
            type: "radio",
            mutable: false,
            values: ["man", "woman"],
        };

        let expected_6 = {
            name: "clother",
            type: "text",
            mutable: true,
            values: ["non-initialized"],
        };

        assert.deepEqual(labels_info.attrInfo(4), labels_info.attrInfo("4"), 'Return values must be equal');
        assert.deepEqual(labels_info.attrInfo(4), expected_4, 'Return value must be like expected');
        assert.deepEqual(labels_info.attrInfo(6), expected_6, 'Return value must be like expected');
        assert.deepEqual(labels_info.attrInfo(45), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.attrInfo(), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.attrInfo("clother"), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.attrInfo(null), {}, 'Return value must be empty object');

    });
});


// annotation parser unit tests
qunit_tests.push(function() {
    let labels_info = null;
    let annotation_parser = null;

    QUnit.module('annotation_parser_class', {
        before: function() {
            labels_info = make_labels_info();
            annotation_parser = make_annotation_parser(labels_info);
        }
    });

    let correct_xml = `
	<annotations count="4">
		<image id="0" name="NongDa_South_Road_Fewer_2_000390.png">
			<box label="car" xtl="818.46" ytl="558.00" xbr="924.07" ybr="640.97" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="299.22" ytl="530.34" xbr="438.78" ybr="605.77" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="0.00" ytl="535.37" xbr="104.98" ybr="610.80" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="1135.91" ytl="565.54" xbr="1207.57" ybr="620.86" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="988.82" ytl="552.97" xbr="1030.30" ybr="595.71" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="person" xtl="1664.58" ytl="550.45" xbr="1737.50" ybr="842.13" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1574.06" ytl="565.54" xbr="1631.89" ybr="779.27" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1499.88" ytl="555.48" xbr="1548.91" ybr="762.93" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1448.34" ytl="558.00" xbr="1491.08" ybr="727.72" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1413.13" ytl="549.20" xbr="1445.82" ybr="712.64" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1350.27" ytl="549.20" xbr="1381.70" ybr="682.46" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
		</image>
		<image id="1" name="NongDa_South_Road_Fewer_2_000480.png">
			<box label="person" xtl="1576.57" ytl="552.97" xbr="1659.55" ybr="901.22" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1802.88" ytl="585.66" xbr="1909.74" ybr="972.88" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1354.04" ytl="561.77" xbr="1411.88" ybr="771.73" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="bicycle" xtl="985.67" ytl="565.54" xbr="1063.62" ybr="634.69" occluded="0"><attribute name="driver">man</attribute><attribute name="sport">false</attribute></box>
			<box label="bicycle" xtl="614.79" ytl="548.57" xbr="704.05" ybr="617.72" occluded="0"><attribute name="driver">man</attribute><attribute name="sport">false</attribute></box>
			<box label="bicycle" xtl="809.03" ytl="549.82" xbr="863.09" ybr="598.86" occluded="0"><attribute name="driver">man</attribute><attribute name="sport">false</attribute></box>
		</image>
		<image id="2" name="NongDa_South_Road_Fewer_2_001170.png">
			<box label="bicycle" xtl="1037.22" ytl="794.36" xbr="1198.15" ybr="1025.69" occluded="0"><attribute name="driver">man</attribute><attribute name="sport">false</attribute></box>
			<box label="person" xtl="1037.22" ytl="646.00" xbr="1186.83" ybr="853.45" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1284.89" ytl="571.83" xbr="1340.21" ybr="770.47" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1020.88" ytl="602.00" xbr="1054.82" ybr="697.55" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="car" xtl="727.94" ytl="589.43" xbr="802.12" ybr="651.03" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="613.53" ytl="586.91" xbr="696.51" ybr="647.26" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="335.68" ytl="579.37" xbr="423.69" ybr="632.17" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="199.90" ytl="565.54" xbr="296.71" ybr="627.14" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="299.22" ytl="576.86" xbr="350.77" ybr="628.40" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
		</image>
		<image id="3" name="NongDa_South_Road_Fewer_2_003150.png">
			<box label="car" xtl="1052.31" ytl="493.88" xbr="1160.43" ybr="586.91" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="936.64" ytl="422.22" xbr="1035.96" ybr="550.45" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="1171.74" ytl="446.10" xbr="1217.00" ybr="506.45" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="305.51" ytl="498.91" xbr="422.43" ybr="559.25" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="424.95" ytl="492.62" xbr="510.44" ybr="545.42" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="0.00" ytl="503.94" xbr="218.76" ybr="593.20" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="bicycle" xtl="255.22" ytl="486.33" xbr="316.82" ybr="593.20" occluded="0"><attribute name="driver">man</attribute><attribute name="sport">false</attribute></box>
			<box label="motorcycle" xtl="1213.23" ytl="472.50" xbr="1243.41" ybr="544.17" occluded="0"><attribute name="model">non_initialized</attribute></box>
			<box label="motorcycle" xtl="1165.46" ytl="480.05" xbr="1186.83" ybr="519.02" occluded="0"><attribute name="model">non_initialized</attribute></box>
			<box label="road" xtl="5.03" ytl="617.09" xbr="1916.03" ybr="1078.49" occluded="0"></box>
		</image>
	</annotations>
    `;

    let incorrect_xml = `
	<annotations count="4">
		<image id="0" name="NongDa_South_Road_Fewer_2_000390.png">
			<box label="car" xtl="818.46" ytl="558.00" xbr="924.07" ybr="640.97" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="299.22" ytl="530.34" xbr="438.78" ybr="605.77" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box la
    `;

    let unknown_label = `
	<annotations count="4">
		<image id="0" name="NongDa_South_Road_Fewer_2_000390.png">
			<box label="person" xtl="1664.58" ytl="550.45" xbr="1737.50" ybr="842.13" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="unknown" xtl="1574.06" ytl="565.54" xbr="1631.89" ybr="779.27" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
		</image>
	</annotations>
    `;

    let unknown_attribute = `
	<annotations count="4">
		<image id="0" name="NongDa_South_Road_Fewer_2_000390.png">
			<box label="person" xtl="1664.58" ytl="550.45" xbr="1737.50" ybr="842.13" occluded="0"><attribute name="age">1</attribute><attribute name="clother">non-initialized</attribute></box>
			<box label="person" xtl="1499.88" ytl="555.48" xbr="1548.91" ybr="762.93" occluded="0"><attribute name="unknown">1</attribute><attribute name="clother">non-initialized</attribute></box>
		</image>
	</annotations>
    `;

    let bad_attr_values = `
	<annotations count="4">
		<image id="0" name="NongDa_South_Road_Fewer_2_000390.png">
		<box label="car" xtl="727.94" ytl="589.43" xbr="802.12" ybr="651.03" occluded="0"><attribute name="model">bad_attribute</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
			<box label="car" xtl="613.53" ytl="586.91" xbr="696.51" ybr="647.26" occluded="0"><attribute name="model">__undefined__</attribute><attribute name="driver">__undefined__</attribute><attribute name="parked">true</attribute></box>
		</image>
	</annotations>
    `;

    let empty_xml = `<annotations count="4"></annotations>`;

    QUnit.test('parse', function(assert) {
        assert.deepEqual(annotation_parser.parse(correct_xml), window.job_tracks, 'Return value must be like expected.');
        assert.deepEqual(annotation_parser.parse(empty_xml), {"boxes": [], "tracks": []}, 'Return value must be like expected.');
        assert.throws(annotation_parser.parse.bind(annotation_parser, bad_attr_values), 'This function must throw exception. Bad attribute values into XML.');
        assert.throws(annotation_parser.parse.bind(annotation_parser, incorrect_xml),'This function must throw exception. Bad input xml.');
        assert.throws(annotation_parser.parse.bind(annotation_parser, unknown_label),'This function must throw exception. Unknown label in input xml.');
        assert.throws(annotation_parser.parse.bind(annotation_parser, unknown_attribute),'This function must throw exception. Unknown attribute in input xml.');
    });
});


// listener interface
qunit_tests.push(function() {
    QUnit.module('listener_interface');
    QUnit.test('subscribe', function(assert) {
        let listener_interface = new Listener('onUpdate', () => {return {};});

        let fake_listener_1 = {
            onUpdate: function() {}
        };

        let fake_listener_2 = {
            onUpdate: 'someProp'
        };

        let fake_listener_3 = {
            // no onUpdate property
        };

        let fake_listener_4 = {
            onUpdate: function() {}
        };

        let fake_listener_5 = {
            onUpdate: function() {}
        };

        listener_interface.subscribe(fake_listener_1); // no exceptions, listener added
        assert.throws(listener_interface.subscribe.bind(listener_interface, fake_listener_2), 'Function must be throw exception. Fake listener does not have onUpdate function');
        assert.throws(listener_interface.subscribe.bind(listener_interface, fake_listener_3), 'Function must be throw exception. Fake listener does not have onUpdate function');
        assert.deepEqual(listener_interface._listeners, [fake_listener_1], 'One listener must be added'); // check internal state
        listener_interface.subscribe(fake_listener_4); // no exceptions, listener added
        listener_interface.subscribe(fake_listener_5); // no exceptions, listener added
        assert.deepEqual(listener_interface._listeners, [fake_listener_1, fake_listener_4, fake_listener_5], 'Three listener must be added'); // check internal state
    });


    QUnit.test('unsubscribe', function(assert) {
        let listener_interface = new Listener('onUpdate', () => {return {};});

        let fake_listener_1 = {
            onUpdate: function() {}
        };

        let fake_listener_2 = {
            onUpdate: function() {}
        };

        let fake_listener_3 = {
            onUpdate: function() {}
        };

        let fake_listener_4 = {
            onUpdate: function() {}
        };

        listener_interface.subscribe(fake_listener_1);
        listener_interface.subscribe(fake_listener_2);
        listener_interface.subscribe(fake_listener_3);
        listener_interface.subscribe(fake_listener_4);

        listener_interface.unsubscribe(fake_listener_2);
        listener_interface.unsubscribe(fake_listener_4);

        assert.throws(listener_interface.unsubscribe.bind(listener_interface, null), 'Function must throw exception. Listener is not an object.');
        assert.throws(listener_interface.unsubscribe.bind(listener_interface), 'Function must throw exception. Listener is not an object.');
        assert.deepEqual(listener_interface._listeners, [fake_listener_1, fake_listener_3], 'Two listeners must be added');

        listener_interface.unsubscribe(fake_listener_1);
        listener_interface.unsubscribe(fake_listener_3);

        assert.deepEqual(listener_interface._listeners, [], 'Listener state must be empty');
    });

    QUnit.test('unsubscribeAll', function(assert) {
        let listener_interface = new Listener('onUpdate', () => {return {};});
        let fake_listener_1 = { onUpdate: function() {} };
        let fake_listener_2 = { onUpdate: function() {} };

        listener_interface.subscribe(fake_listener_1);
        listener_interface.subscribe(fake_listener_2);

        listener_interface.unsubscribeAll();
        assert.deepEqual(listener_interface._listeners, [], 'Listener state must be empty');
    });
});


// player model unit tests
qunit_tests.push(function() {
    let player_model = null;
    QUnit.module('player_model_class', {
        before: function() {
            player_model = make_player_model();
        }
    });

    QUnit.test('scale', function(assert) {
        // Scale when player is not ready
        assert.expect(0);
        player_model.scale(20,20,1);
    });


    QUnit.test('fit', function(assert) {
        // Fit when player is not ready
        assert.expect(0);
        player_model.fit();
    });
});


// collection model unit tests
qunit_tests.push(function() {
    let labels_info = null;
    let track_filter_model = null;
    let collection_model = null;

    QUnit.module('collection_model_class', {
        beforeEach: function() {
            labels_info = make_labels_info();
            track_filter_model = make_track_filter_model(labels_info);
            collection_model = make_collection_model(labels_info, track_filter_model);
        }
    });

    QUnit.test('import_empty_track', function(assert) {
        let data = {
            "boxes":[],
            "tracks":[
                {
                    "frame":0,
                    "boxes": [],
                    "attributes":[
                        {
                            "value":"__undefined__",
                            "id":1
                        },
                        {
                            "value":"man",
                            "id":2
                        }
                    ],
                    "label_id":1
                }
            ]
        };

        collection_model.importTracks(data);
        assert.equal(collection_model._allTracks.length, 0, "Empty track should not be imported");
    });

    QUnit.test('import_non_empty_track', function(assert) {
        let data = {
            "boxes":[],
            "tracks":[
                {
                    "frame":0,
                    "boxes": [
                        {
                            "ytl":686.2345581054688,
                            "ybr":903.736328125,
                            "occluded":false,
                            "xtl":401.05816650390625,
                            "outside":false,
                            "xbr":528.0390014648438,
                            "frame":0,
                            "attributes":[
                                {
                                    "value":"true",
                                    "id":3
                                }
                            ]
                        }
                    ],
                    "attributes":[
                        {
                            "value":"__undefined__",
                            "id":1
                        },
                        {
                            "value":"man",
                            "id":2
                        }
                    ],
                    "label_id":1
                }
            ]
        };


        collection_model.importTracks(data);
        assert.equal(collection_model._allTracks.length, 1, 'Track should be imported');
    });

    QUnit.test('save_outside_track', function(assert) {
        let data = {
            label: 1,
            boxes: [ [379, 254, 539, 407, 0, 1, 0], [379, 254, 539, 407, 1, 1, 0] ],
            attributes: []
        };

        collection_model.add(data);
        assert.deepEqual(JSON.parse(collection_model.exportTracks()), {tracks:[],boxes:[]}, 'Empty tracks should not be exported');
    });
});


// merger model unit tests
qunit_tests.push(function() {
    let labels_info = null;
    let track_filter_model = null;
    let collection_model = null;
    let merger_model = null;

    QUnit.module('merger_model_class', {
        before: function()  {
            labels_info = make_labels_info();
            track_filter_model = make_track_filter_model(labels_info);
            collection_model = make_collection_model(labels_info, track_filter_model);
            collection_model.importTracks(window.job_tracks);
            merger_model = make_merger_model(collection_model);
            collection_model.onchangeframe(0);
            merger_model.enableMergeMode();
        },
        after: function() {
            merger_model.disableMergeMode();
            collection_model.resetactivetrack();
        }
    });


    QUnit.test('add_to_merge', function(assert) {
        let rand_track = collection_model.currentTracks[0].trackModel;   // get any track
        collection_model.setactivetrack(rand_track.id);  // simulate mouseover
        rand_track.onSelect();   // simulate mousedown
        assert.ok(merger_model._mergeTracks[0] == rand_track, '');
    });
});


// attribute annotation mode unit tests
qunit_tests.push(function() {
    let labels_info = null;
    let track_filter_model = null;
    let player_model = null;
    let collection_model = null;
    let aam_model = null;

    QUnit.module('attribute_annotation_model_class', {
        before: function() {
            labels_info = make_labels_info();
            track_filter_model = make_track_filter_model(labels_info);
            collection_model = make_collection_model(labels_info, track_filter_model);
            collection_model.importTracks(window.job_tracks);
            player_model = make_player_model();
            aam_model = make_aam_model(labels_info, collection_model, player_model);
            collection_model.subscribe(aam_model);
            collection_model.onchangeframe(3);
        }
    });

    QUnit.test('enableAAMModel', function(assert) {
        assert.expect(0);
        aam_model.enableAAM();
    });

    QUnit.test('disableAAMModel', function(assert) {
        assert.expect(0);
        aam_model.disableAAM();
    });

    QUnit.test('move_beetween_the_tracks', function(assert) {
        assert.expect(0);
        aam_model.enableAAM();
        aam_model.nextTrack(-1);     // move to track without attributes
        aam_model.nextTrack(1);
        aam_model.helps;
        aam_model.disableAAM();
    });
});

function make_labels_info() {
    return new LabelsInfo(window.job);
}


function make_annotation_parser(labels_info) {
    return new AnnotationParser(labels_info, window.job);
}


function make_player_model() {
    let fake_player_geometry = {
        width: 800,
        height: 600,
        left: 10,
        top: 10
    };

    return new PlayerModel(window.job, fake_player_geometry);
}


function make_track_filter_model(labels_info) {
    return new TrackFilterModel(labels_info);
}


function make_collection_model(labels_info, track_filter_model) {
    return new CollectionModel(labels_info, window.job, track_filter_model);
}


function make_merger_model(collection_model) {
    return new MergerModel(collection_model);
}


function make_aam_model(labels_info, collection_model, player_model) {
    return new AAMModel(labels_info,
        (id) => collection_model.setactivetrack(id),
        () => collection_model.resetactivetrack(),
        (xtl, xbr, ytl, ybr) => player_model.focus(xtl, xbr, ytl, ybr));
}

// stub data
window.job = {
    "status": "Annotate",
    "overlap": 0,
    "blowradius": 0,
    "jobid": 1,
    "mode": "annotation",
    "taskid": 1,
    "labels": {
        "1": "car",
        "2": "bicycle",
        "3": "person",
        "4": "motorcycle",
        "5": "road"
    },
    "slug": "QUnitTask",
    "stop": 190,
    "start": 0,
    "attributes":
    {
        "1": {
            "1": "@select=model:__undefined__,bmw,mazda,suzuki,kia",
            "2": "@select=driver:__undefined__,man,woman",
            "3": "~checkbox=parked:true"
        },
        "2": {
            "4": "@radio=driver:man,woman",
            "5": "~checkbox=sport:false"
        },
        "3": {
            "6": "~text=clother:non-initialized",
            "7": "@number=age:1,100,1"
        },
        "4": {
            "8": "@text=model:non_initialized"
        },
        "5": {}
    }
};

window.job_tracks = {"boxes":[{"label_id":1,"xtl":818.46,"ytl":558,"xbr":924.07,"ybr":640.97,"occluded":0,"frame":0,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":299.22,"ytl":530.34,"xbr":438.78,"ybr":605.77,"occluded":0,"frame":0,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":0,"ytl":535.37,"xbr":104.98,"ybr":610.8,"occluded":0,"frame":0,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":1135.91,"ytl":565.54,"xbr":1207.57,"ybr":620.86,"occluded":0,"frame":0,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":988.82,"ytl":552.97,"xbr":1030.3,"ybr":595.71,"occluded":0,"frame":0,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":3,"xtl":1664.58,"ytl":550.45,"xbr":1737.5,"ybr":842.13,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1574.06,"ytl":565.54,"xbr":1631.89,"ybr":779.27,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1499.88,"ytl":555.48,"xbr":1548.91,"ybr":762.93,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1448.34,"ytl":558,"xbr":1491.08,"ybr":727.72,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1413.13,"ytl":549.2,"xbr":1445.82,"ybr":712.64,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1350.27,"ytl":549.2,"xbr":1381.7,"ybr":682.46,"occluded":0,"frame":0,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1576.57,"ytl":552.97,"xbr":1659.55,"ybr":901.22,"occluded":0,"frame":1,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1802.88,"ytl":585.66,"xbr":1909.74,"ybr":972.88,"occluded":0,"frame":1,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1354.04,"ytl":561.77,"xbr":1411.88,"ybr":771.73,"occluded":0,"frame":1,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":2,"xtl":985.67,"ytl":565.54,"xbr":1063.62,"ybr":634.69,"occluded":0,"frame":1,"attributes":[{"id":"4","value":"man"},{"id":"5","value":false}]},{"label_id":2,"xtl":614.79,"ytl":548.57,"xbr":704.05,"ybr":617.72,"occluded":0,"frame":1,"attributes":[{"id":"4","value":"man"},{"id":"5","value":false}]},{"label_id":2,"xtl":809.03,"ytl":549.82,"xbr":863.09,"ybr":598.86,"occluded":0,"frame":1,"attributes":[{"id":"4","value":"man"},{"id":"5","value":false}]},{"label_id":2,"xtl":1037.22,"ytl":794.36,"xbr":1198.15,"ybr":1025.69,"occluded":0,"frame":2,"attributes":[{"id":"4","value":"man"},{"id":"5","value":false}]},{"label_id":3,"xtl":1037.22,"ytl":646,"xbr":1186.83,"ybr":853.45,"occluded":0,"frame":2,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1284.89,"ytl":571.83,"xbr":1340.21,"ybr":770.47,"occluded":0,"frame":2,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":3,"xtl":1020.88,"ytl":602,"xbr":1054.82,"ybr":697.55,"occluded":0,"frame":2,"attributes":[{"id":"6","value":"non-initialized"},{"id":"7","value":"1"}]},{"label_id":1,"xtl":727.94,"ytl":589.43,"xbr":802.12,"ybr":651.03,"occluded":0,"frame":2,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":613.53,"ytl":586.91,"xbr":696.51,"ybr":647.26,"occluded":0,"frame":2,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":335.68,"ytl":579.37,"xbr":423.69,"ybr":632.17,"occluded":0,"frame":2,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":199.9,"ytl":565.54,"xbr":296.71,"ybr":627.14,"occluded":0,"frame":2,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":299.22,"ytl":576.86,"xbr":350.77,"ybr":628.4,"occluded":0,"frame":2,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":1052.31,"ytl":493.88,"xbr":1160.43,"ybr":586.91,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":936.64,"ytl":422.22,"xbr":1035.96,"ybr":550.45,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":1171.74,"ytl":446.1,"xbr":1217,"ybr":506.45,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":305.51,"ytl":498.91,"xbr":422.43,"ybr":559.25,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":424.95,"ytl":492.62,"xbr":510.44,"ybr":545.42,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":1,"xtl":0,"ytl":503.94,"xbr":218.76,"ybr":593.2,"occluded":0,"frame":3,"attributes":[{"id":"1","value":"__undefined__"},{"id":"2","value":"__undefined__"},{"id":"3","value":true}]},{"label_id":2,"xtl":255.22,"ytl":486.33,"xbr":316.82,"ybr":593.2,"occluded":0,"frame":3,"attributes":[{"id":"4","value":"man"},{"id":"5","value":false}]},{"label_id":4,"xtl":1213.23,"ytl":472.5,"xbr":1243.41,"ybr":544.17,"occluded":0,"frame":3,"attributes":[{"id":"8","value":"non_initialized"}]},{"label_id":4,"xtl":1165.46,"ytl":480.05,"xbr":1186.83,"ybr":519.02,"occluded":0,"frame":3,"attributes":[{"id":"8","value":"non_initialized"}]},{"label_id":5,"xtl":5.03,"ytl":617.09,"xbr":1916.03,"ybr":1078.49,"occluded":0,"frame":3,"attributes":[]}],"tracks":[]};
