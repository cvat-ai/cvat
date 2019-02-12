import tempfile
import shutil
import os
from unittest import TestCase, mock
from utils.voc.converter import process_cvat_xml

XML_ANNOTATION_EXAMPLE = """<?xml version="1.0" encoding="utf-8"?>
<annotations>
  <version>1.0</version>
  <meta>
    <task>
      <id>1063</id>
      <name>My annotation task</name>
      <size>75</size>
      <mode>annotation</mode>
      <overlap>0</overlap>
      <bugtracker></bugtracker>
      <created>2018-06-06 11:57:54.807162+03:00</created>
      <updated>2018-06-06 12:42:29.375251+03:00</updated>
      <labels>
        <label>
          <name>car</name>
          <attributes>
            <attribute>@select=model:a,b,c,d</attribute>
          </attributes>
        </label>
      </labels>
      <segments>
        <segment>
          <id>3086</id>
          <start>0</start>
          <stop>74</stop>
          <url>http://cvat.examle.com:8080/?id=3086</url>
        </segment>
      </segments>
      <owner>
        <username>admin</username>
        <email></email>
      </owner>
    </task>
    <dumped>2018-06-06 15:47:04.386866+03:00</dumped>
  </meta>
  <image id="0" name="C15_L1_0001.jpg" width="600" height="400">
    <box label="car" xtl="38.95" ytl="26.51" xbr="140.64" ybr="54.29" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">a</attribute>
    </box>
  </image>
  <image id="1" name="C15_L1_0002.jpg" width="600" height="400">
    <box label="car" xtl="49.13" ytl="23.34" xbr="149.54" ybr="53.88" occluded="0">
      <attribute name="parked">true</attribute>
      <attribute name="model">a</attribute>
    </box>
  </image>
  <image id="2" name="C15_L1_0003.jpg" width="600" height="400">
    <box label="car" xtl="50.73" ytl="30.26" xbr="146.72" ybr="59.97" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">b</attribute>
    </box>
  </image>
  <image id="39" name="C15_L1_0040.jpg" width="600" height="400">
    <box label="car" xtl="49.60" ytl="30.15" xbr="150.19" ybr="58.06" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">c</attribute>
    </box>
    <point label="car" x="30.1" y="170.4" occluded="0">
      <attribute name="parked">true</attribute>
      <attribute name="model">a</attribute>
    </point>
  </image>
</annotations>
"""
XML_INTERPOLATION_EXAMPLE = """<?xml version="1.0" encoding="utf-8"?>
<annotations>
  <version>1.0</version>
  <meta>
    <task>
      <id>1062</id>
      <name>My interpolation task</name>
      <size>30084</size>
      <mode>interpolation</mode>
      <overlap>20</overlap>
      <bugtracker></bugtracker>
      <created>2018-05-31 14:13:36.483219+03:00</created>
      <updated>2018-06-06 13:56:32.113705+03:00</updated>
      <labels>
        <label>
          <name>car</name>
          <attributes>
            <attribute>@select=model:1,2,3,4</attribute>
          </attributes>
        </label>
      </labels>
      <segments>
        <segment>
          <id>3085</id>
          <start>0</start>
          <stop>30083</stop>
          <url>http://cvat.example.com:8080/?id=3085</url>
        </segment>
      </segments>
      <owner>
        <username>admin</username>
        <email></email>
      </owner>
      <original_size>
         <width>1024</width>
         <height>768</height>
      </original_size>
    </task>
    <dumped>2018-06-06 15:52:11.138470+03:00</dumped>
  </meta>
  <track id="0" label="car">
    <box frame="110" xtl="634.12" ytl="37.68" xbr="661.50" ybr="71.37" outside="0" occluded="1" keyframe="1">
      <attribute name="model">1</attribute>
    </box>
    <box frame="111" xtl="634.21" ytl="38.50" xbr="661.59" ybr="72.19" outside="0" occluded="1" keyframe="0">
      <attribute name="model">1</attribute>
    </box>
    <box frame="112" xtl="634.30" ytl="39.32" xbr="661.67" ybr="73.01" outside="1" occluded="1" keyframe="1">
      <attribute name="model">1</attribute>
    </box>
  </track>
  <track id="1" label="car">
    <box frame="0" xtl="626.81" ytl="30.96" xbr="656.05" ybr="58.88" outside="0" occluded="0" keyframe="1">
      <attribute name="model">3</attribute>
    </box>
    <box frame="1" xtl="626.63" ytl="31.56" xbr="655.87" ybr="59.48" outside="0" occluded="0" keyframe="0">
      <attribute name="model">3</attribute>
    </box>
    <box frame="2" xtl="626.09" ytl="33.38" xbr="655.33" ybr="61.29" outside="1" occluded="0" keyframe="1">
      <attribute name="model">3</attribute>
    </box>
  </track>
</annotations>
"""


class TestProcessCvatXml(TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    @mock.patch('utils.voc.converter.log')
    def test_parse_annotation_xml(self, mock_log):
        xml_filename = os.path.join(self.test_dir, 'annotations.xml')
        with open(xml_filename, mode='x') as file:
            file.write(XML_ANNOTATION_EXAMPLE)

        voc_dir = os.path.join(self.test_dir, 'voc_dir')

        images = ['C15_L1_0001', 'C15_L1_0002', 'C15_L1_0003', 'C15_L1_0040']
        expected_xmls = [os.path.join(voc_dir, x + '.xml')
                         for x in images]
        process_cvat_xml(xml_filename, 'img_dir', voc_dir)
        for exp in expected_xmls:
            self.assertTrue(os.path.exists(exp))
            # We should add in some code to parse the resulting xml files

    @mock.patch('utils.voc.converter.log')
    def test_parse_interpolation_xml(self, mock_log):
        xml_filename = os.path.join(self.test_dir, 'interpolations.xml')
        with open(xml_filename, mode='x') as file:
            file.write(XML_INTERPOLATION_EXAMPLE)

        voc_dir = os.path.join(self.test_dir, 'voc_dir')


        frames = [0, 1, 2, 110, 111, 112 ]
        expected_xmls = [os.path.join(voc_dir, 'interpolations_%08d.xml' % x )
                         for x in frames]

        process_cvat_xml(xml_filename, 'img_dir', voc_dir)

        self.assertTrue(os.path.exists(voc_dir))
        self.assertTrue(len(os.listdir(voc_dir)) == len(frames))
        for exp in expected_xmls:
            self.assertTrue(os.path.exists(exp))
            # We should add in some code to parse the resulting xml files



