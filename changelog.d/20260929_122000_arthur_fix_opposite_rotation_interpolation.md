### Fixed

- Rotated boxes, ellipses and 3D cuboids in tracks were interpolated
  incorrectly on the server when two keyframes had opposite rotations
  (180 degrees apart), so exported annotations did not match the UI
  (<https://github.com/cvat-ai/cvat/pull/XXXX>)
