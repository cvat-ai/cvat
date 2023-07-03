from cvat.apps.analytics_report.report.derived_metrics.imetric import IJobDerivedMetric

class TotalAnnotationSpeed(IJobDerivedMetric):
    _title = "Total Annotation Speed"
    _description = "Metric shows total annotation speed in the Job."
    _default_view = "numeric"
    _granularity = "NONE"

    def calculate(self):
        total_count = 0
        total_wt = 0
        dataseries = self._primary_statistics["dataseries"]
        for ds in zip(dataseries["object_count"], dataseries["working_time"]):
            total_count += ds[0]["value"]
            total_wt += ds[1]["value"]

        return {
            "total_annotation_speed": [
                {
                    "value": total_count / total_wt if total_wt != 0 else 0,
                    "datetime": self._get_utc_now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                },
            ]
        }
