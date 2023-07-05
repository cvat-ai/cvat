from cvat.apps.analytics_report.report.derived_metrics.imetric import IDerivedMetric

class JobTotalObjectCount(IDerivedMetric):
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

class TaskTotalObjectCount(JobTotalObjectCount):
    _description = "Metric shows total object count in the Task."

    def calculate(self):
        total_count = 0
        for job_report in self._primary_statistics:
            dataseries = job_report["dataseries"]
            for oc_entry in dataseries["object_count"]:
                total_count += oc_entry["value"]

        return {
            "total_object_count": [
                {
                    "value": total_count,
                    "datetime": self._get_utc_now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                },
            ]
        }

class ProjectTotalObjectCount(TaskTotalObjectCount):
    _description = "Metric shows total object count in the Project."
