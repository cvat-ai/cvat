from dateutil import parser
from datetime import datetime, timezone
from cvat.apps.analytics_report.report.derived_metrics.imetric import IDerivedMetric

class TaskAnnotationSpeed(IDerivedMetric):
    _title = "Annotation speed"
    _description = "Metric shows the annotation speed in objects per hour for the Task."
    _default_view = "histogram"
    _query = None
    _granularity = "day"
    _transformations = [
        {
            "name": "annotation_speed",
            "binary": {
                "left": "object_count",
                "operator": "/",
                "right": "annotation_time",
            },
        }
    ]

    def calculate(self):
        combined_statistics = {}

        for job_report in self._primary_statistics:
            dataseries = job_report["dataseries"]
            for oc_entry, wt_entry in zip(dataseries["object_count"], dataseries["working_time"]):
                entry = combined_statistics.setdefault(parser.parse(oc_entry["datetime"]).date(), {
                    "object_count": 0,
                    "working_time": 0,
                })
                entry["object_count"] += oc_entry["value"]
                entry["working_time"] += wt_entry["value"]

        combined_dataseries = {
            "object_count": [],
            "working_time": [],
        }

        for key in sorted(combined_statistics.keys()):
            timestamp_str = datetime.combine(key, datetime.min.time(), tzinfo=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            for s_name in ("object_count", "working_time"):
                combined_dataseries[s_name].append({
                    "value": combined_statistics[key][s_name],
                    "datetime": timestamp_str,
                })

        return combined_dataseries

class ProjectAnnotationSpeed(TaskAnnotationSpeed):
    _description = "Metric shows the annotation speed in objects per hour for the Project."
