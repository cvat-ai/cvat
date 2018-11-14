/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

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
        assert.equal(labels_info.labelIdOf('person'), 1, 'Id of "car" must be 1');
        assert.equal(labels_info.labelIdOf('face'), 2, 'Id of "bicycle" must be 2');
        assert.equal(labels_info.labelIdOf('car'), 3, 'Id of "person" must be 3');
        assert.equal(labels_info.labelIdOf('bicycle'), 4, 'Id of "motorcycle" must be 4');
        assert.equal(labels_info.labelIdOf('motorcycle'), 5, 'Id of "unknown" must be 5');
        assert.equal(labels_info.labelIdOf('road'), 6, 'Id of "unknown" must be 6');
        assert.equal(labels_info.labelIdOf('unknown'), null, 'Id of "unknown" must be null');
    });


    QUnit.test('attrIdOf', function(assert) {
        assert.equal(labels_info.attrIdOf('2','beard'), 8, 'Attribute id must be equal 8');
        assert.equal(labels_info.attrIdOf('3','parked'), 12, 'Attribute id must be equal 12');
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
        assert.deepEqual(labels_info.strToValues('number', 1), ['1']);
    });


    QUnit.test('labels', function(assert) {
        let expected = {
            1:"person",
            2:"face",
            3:"car",
            4:"bicycle",
            5:"motorcycle",
            6:"road"
        };
        assert.deepEqual(labels_info.labels(), expected, 'Return value must be like expected');
    });


    QUnit.test('attributes', function(assert) {
        let expected = {
            1:"action",
            2:"age",
            3:"gender",
            4:"false_positive",
            5:"clother",
            6:"age",
            7:"glass",
            8:"beard",
            9:"race",
            10:"model",
            11:"driver",
            12:"parked",
            13:"driver",
            14:"sport",
            15:"model"
        };
        assert.deepEqual(labels_info.attributes(), expected, 'Return value must be like expected');
    });


    QUnit.test('labelAttributes', function(assert) {
        let expected_1 = {
            1:"action",
            2:"age",
            3:"gender",
            4:"false_positive",
            5:"clother"
        };

        let expected_2 = {
            6:"age",
            7:"glass",
            8:"beard",
            9:"race"
        };

        let expected_3 = {
            10:"model",
            11:"driver",
            12:"parked"
        };

        let expected_4 = {
            13:"driver",
            14:"sport"
        };

        assert.deepEqual(labels_info.labelAttributes(1), labels_info.labelAttributes("1"), 'Return values must be equal');
        assert.deepEqual(labels_info.labelAttributes(1), expected_1, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes("2"), expected_2, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(3), expected_3, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(4), expected_4, 'Return value must be like expected');
        assert.deepEqual(labels_info.labelAttributes(45), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes(), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes(null), {}, 'Return value must be empty object');
        assert.deepEqual(labels_info.labelAttributes("road"), {}, 'Return value must be empty object');
    });


    QUnit.test('attrInfo', function(assert) {
        let expected_1 = {
            name:"action",
            type:"select",
            mutable:true,
            values: [
                "__undefined__",
                "sitting",
                "raising_hand",
                "standing"
            ]
        };

        let expected_5 = {
            name:"clother",
            type:"text",
            mutable:true,
            values: [
                "non-initialized"
            ]
        };

        let expected_13 = {
            name:"driver",
            type:"radio",
            mutable:false,
            values: [
                "man",
                "woman"
            ]
        };

        assert.deepEqual(labels_info.attrInfo(4), labels_info.attrInfo("4"), 'Return values must be equal');
        assert.deepEqual(labels_info.attrInfo(1), expected_1, 'Return value must be like expected');
        assert.deepEqual(labels_info.attrInfo(5), expected_5, 'Return value must be like expected');
        assert.deepEqual(labels_info.attrInfo(13), expected_13, 'Return value must be like expected');
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

    let correct_xml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
    <version>1.0</version>
        <image id="0" name="1*FJ8Ws7JJ3fz5gpXfQeN73A.jpg">
            <box label="face" xtl="1045.98" ytl="403.64" xbr="1127.48" ybr="498.08" occluded="0" z_order="8">
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="glass">no</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
            <box label="face" xtl="766.53" ytl="426.93" xbr="858.39" ybr="534.31" occluded="0" z_order="9">
                <attribute name="age">__undefined__</attribute>
                <attribute name="glass">no</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
            <polygon label="person" points="1014.31,1043.74;1024.71,1053.62;1041.87,1061.93;1052.78,1067.13;1060.58,1069.21;1076.18,1070.25;1079.30,1068.69;1077.74,1057.26;1077.22,1048.94;1076.70,1041.14;1078.26,1031.26;1081.90,1016.70;1091.78,995.91;1101.14,975.11;1108.42,950.67;1118.81,967.31;1130.77,992.27;1132.33,1004.22;1127.13,1009.94;1120.89,1017.74;1115.69,1025.54;1104.26,1030.74;1096.46,1039.58;1096.46,1046.34;1104.26,1047.38;1125.05,1048.94;1141.69,1045.82;1144.29,1040.10;1158.85,1036.46;1171.33,1030.22;1172.89,1026.58;1167.69,1012.02;1157.81,993.31;1152.09,986.03;1152.09,977.19;1148.45,967.31;1142.21,944.95;1138.05,930.92;1138.05,922.08;1134.41,911.68;1128.17,897.64;1122.45,883.60;1120.37,856.57;1137.01,812.37;1256.07,783.78;1245.67,737.51;1240.99,701.11;1230.60,654.84;1216.56,609.09;1204.60,610.64;1198.36,608.57;1197.32,603.89;1192.10,598.90;1187.44,597.65;1185.36,581.53;1182.76,571.65;1177.56,553.45;1167.17,535.78;1164.57,525.38;1157.29,519.66;1145.33,513.42;1145.33,509.26;1139.09,505.62;1144.29,475.99;1139.09,449.99;1126.09,437.51;1124.53,436.99;1121.93,422.43;1113.61,414.12;1099.58,410.48;1079.82,410.48;1065.78,416.20;1055.38,419.83;1054.34,433.87;1052.78,445.83;1053.30,453.63;1051.74,462.99;1053.82,472.87;1056.94,484.82;1059.02,495.22;1062.66,498.86;1054.86,508.74;1041.87,514.98;1033.55,519.14;1028.35,529.02;1022.63,550.33;1020.55,563.85;1014.83,585.17;1009.63,602.33;1005.99,618.44;1006.51,630.40;1015.35,641.32;1019.51,643.92;1020.55,659.52;1018.99,677.71;1014.31,694.35;1012.75,706.31;1012.75,719.31;1010.15,728.67;1012.23,737.51;1012.23,752.06;1010.15,769.74;1007.03,794.18;1007.55,809.25;1021.59,810.29;1023.67,785.34;1025.75,760.90;1034.59,759.86;1041.87,758.82;1046.55,781.70;1053.82,800.94;1062.14,820.69;1067.34,839.41;1073.06,853.45;1071.50,873.20;1073.06,884.12;1075.14,891.92;1074.10,921.04;1069.94,945.99;1066.82,968.87;1063.18,996.42;1060.06,1012.54;1055.38,1017.22;1046.55,1016.70;1039.79,1016.18;1036.67,1019.30;1038.75,1025.02;1032.51,1026.58;1024.19,1025.02;1014.83,1029.18" occluded="0" z_order="6">
                <attribute name="age">25</attribute>
                <attribute name="gender">female</attribute>
                <attribute name="false_positive">false</attribute>
                <attribute name="action">standing</attribute>
                <attribute name="clother">non-initialized</attribute>
            </polygon>
            <polygon label="person" points="860.26,1048.76;871.05,1049.52;885.84,1047.76;896.87,1043.75;901.38,1034.47;904.39,1023.19;908.15,1013.91;906.90,1008.40;904.14,1006.64;901.63,991.35;897.62,990.34;897.12,985.58;893.61,983.82;892.61,976.55;899.38,969.78;902.14,964.02;900.13,957.50;898.63,951.48;898.12,940.70;896.37,930.17;893.86,924.40;892.11,909.11;888.09,894.56;881.58,879.77;874.56,870.24;871.05,861.47;871.30,854.20;871.30,835.89;873.05,817.34;876.31,801.29;880.32,786.75;889.60,786.75;905.40,783.99;922.45,782.24;930.47,780.48;934.23,778.22;939.50,776.47;944.01,771.45;944.76,764.18;942.25,750.14;937.49,734.09;932.47,714.54;927.96,705.76;924.20,682.69;914.42,641.07;909.66,623.27;905.65,608.48;903.39,598.45;900.13,599.20;924.20,707.02;914.67,710.02;895.87,711.28;889.10,711.28;884.33,708.52;877.06,706.26;876.06,701.25;878.57,701.25;879.82,700.25;880.82,698.74;885.59,698.24;890.35,698.24;890.10,695.73;889.35,692.72;888.85,688.71;882.58,690.47;877.06,690.47;874.81,685.45;875.81,681.44;876.31,675.92;874.56,671.16;873.55,668.65;873.30,663.14;874.30,655.87;876.31,651.60;877.56,644.83;878.07,639.32;882.83,633.30;885.34,623.27;891.35,611.99;892.86,603.46;894.36,595.94;895.87,591.93;897.87,593.68;897.87,595.94;898.88,598.45;900.63,598.95;903.64,598.95;901.63,588.17;898.12,575.38;897.12,571.37;897.62,553.57;894.61,548.80;890.35,544.79;889.35,538.02;884.84,536.52;880.57,537.27;878.57,537.52;877.06,535.77;872.80,535.01;870.29,535.01;868.04,533.76;869.54,526.74;867.28,516.96;866.03,510.19;861.52,505.18;857.76,501.42;854.00,492.14;852.49,482.36;851.99,475.34;848.23,458.79;841.71,440.24;831.43,432.46;821.40,428.20;808.86,426.45;797.33,427.95;787.55,431.46;778.02,438.23;771.00,446.76;772.76,457.79;775.27,471.08;778.02,476.34;779.03,482.61;778.27,488.88;778.02,493.89;781.03,499.91;784.04,506.18;789.81,515.71;793.07,519.97;795.83,524.73;796.08,527.74;790.56,531.25;784.54,534.76;774.01,536.02;765.74,537.52;757.96,542.28;754.71,548.80;749.44,559.59;745.93,569.87;741.42,585.16;737.40,599.95;733.39,610.48;729.63,619.51;725.62,629.54;723.61,637.81;724.62,646.59;725.12,656.87;725.87,663.89;727.38,669.16;731.14,672.16;735.65,673.92;745.93,675.17;755.71,678.18;751.45,689.21;747.18,701.00;745.68,714.04;754.71,718.80;751.45,725.32;748.44,735.85;745.68,745.38;742.42,755.41;740.16,769.45;739.41,784.49;737.66,800.79;738.16,842.41;737.25,863.17;736.35,880.92;733.64,896.57;731.54,910.11;731.84,924.25;729.73,935.68;727.63,950.13;726.42,966.98;724.32,982.62;721.61,1004.59;718.30,1013.61;708.37,1022.04;702.05,1026.55;691.22,1025.95;680.69,1024.44;673.77,1028.96;673.47,1041.89;682.49,1051.82;698.14,1057.24;709.87,1063.56;721.91,1068.07;732.14,1071.38;738.76,1071.98;743.57,1067.77;743.57,1056.64;745.08,1046.11;747.78,1036.18;746.28,1031.06;745.98,1019.93;749.89,1006.69;751.70,1000.67;756.21,999.77;764.03,995.86;764.33,983.52;768.24,973.29;770.35,955.84;773.66,938.99;777.27,921.84;779.98,904.99;781.18,895.07;789.31,860.77;791.11,845.42;798.33,831.88;807.66,815.63;810.97,805.10;815.18,823.16;821.50,840.00;825.41,861.07;830.23,877.31;832.93,893.26;840.76,907.40;850.38,919.14;853.09,929.06;857.00,944.11;859.11,957.35;861.52,965.77;865.43,977.51;869.04,982.92;868.74,991.35;868.14,999.77;868.14,1008.20;868.14,1013.91;865.43,1022.64;862.12,1029.26;858.21,1037.08;857.61,1043.10" occluded="0" z_order="7">
                <attribute name="age">25</attribute>
                <attribute name="gender">female</attribute>
                <attribute name="false_positive">false</attribute>
                <attribute name="action">standing</attribute>
                <attribute name="clother">non-initialized</attribute>
            </polygon>
            <polyline label="road" points="1917.90,1060.20;1813.70,1033.40;1696.00,1007.70;1570.48,980.03;1428.17,952.86;1316.91,932.16;1217.29,916.64;1134.50,903.70;1063.34,890.77;976.66,880.42;889.98,870.07;816.24,862.30;724.38,854.54;649.35,845.49;541.97,836.04;437.05,826.73;329.15,819.87;246.87,816.64;139.23,811.46;34.18,806.93" occluded="1" z_order="5">
            </polyline>
            <points label="road" points="1334.48,1137.18;511.50,1134.40;515.55,706.37;1334.48,707.67" occluded="0" z_order="10">
            </points>
        </image>
    </annotations>`;

    let incorrect_xml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
    <version>1.0</version>
        <image id="0" name="1*FJ8Ws7JJ3fz5gpXfQeN73A.jpg">
            <box label="face" xtl="1045.98" ytl="403.64" xbr="1127.48" ybr="498.08" occluded="0" z_order="8">
            <attribute name="age">adult (20-
        </image>
    </annotations>`;

    let unknown_label =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
    <version>1.0</version>
        <image id="0" name="1*FJ8Ws7JJ3fz5gpXfQeN73A.jpg">
            <box label="unknown" xtl="1045.98" ytl="403.64" xbr="1127.48" ybr="498.08" occluded="0" z_order="8">
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="glass">no</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
            <polyline label="road" points="1917.90,1060.20;1813.70,1033.40;1696.00,1007.70;1570.48,980.03;1428.17,952.86;1316.91,932.16;1217.29,916.64;1134.50,903.70;1063.34,890.77;976.66,880.42;889.98,870.07;816.24,862.30;724.38,854.54;649.35,845.49;541.97,836.04;437.05,826.73;329.15,819.87;246.87,816.64;139.23,811.46;34.18,806.93" occluded="1" z_order="5">
            </polyline>
            <points label="road" points="1334.48,1137.18;511.50,1134.40;515.55,706.37;1334.48,707.67" occluded="0" z_order="10">
            </points>
        </image>
    </annotations>`;

    let unknown_attribute =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
    <version>1.0</version>
        <image id="0" name="1*FJ8Ws7JJ3fz5gpXfQeN73A.jpg">
            <box label="face" xtl="1045.98" ytl="403.64" xbr="1127.48" ybr="498.08" occluded="0" z_order="8">
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="unknown">no</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
        </image>
    </annotations>`;

    let bad_attr_values =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations>
    <version>1.0</version>
        <image id="0" name="1*FJ8Ws7JJ3fz5gpXfQeN73A.jpg">
            <box label="face" xtl="1045.98" ytl="403.64" xbr="1127.48" ybr="498.08" occluded="0" z_order="8">
                <attribute name="age">adult (20-45)</attribute>
                <attribute name="glass">some bad value</attribute>
                <attribute name="beard">no</attribute>
                <attribute name="race">asian</attribute>
            </box>
        </image>
    </annotations>`;

    let empty_xml =
    `<?xml version="1.0" encoding="utf-8"?>
    <annotations> </annotations>`;

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
       // assert.deepEqual(annotation_parser.parse(correct_xml), window.job_data, 'Return value must be like expected.');
        assert.deepEqual(annotation_parser.parse(empty_xml), empty, 'Return value must be like expected.');
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

function make_labels_info() {
    return new LabelsInfo(window.job);
}

function make_annotation_parser() {
    return new AnnotationParser(window.job, make_labels_info());
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

// stub data
window.job = {
    "jobid":1,
    "labels":{
        "1":"person",
        "2":"face",
        "3":"car",
        "4":"bicycle",
        "5":"motorcycle",
        "6":"road"
    },
    "taskid":1,
    "stop":12,
    "z_order":true,
    "overlap":0,
    "slug":"QUnitTests",
    "status":"Annotate",
    "attributes":{
        "1":{
            "1":"~select=action:__undefined__,sitting,raising_hand,standing",
            "2":"@number=age:1,100,1",
            "3":"@select=gender:male,female",
            "4":"@checkbox=false_positive:false",
            "5":"~text=clother:non-initialized"
        },
        "2":{
            "8":"@select=beard:__undefined__,skip,no,yes",
            "9":"@select=race:__undefined__,skip,asian,black,caucasian,other",
            "6":"@select=age:__undefined__,skip,baby (0-5),child (6-12),adolescent (13-19),adult (20-45),middle-age (46-64),old (65-)",
            "7":"@select=glass:__undefined__,skip,no,sunglass,transparent,other"
        },
        "3":{
            "10":"@select=model:__undefined__,bmw,mazda,suzuki,kia",
            "11":"@select=driver:__undefined__,man,woman",
            "12":"~checkbox=parked:true"
        },
        "4":{
            "13":"@radio=driver:man,woman",
            "14":"~checkbox=sport:false"
        },
        "5":{
            "15":"@text=model:unknown"
        },
        "6":{

        }
    },
    "flipped": false,
    "image_meta_data": {
        "original_size": [{
            "width": 3240,
            "height": 2000
        }]
    },
    "mode":"annotation",
    "start":0
};

window.job_data = {
    "boxes": [{
        "label_id": 2,
        "frame": 0,
        "group_id": 0,
        "occluded": 0,
        "xtl": 1045.98,
        "ytl": 403.64,
        "xbr": 1127.48,
        "ybr": 498.08,
        "z_order": 8,
        "attributes": [{
            "id": "6",
            "value": "adult (20-45)"
        }, {
            "id": "7",
            "value": "no"
        }, {
            "id": "8",
            "value": "no"
        }, {
            "id": "9",
            "value": "asian"
        }]
    }, {
        "label_id": 2,
        "frame": 0,
        "group_id": 0,
        "occluded": 0,
        "xtl": 766.53,
        "ytl": 426.93,
        "xbr": 858.39,
        "ybr": 534.31,
        "z_order": 9,
        "attributes": [{
            "id": "6",
            "value": "__undefined__"
        }, {
            "id": "7",
            "value": "no"
        }, {
            "id": "8",
            "value": "no"
        }, {
            "id": "9",
            "value": "asian"
        }]
    }],
    "polygons": [{
        "label_id": 1,
        "frame": 0,
        "group_id": 0,
        "points": "1014.31,1043.74 1024.71,1053.62 1041.87,1061.93 1052.78,1067.13 1060.58,1069.21 1076.18,1070.25 1079.3,1068.69 1077.74,1057.26 1077.22,1048.94 1076.7,1041.14 1078.26,1031.26 1081.9,1016.7 1091.78,995.91 1101.14,975.11 1108.42,950.67 1118.81,967.31 1130.77,992.27 1132.33,1004.22 1127.13,1009.94 1120.89,1017.74 1115.69,1025.54 1104.26,1030.74 1096.46,1039.58 1096.46,1046.34 1104.26,1047.38 1125.05,1048.94 1141.69,1045.82 1144.29,1040.1 1158.85,1036.46 1171.33,1030.22 1172.89,1026.58 1167.69,1012.02 1157.81,993.31 1152.09,986.03 1152.09,977.19 1148.45,967.31 1142.21,944.95 1138.05,930.92 1138.05,922.08 1134.41,911.68 1128.17,897.64 1122.45,883.6 1120.37,856.57 1137.01,812.37 1256.07,783.78 1245.67,737.51 1240.99,701.11 1230.6,654.84 1216.56,609.09 1204.6,610.64 1198.36,608.57 1197.32,603.89 1192.1,598.9 1187.44,597.65 1185.36,581.53 1182.76,571.65 1177.56,553.45 1167.17,535.78 1164.57,525.38 1157.29,519.66 1145.33,513.42 1145.33,509.26 1139.09,505.62 1144.29,475.99 1139.09,449.99 1126.09,437.51 1124.53,436.99 1121.93,422.43 1113.61,414.12 1099.58,410.48 1079.82,410.48 1065.78,416.2 1055.38,419.83 1054.34,433.87 1052.78,445.83 1053.3,453.63 1051.74,462.99 1053.82,472.87 1056.94,484.82 1059.02,495.22 1062.66,498.86 1054.86,508.74 1041.87,514.98 1033.55,519.14 1028.35,529.02 1022.63,550.33 1020.55,563.85 1014.83,585.17 1009.63,602.33 1005.99,618.44 1006.51,630.4 1015.35,641.32 1019.51,643.92 1020.55,659.52 1018.99,677.71 1014.31,694.35 1012.75,706.31 1012.75,719.31 1010.15,728.67 1012.23,737.51 1012.23,752.06 1010.15,769.74 1007.03,794.18 1007.55,809.25 1021.59,810.29 1023.67,785.34 1025.75,760.9 1034.59,759.86 1041.87,758.82 1046.55,781.7 1053.82,800.94 1062.14,820.69 1067.34,839.41 1073.06,853.45 1071.5,873.2 1073.06,884.12 1075.14,891.92 1074.1,921.04 1069.94,945.99 1066.82,968.87 1063.18,996.42 1060.06,1012.54 1055.38,1017.22 1046.55,1016.7 1039.79,1016.18 1036.67,1019.3 1038.75,1025.02 1032.51,1026.58 1024.19,1025.02 1014.83,1029.18",
        "occluded": 0,
        "z_order": 6,
        "attributes": [{
            "id": "1",
            "value": "standing"
        }, {
            "id": "2",
            "value": "25"
        }, {
            "id": "3",
            "value": "female"
        }, {
            "id": "4",
            "value": false
        }, {
            "id": "5",
            "value": "non-initialized"
        }]
    }, {
        "label_id": 1,
        "frame": 0,
        "group_id": 0,
        "points": "860.26,1048.76 871.05,1049.52 885.84,1047.76 896.87,1043.75 901.38,1034.47 904.39,1023.19 908.15,1013.91 906.9,1008.4 904.14,1006.64 901.63,991.35 897.62,990.34 897.12,985.58 893.61,983.82 892.61,976.55 899.38,969.78 902.14,964.02 900.13,957.5 898.63,951.48 898.12,940.7 896.37,930.17 893.86,924.4 892.11,909.11 888.09,894.56 881.58,879.77 874.56,870.24 871.05,861.47 871.3,854.2 871.3,835.89 873.05,817.34 876.31,801.29 880.32,786.75 889.6,786.75 905.4,783.99 922.45,782.24 930.47,780.48 934.23,778.22 939.5,776.47 944.01,771.45 944.76,764.18 942.25,750.14 937.49,734.09 932.47,714.54 927.96,705.76 924.2,682.69 914.42,641.07 909.66,623.27 905.65,608.48 903.39,598.45 900.13,599.2 924.2,707.02 914.67,710.02 895.87,711.28 889.1,711.28 884.33,708.52 877.06,706.26 876.06,701.25 878.57,701.25 879.82,700.25 880.82,698.74 885.59,698.24 890.35,698.24 890.1,695.73 889.35,692.72 888.85,688.71 882.58,690.47 877.06,690.47 874.81,685.45 875.81,681.44 876.31,675.92 874.56,671.16 873.55,668.65 873.3,663.14 874.3,655.87 876.31,651.6 877.56,644.83 878.07,639.32 882.83,633.3 885.34,623.27 891.35,611.99 892.86,603.46 894.36,595.94 895.87,591.93 897.87,593.68 897.87,595.94 898.88,598.45 900.63,598.95 903.64,598.95 901.63,588.17 898.12,575.38 897.12,571.37 897.62,553.57 894.61,548.8 890.35,544.79 889.35,538.02 884.84,536.52 880.57,537.27 878.57,537.52 877.06,535.77 872.8,535.01 870.29,535.01 868.04,533.76 869.54,526.74 867.28,516.96 866.03,510.19 861.52,505.18 857.76,501.42 854,492.14 852.49,482.36 851.99,475.34 848.23,458.79 841.71,440.24 831.43,432.46 821.4,428.2 808.86,426.45 797.33,427.95 787.55,431.46 778.02,438.23 771,446.76 772.76,457.79 775.27,471.08 778.02,476.34 779.03,482.61 778.27,488.88 778.02,493.89 781.03,499.91 784.04,506.18 789.81,515.71 793.07,519.97 795.83,524.73 796.08,527.74 790.56,531.25 784.54,534.76 774.01,536.02 765.74,537.52 757.96,542.28 754.71,548.8 749.44,559.59 745.93,569.87 741.42,585.16 737.4,599.95 733.39,610.48 729.63,619.51 725.62,629.54 723.61,637.81 724.62,646.59 725.12,656.87 725.87,663.89 727.38,669.16 731.14,672.16 735.65,673.92 745.93,675.17 755.71,678.18 751.45,689.21 747.18,701 745.68,714.04 754.71,718.8 751.45,725.32 748.44,735.85 745.68,745.38 742.42,755.41 740.16,769.45 739.41,784.49 737.66,800.79 738.16,842.41 737.25,863.17 736.35,880.92 733.64,896.57 731.54,910.11 731.84,924.25 729.73,935.68 727.63,950.13 726.42,966.98 724.32,982.62 721.61,1004.59 718.3,1013.61 708.37,1022.04 702.05,1026.55 691.22,1025.95 680.69,1024.44 673.77,1028.96 673.47,1041.89 682.49,1051.82 698.14,1057.24 709.87,1063.56 721.91,1068.07 732.14,1071.38 738.76,1071.98 743.57,1067.77 743.57,1056.64 745.08,1046.11 747.78,1036.18 746.28,1031.06 745.98,1019.93 749.89,1006.69 751.7,1000.67 756.21,999.77 764.03,995.86 764.33,983.52 768.24,973.29 770.35,955.84 773.66,938.99 777.27,921.84 779.98,904.99 781.18,895.07 789.31,860.77 791.11,845.42 798.33,831.88 807.66,815.63 810.97,805.1 815.18,823.16 821.5,840 825.41,861.07 830.23,877.31 832.93,893.26 840.76,907.4 850.38,919.14 853.09,929.06 857,944.11 859.11,957.35 861.52,965.77 865.43,977.51 869.04,982.92 868.74,991.35 868.14,999.77 868.14,1008.2 868.14,1013.91 865.43,1022.64 862.12,1029.26 858.21,1037.08 857.61,1043.1",
        "occluded": 0,
        "z_order": 7,
        "attributes": [{
            "id": "1",
            "value": "standing"
        }, {
            "id": "2",
            "value": "25"
        }, {
            "id": "3",
            "value": "female"
        }, {
            "id": "4",
            "value": false
        }, {
            "id": "5",
            "value": "non-initialized"
        }]
    }],
    "polylines": [{
        "label_id": 6,
        "frame": 0,
        "group_id": 0,
        "points": "1917.9,1060.2 1813.7,1033.4 1696,1007.7 1570.48,980.03 1428.17,952.86 1316.91,932.16 1217.29,916.64 1134.5,903.7 1063.34,890.77 976.66,880.42 889.98,870.07 816.24,862.3 724.38,854.54 649.35,845.49 541.97,836.04 437.05,826.73 329.15,819.87 246.87,816.64 139.23,811.46 34.18,806.93",
        "occluded": 1,
        "z_order": 5,
        "attributes": []
    }],
    "points": [{
        "label_id": 6,
        "frame": 0,
        "group_id": 0,
        "points": "1334.48,1137.18 511.5,1134.4 515.55,706.37 1334.48,707.67",
        "occluded": 0,
        "z_order": 10,
        "attributes": []
    }],
    "box_paths": [],
    "polygon_paths": [],
    "polyline_paths": [],
    "points_paths": []
};
