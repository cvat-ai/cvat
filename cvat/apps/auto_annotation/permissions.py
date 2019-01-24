# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import rules

from cvat.apps.authentication.auth import has_admin_role, has_user_role

@rules.predicate
def is_model_owner(db_user, db_dl_model):
    return db_dl_model.owner == db_user

@rules.predicate
def is_shared_model(_, db_dl_model):
    return db_dl_model.shared

@rules.predicate
def is_primary_model(_, db_dl_model):
    return db_dl_model.primary

def setup_permissions():
    rules.add_perm('auto_annotation.model.create', has_admin_role | has_user_role)

    rules.add_perm('auto_annotation.model.update', (has_admin_role | is_model_owner) & ~is_primary_model)

    rules.add_perm('auto_annotation.model.delete', (has_admin_role | is_model_owner) & ~is_primary_model)

    rules.add_perm('auto_annotation.model.access', has_admin_role | is_model_owner |
        is_shared_model | is_primary_model)
