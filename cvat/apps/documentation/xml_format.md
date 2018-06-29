# XML annotation format

When you want to download annotations from Computer Vision Annotation Tool (CVAT) you can choose one of several data formats. The document describes XML annotation format. Each format has X.Y version (e.g. 1.0). In general the major version (X) is incremented then the data format has incompatible changes and the minor version (Y) is incremented then the data format is slightly modified (e.g. it has one or several extra fields inside meta information). The document will describe all changes for all versions of XML annotation format.

## Version 1

There are two different formats for annotation and interpolation modes at the moment. Both formats has a common part which is described below:

```xml
<?xml version="1.0" encoding="utf-8"?>
<annotations>
  <version>String: version of the format (e.g 1.0)</version>
  <meta>
    <task>
      <id>Number: id of the task</id>
      <name>String: some task name</name>
      <size>Number: count of frames/images in the task</size>
      <mode>String: interpolation or annotation</mode>
      <overlap>Number: number of overlaped frames between segments</overlap>
      <bugtracker>String: URL on an page which describe the task</bugtracker>
      <created>String: date when the task was created</created>
      <updated>String: date when the task was updated</updated>
      <labels>
        <label>
          <name>String: name of the label (e.g. car, person)</name>
          <attributes>
            <attribute>String: attributes for the label (e.g. @select=quality:good,bad)</attribute>
          </attributes>
        </label>
      </labels>
      <segments>
        <segment>
          <id>Number: id of the segment</id>
          <start>Number: first frame</start>
          <stop>Number: last frame</stop>
          <url>String: URL (e.g. http://cvat.example.com/?id=213)</url>
        </segment>
      </segments>
      <owner>
        <username>String: the author of the task</username>
        <email>String: email of the author</email>
      </owner>
    </task>
    <dumped>String: date when the annotation was dumped</dumped>
  </meta>
  ...
</annotations>
```

### Annotation
Below you can find description of the data format for annotation mode. In the mode images are annotated. On each image it is possible to have many different objects. Each object can have multiple attributes.
```xml
<?xml version="1.0" encoding="utf-8"?>
<annotations>
  ...
  <image id="Number: id of the image (the index in lexical order of images)" name="String: path to the image">
    <box label="String: the associated label" xtl="Number: float" ytl="Number: float" xbr="Number: float" ybr="Number: float" occluded="Number: 0 - False, 1 - True">
      <attribute name="String: an attribute name">String: the attribute value</attribute>
      ...
    </box>
    ...
  </image>
  ...
</annotations>
```

Example:
```xml
<?xml version="1.0" encoding="utf-8"?>
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
  <image id="0" name="C15_L1_0001.jpg">
    <box label="car" xtl="38.95" ytl="26.51" xbr="140.64" ybr="54.29" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">a</attribute>
    </box>
  </image>
  <image id="1" name="C15_L1_0002.jpg">
    <box label="car" xtl="49.13" ytl="23.34" xbr="149.54" ybr="53.88" occluded="0">
      <attribute name="parked">true</attribute>
      <attribute name="model">a</attribute>
    </box>
  </image>
  <image id="2" name="C15_L1_0003.jpg">
    <box label="car" xtl="50.73" ytl="30.26" xbr="146.72" ybr="59.97" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">b</attribute>
    </box>
  </image>
  <image id="39" name="C15_L1_0040.jpg">
    <box label="car" xtl="49.60" ytl="30.15" xbr="150.19" ybr="58.06" occluded="0">
      <attribute name="parked">false</attribute>
      <attribute name="model">c</attribute>
    </box>
  </image>
</annotations>
```

### Interpolation
Below you can find description of the data format for interpolation mode. In the mode frames are annotated. The annotation contains tracks. Each track corresponds to an object which can be presented on multiple frames. The same object cannot be presented on the same frame in multiple locations. Each location of the object can have multiple attributes even if an attribute is immutable for the object it will be cloned for each location (a known redundancy).
```xml
<?xml version="1.0" encoding="utf-8"?>
<annotations>
  ...
  <track id="Number: id of the track (doesn't have any special meeting" label="String: the associated label">
    <box frame="Number: frame" xtl="Number: float" ytl="Number: float" xbr="Number: float" ybr="Number: float" outside="Number: 0 - False, 1 - True" occluded="Number: 0 - False, 1 - True" keyframe="Number: 0 - False, 1 - True">
      <attribute name="String: an attribute name">String: the attribute value</attribute>
      ...
    </box>
    ...
  </track>
  ...
</annotations>
```

Example:
```xml
<?xml version="1.0" encoding="utf-8"?>
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
```