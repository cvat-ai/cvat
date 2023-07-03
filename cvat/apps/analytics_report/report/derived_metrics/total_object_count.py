from cvat.apps.analytics_report.report.derived_metrics.imetric import IJobDerivedMetric

class TotalObjectCount(IJobDerivedMetric):
    _title = "Total Object Count"
    _description = "Metric shows total object count in the Job."
    _default_view = "numeric"
    _granularity = "NONE"

    def calculate(self):
        count = 0
        dataseries = self._primary_statistics["dataseries"]
        for ds in dataseries["object_count"]:
            count += ds["value"]

        return {
            "total_object_count": [
                {
                    "value": count,
                    "datetime": self._get_utc_now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                },
            ]
        }
