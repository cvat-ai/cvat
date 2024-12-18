### Fixed

- Exporting datasets could start significantly later than expected, both for 1 and several users in the same project/task/job 
  (<https://github.com/cvat-ai/cvat/pull/8721>)
- Scheduled RQ jobs could not be restarted due to incorrect RQ job status
  updating and handling (<https://github.com/cvat-ai/cvat/pull/8721>)
