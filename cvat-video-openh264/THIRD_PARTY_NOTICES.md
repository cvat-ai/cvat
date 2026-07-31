# Third-party notices

The `cvat-video-openh264` source tree and the artifacts built by this development-stage package do
not contain third-party source code or native codec binaries.

| Component | Relationship | License | Included in artifacts |
| --- | --- | --- | --- |
| Pillow | Runtime Python dependency | HPND | No |
| Cisco OpenH264 | Separately supplied runtime library | BSD-2-Clause source license and Cisco binary license, as applicable | No |

The package metadata declares Pillow as a dependency. Package managers obtain it as a separate
distribution. OpenH264 is not a package dependency and is never downloaded by package
installation or import.

Future changes that vendor reviewed OpenH264 public headers must retain Cisco's copyright and
BSD-2-Clause license in a marked third-party directory and update this inventory before release.
