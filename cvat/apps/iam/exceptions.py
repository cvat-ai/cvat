from rest_framework.exceptions import PermissionDenied

class LimitsReachedError(PermissionDenied):
    default_personal_detail = "You've reached the maximum number of {}. Contact the administrator to extend the limits."
    default_org_detail = "You've reached the maximum number of {}. Contact the administrator to extend the limits for organization."

    def __init__(self, reasons, iam_context):
        if not reasons or not isinstance(reasons, list):
            super().__init__(reasons)

        msg = self.default_personal_detail
        if iam_context["organization"] is not None:
            msg = self.default_org_detail

        msg = msg.format(', '.join(reasons))
        super().__init__(msg)