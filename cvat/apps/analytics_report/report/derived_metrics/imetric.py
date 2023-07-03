from cvat.apps.analytics_report.report.primary_metrics import IJobPrimaryMetric

class IJobDerivedMetric(IJobPrimaryMetric):
    def __init__(self, job_id, primary_statistics):
        super().__init__(job_id)

        self._primary_statistics = primary_statistics
