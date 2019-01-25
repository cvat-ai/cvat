# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import rules

from cvat.apps.authentication.auth import has_admin_role, is_job_annotator, is_job_owner

def setup_permissions():
    rules.add_perm('reid.process.create', has_admin_role | is_job_annotator | is_job_owner)
    rules.add_perm('reid.process.check', has_admin_role | is_job_annotator | is_job_owner)
    rules.add_perm('reid.process.cancel', has_admin_role | is_job_annotator | is_job_owner)
