package cloudstorages

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 329, "owner": {"id": 37}, "organization": {"id": 125}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"id": 399, "owner": {"id": 64}, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 241}, "user": {"role": "owner"}}}, "resource": {"id": 355, "owner": {"id": 40}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 380, "owner": {"id": 88}, "organization": {"id": 113}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "owner": {"id": 50}, "organization": {"id": 595}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"id": 379, "owner": {"id": 28}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 50}, "organization": {"id": 150}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 367, "owner": {"id": 0}, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "owner": {"id": 62}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 322, "owner": {"id": 76}, "organization": {"id": 171}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 367, "owner": {"id": 61}, "organization": {"id": 539}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 325, "owner": {"id": 22}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"id": 320, "owner": {"id": 43}, "organization": {"id": 124}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"id": 374, "owner": {"id": 99}, "organization": {"id": 500}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 26}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"id": 306, "owner": {"id": 487}, "organization": {"id": 514}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"id": 339, "owner": {"id": 436}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 386, "owner": {"id": 456}, "organization": {"id": 505}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 371, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 388, "owner": {"id": 488}, "organization": {"id": 523}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": 325, "owner": {"id": 413}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 375, "owner": {"id": 474}, "organization": {"id": 590}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 397, "owner": {"id": 412}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 376, "owner": {"id": 489}, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"id": 304, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"id": 341, "owner": {"id": 444}, "organization": {"id": 146}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"id": 357, "owner": {"id": 435}, "organization": {"id": 572}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 379, "owner": {"id": 447}, "organization": {"id": 172}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "owner": {"id": 403}, "organization": {"id": 521}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "owner": {"id": 492}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"id": 340, "owner": {"id": 498}, "organization": {"id": 199}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 446}, "organization": {"id": 597}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 432}, "organization": {"id": 191}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 450}, "organization": {"id": 577}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 489}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 340, "owner": {"id": 460}, "organization": {"id": 127}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": 387, "owner": {"id": 482}, "organization": {"id": 518}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 346, "owner": {"id": 487}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 289}, "user": {"role": "owner"}}}, "resource": {"id": 388, "owner": {"id": 38}, "organization": {"id": 181}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 243}, "user": {"role": "owner"}}}, "resource": {"id": 326, "owner": {"id": 85}, "organization": {"id": 518}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 326, "owner": {"id": 94}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 317, "owner": {"id": 52}, "organization": {"id": 178}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 396, "owner": {"id": 66}, "organization": {"id": 564}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 333, "owner": {"id": 46}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 10}, "organization": {"id": 197}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 330, "owner": {"id": 13}, "organization": {"id": 562}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "owner": {"id": 71}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 19}, "organization": {"id": 181}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 1}, "organization": {"id": 590}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 311, "owner": {"id": 82}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 46}, "organization": {"id": 167}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 4}, "organization": {"id": 570}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 53}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 247}, "user": {"role": "owner"}}}, "resource": {"id": 344, "owner": {"id": 485}, "organization": {"id": 569}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 326, "owner": {"id": 426}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 389, "owner": {"id": 428}, "organization": {"id": 581}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "owner": {"id": 463}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "owner": {"id": 468}, "organization": {"id": 564}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 390, "owner": {"id": 419}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 301, "owner": {"id": 466}, "organization": {"id": 533}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 350, "owner": {"id": 414}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 447}, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 383, "owner": {"id": 491}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 354, "owner": {"id": 424}, "organization": {"id": 142}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 486}, "organization": {"id": 544}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 318, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 361, "owner": {"id": 462}, "organization": {"id": 114}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "owner": {"id": 438}, "organization": {"id": 539}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 349, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "owner": {"id": 482}, "organization": {"id": 111}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 302, "owner": {"id": 430}, "organization": {"id": 596}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 330, "owner": {"id": 416}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": 394, "owner": {"id": 431}, "organization": {"id": 186}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 485}, "organization": {"id": 514}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 398, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 468}, "organization": {"id": 127}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 450}, "organization": {"id": 540}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 326, "owner": {"id": 450}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"id": 347, "owner": {"id": 85}, "organization": {"id": 168}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 223}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 88}, "organization": {"id": 503}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"id": 386, "owner": {"id": 70}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 320, "owner": {"id": 26}, "organization": {"id": 110}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "owner": {"id": 6}, "organization": {"id": 580}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "owner": {"id": 17}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "owner": {"id": 7}, "organization": {"id": 190}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 344, "owner": {"id": 73}, "organization": {"id": 501}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"id": 344, "owner": {"id": 40}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 346, "owner": {"id": 24}, "organization": {"id": 181}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 381, "owner": {"id": 64}, "organization": {"id": 567}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 320, "owner": {"id": 60}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 398, "owner": {"id": 69}, "organization": {"id": 127}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 82}, "organization": {"id": 569}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 32}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"id": 321, "owner": {"id": 436}, "organization": {"id": 546}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 436}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "owner": {"id": 471}, "organization": {"id": 546}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 361, "owner": {"id": 440}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 388, "owner": {"id": 459}, "organization": {"id": 505}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"id": 326, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 382, "owner": {"id": 491}, "organization": {"id": 509}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": 361, "owner": {"id": 432}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 478}, "organization": {"id": 523}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 398, "owner": {"id": 465}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"id": 340, "owner": {"id": 436}, "organization": {"id": 118}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"id": 329, "owner": {"id": 407}, "organization": {"id": 521}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"id": 323, "owner": {"id": 401}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "owner": {"id": 498}, "organization": {"id": 195}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "owner": {"id": 469}, "organization": {"id": 519}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 388, "owner": {"id": 476}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": 380, "owner": {"id": 488}, "organization": {"id": 110}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 304, "owner": {"id": 496}, "organization": {"id": 585}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 390, "owner": {"id": 414}, "organization": {"id": 132}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 347, "owner": {"id": 436}, "organization": {"id": 554}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 372, "owner": {"id": 465}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 273}, "user": {"role": null}}}, "resource": {"id": 385, "owner": {"id": 409}, "organization": {"id": 166}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 397, "owner": {"id": 489}, "organization": {"id": 540}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 338, "owner": {"id": 470}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 63}, "organization": {"id": 128}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 283}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 33}, "organization": {"id": 566}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 12}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 387, "owner": {"id": 6}, "organization": {"id": 137}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": 356, "owner": {"id": 10}, "organization": {"id": 561}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 362, "owner": {"id": 67}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 350, "owner": {"id": 36}, "organization": {"id": 190}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 321, "owner": {"id": 88}, "organization": {"id": 529}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 78}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 92}, "organization": {"id": 183}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 27}, "organization": {"id": 597}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 21}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 386, "owner": {"id": 36}, "organization": {"id": 160}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 389, "owner": {"id": 72}, "organization": {"id": 506}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 362, "owner": {"id": 38}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 359, "owner": {"id": 407}, "organization": {"id": 556}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"id": 318, "owner": {"id": 477}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 351, "owner": {"id": 409}, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 348, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "owner": {"id": 489}, "organization": {"id": 515}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 486}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 398, "owner": {"id": 490}, "organization": {"id": 584}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 325, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 376, "owner": {"id": 450}, "organization": {"id": 569}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 209}, "user": {"role": "owner"}}}, "resource": {"id": 377, "owner": {"id": 462}, "organization": {"id": 114}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 310, "owner": {"id": 487}, "organization": {"id": 500}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 309, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 380, "owner": {"id": 467}, "organization": {"id": 169}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 333, "owner": {"id": 428}, "organization": {"id": 533}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 396, "owner": {"id": 459}, "organization": {"id": 150}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 406}, "organization": {"id": 530}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 465}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 447}, "organization": {"id": 112}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 436}, "organization": {"id": 588}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": 301, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": 344, "owner": {"id": 472}, "organization": {"id": 125}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 394, "owner": {"id": 413}, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 343, "owner": {"id": 405}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"id": 355, "owner": {"id": 22}, "organization": {"id": 193}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"id": 396, "owner": {"id": 27}, "organization": {"id": 502}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 223}, "user": {"role": "owner"}}}, "resource": {"id": 363, "owner": {"id": 68}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "owner": {"id": 7}, "organization": {"id": 157}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 333, "owner": {"id": 68}, "organization": {"id": 589}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 303, "owner": {"id": 53}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "owner": {"id": 14}, "organization": {"id": 189}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 387, "owner": {"id": 6}, "organization": {"id": 574}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 382, "owner": {"id": 43}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 304, "owner": {"id": 77}, "organization": {"id": 118}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 76}, "organization": {"id": 566}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 22}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 70}, "organization": {"id": 145}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 66}, "organization": {"id": 529}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 324, "owner": {"id": 32}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 238}, "user": {"role": "owner"}}}, "resource": {"id": 322, "owner": {"id": 424}, "organization": {"id": 568}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"id": 309, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "owner": {"id": 476}, "organization": {"id": 544}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 333, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 315, "owner": {"id": 474}, "organization": {"id": 519}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 440}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 375, "owner": {"id": 488}, "organization": {"id": 559}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 389, "owner": {"id": 460}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 356, "owner": {"id": 455}, "organization": {"id": 593}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"id": 372, "owner": {"id": 477}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 422}, "organization": {"id": 150}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 223}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 481}, "organization": {"id": 536}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"id": 385, "owner": {"id": 441}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": 309, "owner": {"id": 409}, "organization": {"id": 139}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": 399, "owner": {"id": 454}, "organization": {"id": 558}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 377, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 315, "owner": {"id": 495}, "organization": {"id": 113}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 378, "owner": {"id": 473}, "organization": {"id": 502}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 306, "owner": {"id": 488}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 386, "owner": {"id": 419}, "organization": {"id": 193}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": 353, "owner": {"id": 471}, "organization": {"id": 512}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 452}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 348, "owner": {"id": 400}, "organization": {"id": 166}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 396, "owner": {"id": 447}, "organization": {"id": 535}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"id": 331, "owner": {"id": 33}, "organization": {"id": 514}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": null}, "resource": {"id": 394, "owner": {"id": 74}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": null}, "resource": {"id": 356, "owner": {"id": 480}, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": null}, "resource": {"id": 378, "owner": {"id": 458}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": null}, "resource": {"id": 320, "owner": {"id": 449}, "organization": {"id": 551}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": null}, "resource": {"id": 362, "owner": {"id": 405}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"id": 397, "owner": {"id": 82}, "organization": {"id": 555}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"id": 327, "owner": {"id": 61}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": null}, "resource": {"id": 318, "owner": {"id": 428}, "organization": {"id": 559}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": null}, "resource": {"id": 369, "owner": {"id": 458}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": null}, "resource": {"id": 372, "owner": {"id": 499}, "organization": {"id": 530}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": null}, "resource": {"id": 333, "owner": {"id": 493}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": null}, "resource": {"id": 383, "owner": {"id": 27}, "organization": {"id": 531}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": null}, "resource": {"id": 378, "owner": {"id": 80}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"id": 387, "owner": {"id": 407}, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": null}, "resource": {"id": 375, "owner": {"id": 493}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": null}, "resource": {"id": 380, "owner": {"id": 492}, "organization": {"id": 562}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": null}, "resource": {"id": 332, "owner": {"id": 469}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"id": 347, "owner": {"id": 28}, "organization": {"id": 587}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"id": 390, "owner": {"id": 88}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": null}, "resource": {"id": 327, "owner": {"id": 469}, "organization": {"id": 585}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}, "resource": {"id": 301, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": null}, "resource": {"id": 356, "owner": {"id": 445}, "organization": {"id": 542}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": null}, "resource": {"id": 312, "owner": {"id": 475}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": null}, "resource": {"id": 358, "owner": {"id": 72}, "organization": {"id": 548}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": null}, "resource": {"id": 399, "owner": {"id": 13}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"id": 308, "owner": {"id": 476}, "organization": {"id": 546}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": null}, "resource": {"id": 316, "owner": {"id": 458}, "organization": {"id": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": null}, "resource": {"id": 394, "owner": {"id": 465}, "organization": {"id": 530}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": null}, "resource": {"id": 349, "owner": {"id": 422}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"id": 320, "owner": {"id": 80}, "organization": {"id": 179}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"id": 352, "owner": {"id": 45}, "organization": {"id": 586}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 293}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 0}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 323, "owner": {"id": 35}, "organization": {"id": 159}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"id": 303, "owner": {"id": 94}, "organization": {"id": 559}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 324, "owner": {"id": 21}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 330, "owner": {"id": 21}, "organization": {"id": 103}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "owner": {"id": 81}, "organization": {"id": 540}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": 378, "owner": {"id": 17}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": 339, "owner": {"id": 57}, "organization": {"id": 161}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"id": 321, "owner": {"id": 67}, "organization": {"id": 579}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 348, "owner": {"id": 1}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"id": 326, "owner": {"id": 80}, "organization": {"id": 145}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 312, "owner": {"id": 12}, "organization": {"id": 595}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 23}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"id": 316, "owner": {"id": 449}, "organization": {"id": 525}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 231}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 492}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "owner": {"id": 408}, "organization": {"id": 537}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 480}, "organization": {"id": 500}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 442}, "organization": {"id": 510}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 422}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"id": 394, "owner": {"id": 455}, "organization": {"id": 524}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 311, "owner": {"id": 467}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 288}, "user": {"role": "owner"}}}, "resource": {"id": 341, "owner": {"id": 415}, "organization": {"id": 130}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 256}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 485}, "organization": {"id": 541}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"id": 358, "owner": {"id": 413}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 398, "owner": {"id": 407}, "organization": {"id": 108}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "owner": {"id": 453}, "organization": {"id": 589}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "owner": {"id": 456}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "owner": {"id": 415}, "organization": {"id": 141}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 300, "owner": {"id": 445}, "organization": {"id": 503}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "owner": {"id": 456}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 381, "owner": {"id": 495}, "organization": {"id": 180}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 319, "owner": {"id": 496}, "organization": {"id": 500}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 356, "owner": {"id": 459}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 332, "owner": {"id": 401}, "organization": {"id": 149}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": 305, "owner": {"id": 444}, "organization": {"id": 512}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 394, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 221}, "user": {"role": "owner"}}}, "resource": {"id": 372, "owner": {"id": 9}, "organization": {"id": 180}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 290}, "user": {"role": "owner"}}}, "resource": {"id": 354, "owner": {"id": 72}, "organization": {"id": 562}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"id": 324, "owner": {"id": 59}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 352, "owner": {"id": 60}, "organization": {"id": 183}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"id": 383, "owner": {"id": 44}, "organization": {"id": 529}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 307, "owner": {"id": 92}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 373, "owner": {"id": 10}, "organization": {"id": 174}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 58}, "organization": {"id": 555}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 5}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 309, "owner": {"id": 13}, "organization": {"id": 191}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"id": 342, "owner": {"id": 91}, "organization": {"id": 508}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 383, "owner": {"id": 34}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 391, "owner": {"id": 99}, "organization": {"id": 163}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 301, "owner": {"id": 62}, "organization": {"id": 548}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 59}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 368, "owner": {"id": 472}, "organization": {"id": 516}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 233}, "user": {"role": "owner"}}}, "resource": {"id": 350, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 388, "owner": {"id": 403}, "organization": {"id": 514}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "owner": {"id": 471}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 400}, "organization": {"id": 548}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"id": 360, "owner": {"id": 458}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 309, "owner": {"id": 465}, "organization": {"id": 534}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 451}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 463}, "organization": {"id": 538}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 335, "owner": {"id": 403}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 430}, "organization": {"id": 112}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 226}, "user": {"role": "owner"}}}, "resource": {"id": 388, "owner": {"id": 441}, "organization": {"id": 567}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"id": 396, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 336, "owner": {"id": 433}, "organization": {"id": 160}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 304, "owner": {"id": 460}, "organization": {"id": 528}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 321, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": 345, "owner": {"id": 446}, "organization": {"id": 177}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 489}, "organization": {"id": 516}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 360, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 382, "owner": {"id": 438}, "organization": {"id": 165}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 412}, "organization": {"id": 583}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 463}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 328, "owner": {"id": 445}, "organization": {"id": 153}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": 314, "owner": {"id": 442}, "organization": {"id": 553}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": 372, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"id": 330, "owner": {"id": 37}, "organization": {"id": 126}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 364, "owner": {"id": 60}, "organization": {"id": 553}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 226}, "user": {"role": "owner"}}}, "resource": {"id": 389, "owner": {"id": 89}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 42}, "organization": {"id": 145}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "owner": {"id": 40}, "organization": {"id": 523}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 375, "owner": {"id": 53}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 93}, "organization": {"id": 173}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 367, "owner": {"id": 84}, "organization": {"id": 574}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "owner": {"id": 62}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 323, "owner": {"id": 16}, "organization": {"id": 145}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 372, "owner": {"id": 40}, "organization": {"id": 562}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"id": 367, "owner": {"id": 92}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 46}, "organization": {"id": 108}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 385, "owner": {"id": 88}, "organization": {"id": 526}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 304, "owner": {"id": 57}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 253}, "user": {"role": "owner"}}}, "resource": {"id": 339, "owner": {"id": 435}, "organization": {"id": 536}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 223}, "user": {"role": "owner"}}}, "resource": {"id": 335, "owner": {"id": 422}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 424}, "organization": {"id": 571}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 308, "owner": {"id": 461}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 416}, "organization": {"id": 530}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 414}, "organization": {"id": 511}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 345, "owner": {"id": 429}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"id": 369, "owner": {"id": 428}, "organization": {"id": 588}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"id": 381, "owner": {"id": 413}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 400}, "organization": {"id": 123}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"id": 338, "owner": {"id": 412}, "organization": {"id": 571}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 349, "owner": {"id": 436}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 407}, "organization": {"id": 107}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 383, "owner": {"id": 444}, "organization": {"id": 531}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 453}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 442}, "organization": {"id": 172}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"id": 325, "owner": {"id": 453}, "organization": {"id": 514}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 374, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 362, "owner": {"id": 401}, "organization": {"id": 173}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 355, "owner": {"id": 448}, "organization": {"id": 531}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 455}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"id": 380, "owner": {"id": 442}, "organization": {"id": 178}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"id": 338, "owner": {"id": 494}, "organization": {"id": 528}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 336, "owner": {"id": 408}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 292}, "user": {"role": "owner"}}}, "resource": {"id": 367, "owner": {"id": 29}, "organization": {"id": 192}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"id": 365, "owner": {"id": 41}, "organization": {"id": 558}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 312, "owner": {"id": 34}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 317, "owner": {"id": 14}, "organization": {"id": 192}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 385, "owner": {"id": 7}, "organization": {"id": 569}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 85}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 319, "owner": {"id": 64}, "organization": {"id": 121}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 397, "owner": {"id": 81}, "organization": {"id": 551}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 92}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 396, "owner": {"id": 56}, "organization": {"id": 159}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": 370, "owner": {"id": 48}, "organization": {"id": 595}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"id": 300, "owner": {"id": 62}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 334, "owner": {"id": 96}, "organization": {"id": 150}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 317, "owner": {"id": 54}, "organization": {"id": 567}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 0}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"id": 330, "owner": {"id": 418}, "organization": {"id": 525}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"id": 315, "owner": {"id": 463}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"id": 337, "owner": {"id": 442}, "organization": {"id": 502}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 343, "owner": {"id": 464}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "owner": {"id": 427}, "organization": {"id": 562}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 393, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 462}, "organization": {"id": 506}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": 375, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"id": 381, "owner": {"id": 464}, "organization": {"id": 509}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 342, "owner": {"id": 426}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"id": 350, "owner": {"id": 434}, "organization": {"id": 158}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"id": 362, "owner": {"id": 441}, "organization": {"id": 506}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 467}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 379, "owner": {"id": 462}, "organization": {"id": 130}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 387, "owner": {"id": 449}, "organization": {"id": 533}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"id": 312, "owner": {"id": 465}, "organization": {"id": 144}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 315, "owner": {"id": 476}, "organization": {"id": 538}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "owner": {"id": 454}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 326, "owner": {"id": 452}, "organization": {"id": 173}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 409}, "organization": {"id": 533}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 348, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 327, "owner": {"id": 476}, "organization": {"id": 187}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 376, "owner": {"id": 453}, "organization": {"id": 590}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"id": 376, "owner": {"id": 32}, "organization": {"id": 149}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 323, "owner": {"id": 17}, "organization": {"id": 518}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"id": 337, "owner": {"id": 25}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 373, "owner": {"id": 55}, "organization": {"id": 147}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 359, "owner": {"id": 46}, "organization": {"id": 549}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "owner": {"id": 92}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 344, "owner": {"id": 69}, "organization": {"id": 108}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "owner": {"id": 48}, "organization": {"id": 543}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 323, "owner": {"id": 38}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 11}, "organization": {"id": 135}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"id": 309, "owner": {"id": 80}, "organization": {"id": 583}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 39}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 56}, "organization": {"id": 171}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 81}, "organization": {"id": 535}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"id": 377, "owner": {"id": 45}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"id": 321, "owner": {"id": 445}, "organization": {"id": 590}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 251}, "user": {"role": "owner"}}}, "resource": {"id": 351, "owner": {"id": 496}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 343, "owner": {"id": 473}, "organization": {"id": 525}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 385, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 310, "owner": {"id": 451}, "organization": {"id": 587}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 385, "owner": {"id": 435}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 456}, "organization": {"id": 500}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": 353, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"id": 309, "owner": {"id": 477}, "organization": {"id": 547}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 442}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 298}, "user": {"role": "owner"}}}, "resource": {"id": 313, "owner": {"id": 416}, "organization": {"id": 107}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 468}, "organization": {"id": 520}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"id": 320, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 325, "owner": {"id": 406}, "organization": {"id": 139}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 435}, "organization": {"id": 509}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "owner": {"id": 472}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 481}, "organization": {"id": 125}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 335, "owner": {"id": 482}, "organization": {"id": 519}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 472}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 386, "owner": {"id": 404}, "organization": {"id": 112}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 323, "owner": {"id": 497}, "organization": {"id": 572}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 356, "owner": {"id": 450}, "organization": {"id": null}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 377, "owner": {"id": 435}, "organization": {"id": 111}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 460}, "organization": {"id": 518}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 447}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": null}, "resource": {"id": 322, "owner": {"id": 5}, "organization": {"id": 502}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": null}, "resource": {"id": 315, "owner": {"id": 67}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": null}, "resource": {"id": 300, "owner": {"id": 419}, "organization": {"id": 547}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"id": 386, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"id": 323, "owner": {"id": 486}, "organization": {"id": 543}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": null}, "resource": {"id": 385, "owner": {"id": 444}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": null}, "resource": {"id": 332, "owner": {"id": 69}, "organization": {"id": 571}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"id": 355, "owner": {"id": 73}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": null}, "resource": {"id": 364, "owner": {"id": 416}, "organization": {"id": 534}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"id": 321, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"id": 379, "owner": {"id": 475}, "organization": {"id": 527}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"id": 367, "owner": {"id": 451}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": null}, "resource": {"id": 314, "owner": {"id": 2}, "organization": {"id": 587}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"id": 387, "owner": {"id": 92}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": null}, "resource": {"id": 392, "owner": {"id": 444}, "organization": {"id": 583}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": null}, "resource": {"id": 300, "owner": {"id": 444}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": null}, "resource": {"id": 336, "owner": {"id": 480}, "organization": {"id": 549}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": null}, "resource": {"id": 362, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"id": 322, "owner": {"id": 34}, "organization": {"id": 534}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": null}, "resource": {"id": 391, "owner": {"id": 96}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 472}, "organization": {"id": 593}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": null}, "resource": {"id": 323, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 439}, "organization": {"id": 552}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": null}, "resource": {"id": 380, "owner": {"id": 441}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": null}, "resource": {"id": 350, "owner": {"id": 2}, "organization": {"id": 567}}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"id": 305, "owner": {"id": 94}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": null}, "resource": {"id": 348, "owner": {"id": 475}, "organization": {"id": 535}}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"id": 360, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": null}, "resource": {"id": 388, "owner": {"id": 403}, "organization": {"id": 554}}}
}

test_scope_LIST_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"id": 335, "owner": {"id": 55}, "organization": {"id": 124}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 66}, "organization": {"id": 587}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"id": 319, "owner": {"id": 16}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 60}, "organization": {"id": 143}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"id": 310, "owner": {"id": 2}, "organization": {"id": 545}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 317, "owner": {"id": 79}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 320, "owner": {"id": 22}, "organization": {"id": 153}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 305, "owner": {"id": 19}, "organization": {"id": 561}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "owner": {"id": 39}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 13}, "organization": {"id": 171}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 13}, "organization": {"id": 527}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": 316, "owner": {"id": 70}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 315, "owner": {"id": 49}, "organization": {"id": 136}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"id": 363, "owner": {"id": 35}, "organization": {"id": 540}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"id": 326, "owner": {"id": 0}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 283}, "user": {"role": "owner"}}}, "resource": {"id": 366, "owner": {"id": 439}, "organization": {"id": 589}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 402}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 405}, "organization": {"id": 597}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 378, "owner": {"id": 484}, "organization": {"id": 585}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 310, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 473}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 491}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"id": 339, "owner": {"id": 462}, "organization": {"id": 560}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": 375, "owner": {"id": 456}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 235}, "user": {"role": "owner"}}}, "resource": {"id": 357, "owner": {"id": 476}, "organization": {"id": 157}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"id": 349, "owner": {"id": 408}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 259}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 498}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 316, "owner": {"id": 474}, "organization": {"id": 147}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 339, "owner": {"id": 459}, "organization": {"id": 548}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 455}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 480}, "organization": {"id": 132}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 429}, "organization": {"id": 568}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 354, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"id": 374, "owner": {"id": 487}, "organization": {"id": 140}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"id": 306, "owner": {"id": 413}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 361, "owner": {"id": 496}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"id": 340, "owner": {"id": 473}, "organization": {"id": 188}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 332, "owner": {"id": 463}, "organization": {"id": 515}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 375, "owner": {"id": 475}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"id": 373, "owner": {"id": 14}, "organization": {"id": 164}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"id": 319, "owner": {"id": 25}, "organization": {"id": 588}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 230}, "user": {"role": "owner"}}}, "resource": {"id": 394, "owner": {"id": 16}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 336, "owner": {"id": 6}, "organization": {"id": 132}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 388, "owner": {"id": 35}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 373, "owner": {"id": 39}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 370, "owner": {"id": 81}, "organization": {"id": 121}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 379, "owner": {"id": 60}, "organization": {"id": 587}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "owner": {"id": 22}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 355, "owner": {"id": 93}, "organization": {"id": 117}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 372, "owner": {"id": 23}, "organization": {"id": 500}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 366, "owner": {"id": 46}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"id": 377, "owner": {"id": 33}, "organization": {"id": 155}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 73}, "organization": {"id": 528}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 93}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 292}, "user": {"role": "owner"}}}, "resource": {"id": 311, "owner": {"id": 401}, "organization": {"id": 533}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"id": 355, "owner": {"id": 404}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 350, "owner": {"id": 414}, "organization": {"id": 506}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 437}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 313, "owner": {"id": 407}, "organization": {"id": 512}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 358, "owner": {"id": 441}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 444}, "organization": {"id": 572}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 339, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 300, "owner": {"id": 450}, "organization": {"id": 504}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 319, "owner": {"id": 492}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 246}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 416}, "organization": {"id": 141}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"id": 382, "owner": {"id": 471}, "organization": {"id": 535}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"id": 301, "owner": {"id": 402}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 368, "owner": {"id": 438}, "organization": {"id": 163}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 344, "owner": {"id": 458}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 467}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": 304, "owner": {"id": 438}, "organization": {"id": 191}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 373, "owner": {"id": 400}, "organization": {"id": 565}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 384, "owner": {"id": 420}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"id": 387, "owner": {"id": 427}, "organization": {"id": 143}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 346, "owner": {"id": 418}, "organization": {"id": 595}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 350, "owner": {"id": 419}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 312, "owner": {"id": 450}, "organization": {"id": 197}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"id": 352, "owner": {"id": 436}, "organization": {"id": 579}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": 311, "owner": {"id": 415}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 215}, "user": {"role": "owner"}}}, "resource": {"id": 313, "owner": {"id": 22}, "organization": {"id": 105}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"id": 369, "owner": {"id": 3}, "organization": {"id": 508}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"id": 366, "owner": {"id": 66}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 383, "owner": {"id": 45}, "organization": {"id": 144}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "owner": {"id": 33}, "organization": {"id": 573}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "owner": {"id": 38}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 323, "owner": {"id": 46}, "organization": {"id": 122}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 325, "owner": {"id": 36}, "organization": {"id": 565}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "owner": {"id": 95}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"id": 389, "owner": {"id": 81}, "organization": {"id": 182}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": 397, "owner": {"id": 73}, "organization": {"id": 556}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 7}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 43}, "organization": {"id": 135}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 375, "owner": {"id": 1}, "organization": {"id": 597}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 378, "owner": {"id": 46}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"id": 364, "owner": {"id": 427}, "organization": {"id": 538}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 292}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 460}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "owner": {"id": 497}, "organization": {"id": 518}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 308, "owner": {"id": 455}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 389, "owner": {"id": 466}, "organization": {"id": 585}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 422}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 457}, "organization": {"id": 524}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 373, "owner": {"id": 419}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 436}, "organization": {"id": 521}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": 388, "owner": {"id": 476}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 284}, "user": {"role": "owner"}}}, "resource": {"id": 387, "owner": {"id": 432}, "organization": {"id": 152}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"id": 311, "owner": {"id": 402}, "organization": {"id": 577}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"id": 346, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"id": 337, "owner": {"id": 411}, "organization": {"id": 131}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 371, "owner": {"id": 491}, "organization": {"id": 578}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 440}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 301, "owner": {"id": 489}, "organization": {"id": 151}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": 347, "owner": {"id": 491}, "organization": {"id": 581}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 409}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 466}, "organization": {"id": 145}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 302, "owner": {"id": 407}, "organization": {"id": 567}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 395, "owner": {"id": 441}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 356, "owner": {"id": 437}, "organization": {"id": 128}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 275}, "user": {"role": null}}}, "resource": {"id": 329, "owner": {"id": 418}, "organization": {"id": 502}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 469}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 63}, "organization": {"id": 121}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 378, "owner": {"id": 71}, "organization": {"id": 534}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"id": 305, "owner": {"id": 85}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 314, "owner": {"id": 62}, "organization": {"id": 118}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 314, "owner": {"id": 52}, "organization": {"id": 589}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 358, "owner": {"id": 37}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 364, "owner": {"id": 75}, "organization": {"id": 172}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "owner": {"id": 67}, "organization": {"id": 549}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 373, "owner": {"id": 37}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": 362, "owner": {"id": 10}, "organization": {"id": 113}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 15}, "organization": {"id": 541}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": 342, "owner": {"id": 24}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 68}, "organization": {"id": 162}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 381, "owner": {"id": 80}, "organization": {"id": 570}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"id": 395, "owner": {"id": 83}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 393, "owner": {"id": 416}, "organization": {"id": 515}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 284}, "user": {"role": "owner"}}}, "resource": {"id": 325, "owner": {"id": 478}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"id": 358, "owner": {"id": 443}, "organization": {"id": 515}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "owner": {"id": 491}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 374, "owner": {"id": 449}, "organization": {"id": 553}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "owner": {"id": 462}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 395, "owner": {"id": 492}, "organization": {"id": 524}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 314, "owner": {"id": 409}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 327, "owner": {"id": 464}, "organization": {"id": 519}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 357, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 489}, "organization": {"id": 104}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 233}, "user": {"role": "owner"}}}, "resource": {"id": 319, "owner": {"id": 484}, "organization": {"id": 537}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"id": 376, "owner": {"id": 432}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "owner": {"id": 436}, "organization": {"id": 160}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "owner": {"id": 437}, "organization": {"id": 534}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": 307, "owner": {"id": 415}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"id": 312, "owner": {"id": 403}, "organization": {"id": 144}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "owner": {"id": 418}, "organization": {"id": 503}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 342, "owner": {"id": 414}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 432}, "organization": {"id": 129}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 356, "owner": {"id": 434}, "organization": {"id": 534}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 378, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 422}, "organization": {"id": 169}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 363, "owner": {"id": 462}, "organization": {"id": 585}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 411}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"id": 326, "owner": {"id": 8}, "organization": {"id": 112}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"id": 309, "owner": {"id": 60}, "organization": {"id": 550}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"id": 354, "owner": {"id": 98}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "owner": {"id": 97}, "organization": {"id": 155}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 349, "owner": {"id": 42}, "organization": {"id": 542}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 355, "owner": {"id": 47}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": 311, "owner": {"id": 92}, "organization": {"id": 161}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "owner": {"id": 68}, "organization": {"id": 502}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "owner": {"id": 36}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 302, "owner": {"id": 92}, "organization": {"id": 176}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 339, "owner": {"id": 10}, "organization": {"id": 587}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 300, "owner": {"id": 48}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 56}, "organization": {"id": 149}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 319, "owner": {"id": 78}, "organization": {"id": 565}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 1}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"id": 348, "owner": {"id": 409}, "organization": {"id": 547}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 217}, "user": {"role": "owner"}}}, "resource": {"id": 364, "owner": {"id": 415}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 322, "owner": {"id": 437}, "organization": {"id": 565}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"id": 373, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "owner": {"id": 490}, "organization": {"id": 554}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 311, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 448}, "organization": {"id": 521}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 347, "owner": {"id": 488}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": 302, "owner": {"id": 409}, "organization": {"id": 510}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": 317, "owner": {"id": 447}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 481}, "organization": {"id": 112}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 290}, "user": {"role": "owner"}}}, "resource": {"id": 352, "owner": {"id": 400}, "organization": {"id": 579}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"id": 339, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 307, "owner": {"id": 407}, "organization": {"id": 103}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "owner": {"id": 475}, "organization": {"id": 590}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 329, "owner": {"id": 466}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 303, "owner": {"id": 484}, "organization": {"id": 171}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": 383, "owner": {"id": 423}, "organization": {"id": 533}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"id": 369, "owner": {"id": 429}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 364, "owner": {"id": 452}, "organization": {"id": 180}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 366, "owner": {"id": 469}, "organization": {"id": 522}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 307, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"id": 303, "owner": {"id": 405}, "organization": {"id": 191}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": 398, "owner": {"id": 430}, "organization": {"id": 561}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 308, "owner": {"id": 412}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": null}, "resource": {"id": 335, "owner": {"id": 38}, "organization": {"id": 515}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": null}, "resource": {"id": 317, "owner": {"id": 71}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": null}, "resource": {"id": 313, "owner": {"id": 491}, "organization": {"id": 516}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"id": 378, "owner": {"id": 493}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"id": 304, "owner": {"id": 441}, "organization": {"id": 540}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": null}, "resource": {"id": 336, "owner": {"id": 404}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"id": 335, "owner": {"id": 32}, "organization": {"id": 567}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"id": 323, "owner": {"id": 44}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"id": 307, "owner": {"id": 428}, "organization": {"id": 559}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"id": 381, "owner": {"id": 433}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": null}, "resource": {"id": 312, "owner": {"id": 444}, "organization": {"id": 534}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": null}, "resource": {"id": 381, "owner": {"id": 435}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": null}, "resource": {"id": 397, "owner": {"id": 52}, "organization": {"id": 589}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}, "resource": {"id": 368, "owner": {"id": 55}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": null}, "resource": {"id": 373, "owner": {"id": 477}, "organization": {"id": 593}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": null}, "resource": {"id": 340, "owner": {"id": 444}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": null}, "resource": {"id": 366, "owner": {"id": 485}, "organization": {"id": 571}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": null}, "resource": {"id": 374, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": null}, "resource": {"id": 323, "owner": {"id": 59}, "organization": {"id": 551}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": null}, "resource": {"id": 333, "owner": {"id": 62}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"id": 340, "owner": {"id": 448}, "organization": {"id": 531}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 443}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": null}, "resource": {"id": 306, "owner": {"id": 435}, "organization": {"id": 595}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"id": 345, "owner": {"id": 491}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": null}, "resource": {"id": 360, "owner": {"id": 16}, "organization": {"id": 505}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": null}, "resource": {"id": 362, "owner": {"id": 84}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"id": 339, "owner": {"id": 409}, "organization": {"id": 578}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": null}, "resource": {"id": 398, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": null}, "resource": {"id": 318, "owner": {"id": 424}, "organization": {"id": 584}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"id": 362, "owner": {"id": 444}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 295}, "user": {"role": "owner"}}}, "resource": {"id": 393, "owner": {"id": 1}, "organization": {"id": 196}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"id": 312, "owner": {"id": 58}, "organization": {"id": 564}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"id": 333, "owner": {"id": 67}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 313, "owner": {"id": 61}, "organization": {"id": 105}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 327, "owner": {"id": 7}, "organization": {"id": 586}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 274}, "user": {"role": "maintainer"}}}, "resource": {"id": 302, "owner": {"id": 18}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "owner": {"id": 12}, "organization": {"id": 139}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 390, "owner": {"id": 46}, "organization": {"id": 573}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 350, "owner": {"id": 56}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 343, "owner": {"id": 65}, "organization": {"id": 121}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 23}, "organization": {"id": 562}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 91}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 350, "owner": {"id": 38}, "organization": {"id": 167}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 294}, "user": {"role": null}}}, "resource": {"id": 350, "owner": {"id": 21}, "organization": {"id": 574}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 389, "owner": {"id": 21}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 456}, "organization": {"id": 510}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 460}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "owner": {"id": 444}, "organization": {"id": 534}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 429}, "organization": {"id": 549}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": 325, "owner": {"id": 484}, "organization": {"id": 561}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 300, "owner": {"id": 467}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"id": 359, "owner": {"id": 464}, "organization": {"id": 585}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 324, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 343, "owner": {"id": 475}, "organization": {"id": 115}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"id": 373, "owner": {"id": 429}, "organization": {"id": 507}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 425}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "owner": {"id": 465}, "organization": {"id": 141}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 469}, "organization": {"id": 537}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"id": 356, "owner": {"id": 494}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 460}, "organization": {"id": 129}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 391, "owner": {"id": 496}, "organization": {"id": 523}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 373, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 320, "owner": {"id": 446}, "organization": {"id": 107}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 326, "owner": {"id": 470}, "organization": {"id": 574}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 386, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 383, "owner": {"id": 410}, "organization": {"id": 150}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 356, "owner": {"id": 410}, "organization": {"id": 590}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 321, "owner": {"id": 496}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 54}, "organization": {"id": 111}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 264}, "user": {"role": "owner"}}}, "resource": {"id": 332, "owner": {"id": 25}, "organization": {"id": 576}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"id": 372, "owner": {"id": 0}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 315, "owner": {"id": 17}, "organization": {"id": 127}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "owner": {"id": 15}, "organization": {"id": 521}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 314, "owner": {"id": 18}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 396, "owner": {"id": 87}, "organization": {"id": 107}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 323, "owner": {"id": 10}, "organization": {"id": 553}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 14}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 316, "owner": {"id": 22}, "organization": {"id": 117}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 378, "owner": {"id": 33}, "organization": {"id": 509}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 392, "owner": {"id": 11}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 380, "owner": {"id": 8}, "organization": {"id": 116}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 268}, "user": {"role": null}}}, "resource": {"id": 354, "owner": {"id": 50}, "organization": {"id": 515}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 55}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 476}, "organization": {"id": 538}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"id": 326, "owner": {"id": 493}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 424}, "organization": {"id": 538}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 393, "owner": {"id": 432}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 421}, "organization": {"id": 536}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "owner": {"id": 487}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"id": 370, "owner": {"id": 467}, "organization": {"id": 535}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 356, "owner": {"id": 404}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 347, "owner": {"id": 425}, "organization": {"id": 525}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"id": 329, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 334, "owner": {"id": 478}, "organization": {"id": 169}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"id": 304, "owner": {"id": 417}, "organization": {"id": 568}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 275}, "user": {"role": "owner"}}}, "resource": {"id": 365, "owner": {"id": 469}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 303, "owner": {"id": 458}, "organization": {"id": 177}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 325, "owner": {"id": 463}, "organization": {"id": 522}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 355, "owner": {"id": 486}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 308, "owner": {"id": 421}, "organization": {"id": 165}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "owner": {"id": 401}, "organization": {"id": 520}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 216}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 418}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 348, "owner": {"id": 415}, "organization": {"id": 173}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 378, "owner": {"id": 477}, "organization": {"id": 534}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 380, "owner": {"id": 456}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 316, "owner": {"id": 472}, "organization": {"id": 149}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 321, "owner": {"id": 461}, "organization": {"id": 517}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 415}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 226}, "user": {"role": "owner"}}}, "resource": {"id": 331, "owner": {"id": 34}, "organization": {"id": 104}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"id": 386, "owner": {"id": 17}, "organization": {"id": 536}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 3}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "owner": {"id": 78}, "organization": {"id": 104}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 366, "owner": {"id": 87}, "organization": {"id": 540}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 398, "owner": {"id": 13}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "owner": {"id": 27}, "organization": {"id": 164}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 354, "owner": {"id": 41}, "organization": {"id": 589}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 389, "owner": {"id": 41}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 316, "owner": {"id": 18}, "organization": {"id": 123}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 364, "owner": {"id": 54}, "organization": {"id": 528}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 358, "owner": {"id": 28}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 56}, "organization": {"id": 135}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"id": 325, "owner": {"id": 41}, "organization": {"id": 550}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 24}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"id": 331, "owner": {"id": 485}, "organization": {"id": 523}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 215}, "user": {"role": "owner"}}}, "resource": {"id": 381, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 362, "owner": {"id": 460}, "organization": {"id": 551}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "owner": {"id": 453}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "owner": {"id": 455}, "organization": {"id": 531}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 419}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 358, "owner": {"id": 494}, "organization": {"id": 594}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 454}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 307, "owner": {"id": 474}, "organization": {"id": 585}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 289}, "user": {"role": "owner"}}}, "resource": {"id": 329, "owner": {"id": 488}, "organization": {"id": 197}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 476}, "organization": {"id": 586}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"id": 302, "owner": {"id": 428}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 350, "owner": {"id": 401}, "organization": {"id": 189}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 419}, "organization": {"id": 582}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 301, "owner": {"id": 491}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "owner": {"id": 434}, "organization": {"id": 155}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "owner": {"id": 465}, "organization": {"id": 534}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 300, "owner": {"id": 475}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"id": 319, "owner": {"id": 413}, "organization": {"id": 106}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"id": 302, "owner": {"id": 436}, "organization": {"id": 565}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 498}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"id": 307, "owner": {"id": 429}, "organization": {"id": 136}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 317, "owner": {"id": 421}, "organization": {"id": 562}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 347, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 265}, "user": {"role": "owner"}}}, "resource": {"id": 364, "owner": {"id": 85}, "organization": {"id": 120}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 320, "owner": {"id": 67}, "organization": {"id": 517}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"id": 385, "owner": {"id": 65}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "owner": {"id": 26}, "organization": {"id": 193}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 300, "owner": {"id": 95}, "organization": {"id": 534}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 361, "owner": {"id": 89}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "owner": {"id": 97}, "organization": {"id": 143}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "owner": {"id": 24}, "organization": {"id": 534}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 99}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 338, "owner": {"id": 96}, "organization": {"id": 100}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 88}, "organization": {"id": 584}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 353, "owner": {"id": 44}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 330, "owner": {"id": 78}, "organization": {"id": 148}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"id": 340, "owner": {"id": 84}, "organization": {"id": 596}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"id": 325, "owner": {"id": 12}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 259}, "user": {"role": "owner"}}}, "resource": {"id": 354, "owner": {"id": 403}, "organization": {"id": 526}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"id": 308, "owner": {"id": 454}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 336, "owner": {"id": 413}, "organization": {"id": 574}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "owner": {"id": 436}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 421}, "organization": {"id": 519}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "owner": {"id": 453}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 344, "owner": {"id": 435}, "organization": {"id": 503}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 304, "owner": {"id": 453}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": 333, "owner": {"id": 415}, "organization": {"id": 537}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"id": 361, "owner": {"id": 477}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"id": 315, "owner": {"id": 491}, "organization": {"id": 193}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 295}, "user": {"role": "owner"}}}, "resource": {"id": 321, "owner": {"id": 477}, "organization": {"id": 550}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 293}, "user": {"role": "owner"}}}, "resource": {"id": 381, "owner": {"id": 461}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": 322, "owner": {"id": 403}, "organization": {"id": 134}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "owner": {"id": 452}, "organization": {"id": 512}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 322, "owner": {"id": 447}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 356, "owner": {"id": 443}, "organization": {"id": 103}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 370, "owner": {"id": 432}, "organization": {"id": 525}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 454}, "organization": {"id": 107}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 374, "owner": {"id": 458}, "organization": {"id": 551}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 357, "owner": {"id": 475}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 330, "owner": {"id": 466}, "organization": {"id": 135}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 412}, "organization": {"id": 514}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 376, "owner": {"id": 435}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 230}, "user": {"role": "owner"}}}, "resource": {"id": 323, "owner": {"id": 66}, "organization": {"id": 106}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 9}, "organization": {"id": 581}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 319, "owner": {"id": 18}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 393, "owner": {"id": 28}, "organization": {"id": 163}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 303, "owner": {"id": 73}, "organization": {"id": 570}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "owner": {"id": 2}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 331, "owner": {"id": 58}, "organization": {"id": 133}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 384, "owner": {"id": 36}, "organization": {"id": 548}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 305, "owner": {"id": 78}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 350, "owner": {"id": 77}, "organization": {"id": 114}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 318, "owner": {"id": 57}, "organization": {"id": 589}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 375, "owner": {"id": 6}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 336, "owner": {"id": 63}, "organization": {"id": 192}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 5}, "organization": {"id": 516}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 96}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"id": 306, "owner": {"id": 482}, "organization": {"id": 562}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"id": 315, "owner": {"id": 417}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "owner": {"id": 463}, "organization": {"id": 561}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "owner": {"id": 415}, "organization": {"id": 546}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": 394, "owner": {"id": 405}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 380, "owner": {"id": 486}, "organization": {"id": 512}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 395, "owner": {"id": 485}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"id": 350, "owner": {"id": 465}, "organization": {"id": 597}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 370, "owner": {"id": 431}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"id": 345, "owner": {"id": 485}, "organization": {"id": 147}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 243}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 474}, "organization": {"id": 530}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"id": 386, "owner": {"id": 499}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "owner": {"id": 479}, "organization": {"id": 130}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 316, "owner": {"id": 433}, "organization": {"id": 598}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": 383, "owner": {"id": 462}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 415}, "organization": {"id": 197}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 403}, "organization": {"id": 578}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "owner": {"id": 488}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 486}, "organization": {"id": 158}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 447}, "organization": {"id": 583}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 388, "owner": {"id": 482}, "organization": {"id": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 333, "owner": {"id": 485}, "organization": {"id": 194}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 367, "owner": {"id": 455}, "organization": {"id": 535}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"id": 386, "owner": {"id": 451}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"id": 315, "owner": {"id": 72}, "organization": {"id": 535}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"id": 386, "owner": {"id": 11}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"id": 362, "owner": {"id": 466}, "organization": {"id": 543}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"id": 364, "owner": {"id": 400}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": null}, "resource": {"id": 315, "owner": {"id": 490}, "organization": {"id": 520}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": null}, "resource": {"id": 328, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": null}, "resource": {"id": 330, "owner": {"id": 98}, "organization": {"id": 521}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"id": 370, "owner": {"id": 71}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": null}, "resource": {"id": 364, "owner": {"id": 459}, "organization": {"id": 575}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": null}, "resource": {"id": 355, "owner": {"id": 474}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"id": 328, "owner": {"id": 478}, "organization": {"id": 523}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": null}, "resource": {"id": 301, "owner": {"id": 494}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": null}, "resource": {"id": 318, "owner": {"id": 36}, "organization": {"id": 589}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": null}, "resource": {"id": 312, "owner": {"id": 14}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"id": 332, "owner": {"id": 499}, "organization": {"id": 594}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"id": 374, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": null}, "resource": {"id": 343, "owner": {"id": 449}, "organization": {"id": 548}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": null}, "resource": {"id": 383, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"id": 379, "owner": {"id": 88}, "organization": {"id": 546}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": null}, "resource": {"id": 306, "owner": {"id": 12}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"id": 387, "owner": {"id": 438}, "organization": {"id": 586}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": null}, "resource": {"id": 308, "owner": {"id": 488}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"id": 359, "owner": {"id": 412}, "organization": {"id": 559}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"id": 345, "owner": {"id": 482}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": null}, "resource": {"id": 309, "owner": {"id": 44}, "organization": {"id": 524}}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": null}, "resource": {"id": 385, "owner": {"id": 25}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": null}, "resource": {"id": 315, "owner": {"id": 467}, "organization": {"id": 531}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": null}, "resource": {"id": 389, "owner": {"id": 423}, "organization": {"id": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": null}, "resource": {"id": 377, "owner": {"id": 421}, "organization": {"id": 579}}}
}

test_scope_DELETE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": null}, "resource": {"id": 317, "owner": {"id": 452}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 249}, "user": {"role": "owner"}}}, "resource": {"id": 352, "owner": {"id": 63}, "organization": {"id": 119}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 344, "owner": {"id": 9}, "organization": {"id": 539}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"id": 322, "owner": {"id": 2}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"id": 336, "owner": {"id": 69}, "organization": {"id": 121}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 351, "owner": {"id": 5}, "organization": {"id": 531}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 399, "owner": {"id": 33}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 353, "owner": {"id": 69}, "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 311, "owner": {"id": 93}, "organization": {"id": 555}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 380, "owner": {"id": 18}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 372, "owner": {"id": 90}, "organization": {"id": 123}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 319, "owner": {"id": 89}, "organization": {"id": 588}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 328, "owner": {"id": 84}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 348, "owner": {"id": 60}, "organization": {"id": 153}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": 347, "owner": {"id": 97}, "organization": {"id": 509}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 380, "owner": {"id": 81}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 328, "owner": {"id": 476}, "organization": {"id": 545}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 405}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 364, "owner": {"id": 467}, "organization": {"id": 556}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "owner": {"id": 447}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 349, "owner": {"id": 420}, "organization": {"id": 592}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 356, "owner": {"id": 438}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 341, "owner": {"id": 474}, "organization": {"id": 536}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": 387, "owner": {"id": 466}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 489}, "organization": {"id": 571}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"id": 329, "owner": {"id": 431}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 402}, "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"id": 340, "owner": {"id": 474}, "organization": {"id": 574}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"id": 351, "owner": {"id": 417}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 474}, "organization": {"id": 179}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 327, "owner": {"id": 401}, "organization": {"id": 532}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 387, "owner": {"id": 409}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": 301, "owner": {"id": 456}, "organization": {"id": 106}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 359, "owner": {"id": 458}, "organization": {"id": 535}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 306, "owner": {"id": 439}, "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 381, "owner": {"id": 417}, "organization": {"id": 532}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"id": 387, "owner": {"id": 438}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"id": 311, "owner": {"id": 484}, "organization": {"id": 190}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"id": 314, "owner": {"id": 414}, "organization": {"id": 587}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 357, "owner": {"id": 409}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 241}, "user": {"role": "owner"}}}, "resource": {"id": 369, "owner": {"id": 59}, "organization": {"id": 139}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 284}, "user": {"role": "owner"}}}, "resource": {"id": 357, "owner": {"id": 91}, "organization": {"id": 572}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 385, "owner": {"id": 78}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 375, "owner": {"id": 35}, "organization": {"id": 189}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 308, "owner": {"id": 14}, "organization": {"id": 562}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "owner": {"id": 96}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "owner": {"id": 57}, "organization": {"id": 194}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 313, "owner": {"id": 55}, "organization": {"id": 583}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 383, "owner": {"id": 7}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 71}, "organization": {"id": 197}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 380, "owner": {"id": 63}, "organization": {"id": 578}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 84}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 74}, "organization": {"id": 197}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"id": 308, "owner": {"id": 48}, "organization": {"id": 579}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 341, "owner": {"id": 2}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 249}, "user": {"role": "owner"}}}, "resource": {"id": 362, "owner": {"id": 482}, "organization": {"id": 595}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 201}, "user": {"role": "owner"}}}, "resource": {"id": 343, "owner": {"id": 430}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 300, "owner": {"id": 453}, "organization": {"id": 516}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 339, "owner": {"id": 494}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 460}, "organization": {"id": 561}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 372, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 485}, "organization": {"id": 558}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 479}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"id": 396, "owner": {"id": 449}, "organization": {"id": 517}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 393, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 346, "owner": {"id": 427}, "organization": {"id": 188}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 217}, "user": {"role": "owner"}}}, "resource": {"id": 393, "owner": {"id": 454}, "organization": {"id": 561}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 459}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 382, "owner": {"id": 473}, "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "owner": {"id": 466}, "organization": {"id": 529}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 458}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 449}, "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"id": 310, "owner": {"id": 471}, "organization": {"id": 510}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 342, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 492}, "organization": {"id": 121}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 320, "owner": {"id": 446}, "organization": {"id": 549}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 389, "owner": {"id": 433}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"id": 304, "owner": {"id": 459}, "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 323, "owner": {"id": 466}, "organization": {"id": 577}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"id": 321, "owner": {"id": 444}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"id": 394, "owner": {"id": 85}, "organization": {"id": 183}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"id": 308, "owner": {"id": 6}, "organization": {"id": 559}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 238}, "user": {"role": "owner"}}}, "resource": {"id": 303, "owner": {"id": 51}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 380, "owner": {"id": 50}, "organization": {"id": 187}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "owner": {"id": 3}, "organization": {"id": 513}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 322, "owner": {"id": 59}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 332, "owner": {"id": 31}, "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "owner": {"id": 68}, "organization": {"id": 501}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": 397, "owner": {"id": 65}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 342, "owner": {"id": 57}, "organization": {"id": 165}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 370, "owner": {"id": 39}, "organization": {"id": 576}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 350, "owner": {"id": 71}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"id": 322, "owner": {"id": 63}, "organization": {"id": 186}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 397, "owner": {"id": 89}, "organization": {"id": 509}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 390, "owner": {"id": 7}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 280}, "user": {"role": "owner"}}}, "resource": {"id": 336, "owner": {"id": 499}, "organization": {"id": 539}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 459}, "organization": {"id": 565}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 393, "owner": {"id": 459}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "owner": {"id": 471}, "organization": {"id": 570}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 484}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 348, "owner": {"id": 403}, "organization": {"id": 574}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 390, "owner": {"id": 433}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 462}, "organization": {"id": 563}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 408}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 386, "owner": {"id": 462}, "organization": {"id": 198}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"id": 348, "owner": {"id": 435}, "organization": {"id": 507}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"id": 339, "owner": {"id": 476}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "owner": {"id": 471}, "organization": {"id": 109}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"id": 361, "owner": {"id": 420}, "organization": {"id": 566}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"id": 371, "owner": {"id": 465}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "owner": {"id": 491}, "organization": {"id": 110}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 306, "owner": {"id": 442}, "organization": {"id": 590}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 349, "owner": {"id": 450}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 307, "owner": {"id": 410}, "organization": {"id": 109}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 381, "owner": {"id": 434}, "organization": {"id": 561}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 334, "owner": {"id": 497}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 356, "owner": {"id": 489}, "organization": {"id": 157}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 456}, "organization": {"id": 588}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 386, "owner": {"id": 453}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 275}, "user": {"role": "owner"}}}, "resource": {"id": 360, "owner": {"id": 91}, "organization": {"id": 147}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 306, "owner": {"id": 92}, "organization": {"id": 589}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 82}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 355, "owner": {"id": 7}, "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"id": 304, "owner": {"id": 48}, "organization": {"id": 527}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 316, "owner": {"id": 99}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 78}, "organization": {"id": 108}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 83}, "organization": {"id": 539}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 388, "owner": {"id": 22}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 70}, "organization": {"id": 106}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 363, "owner": {"id": 16}, "organization": {"id": 526}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 74}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 316, "owner": {"id": 18}, "organization": {"id": 168}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 8}, "organization": {"id": 514}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 326, "owner": {"id": 63}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 422}, "organization": {"id": 549}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 428}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 389, "owner": {"id": 417}, "organization": {"id": 596}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "owner": {"id": 468}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "owner": {"id": 476}, "organization": {"id": 540}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 376, "owner": {"id": 486}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 307, "owner": {"id": 454}, "organization": {"id": 538}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 350, "owner": {"id": 459}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 457}, "organization": {"id": 558}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 319, "owner": {"id": 467}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 256}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 463}, "organization": {"id": 144}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 246}, "user": {"role": "owner"}}}, "resource": {"id": 325, "owner": {"id": 433}, "organization": {"id": 511}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 413}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": 366, "owner": {"id": 411}, "organization": {"id": 121}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 421}, "organization": {"id": 544}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "owner": {"id": 417}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 392, "owner": {"id": 442}, "organization": {"id": 196}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 378, "owner": {"id": 472}, "organization": {"id": 508}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 312, "owner": {"id": 412}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 378, "owner": {"id": 487}, "organization": {"id": 131}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 373, "owner": {"id": 434}, "organization": {"id": 579}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 383, "owner": {"id": 497}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 401}, "organization": {"id": 187}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 301, "owner": {"id": 447}, "organization": {"id": 519}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 416}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 209}, "user": {"role": "owner"}}}, "resource": {"id": 321, "owner": {"id": 59}, "organization": {"id": 199}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"id": 302, "owner": {"id": 79}, "organization": {"id": 585}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"id": 334, "owner": {"id": 88}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "owner": {"id": 62}, "organization": {"id": 199}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "owner": {"id": 5}, "organization": {"id": 529}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "owner": {"id": 44}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 19}, "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 397, "owner": {"id": 44}, "organization": {"id": 507}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 56}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 343, "owner": {"id": 62}, "organization": {"id": 169}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 332, "owner": {"id": 9}, "organization": {"id": 586}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 301, "owner": {"id": 58}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 368, "owner": {"id": 52}, "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 322, "owner": {"id": 5}, "organization": {"id": 537}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 311, "owner": {"id": 71}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 458}, "organization": {"id": 572}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 201}, "user": {"role": "owner"}}}, "resource": {"id": 331, "owner": {"id": 404}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "owner": {"id": 489}, "organization": {"id": 574}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 358, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 391, "owner": {"id": 494}, "organization": {"id": 581}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 389, "owner": {"id": 414}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": 359, "owner": {"id": 467}, "organization": {"id": 597}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 336, "owner": {"id": 401}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 346, "owner": {"id": 483}, "organization": {"id": 501}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 370, "owner": {"id": 405}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 215}, "user": {"role": "owner"}}}, "resource": {"id": 373, "owner": {"id": 490}, "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"id": 341, "owner": {"id": 496}, "organization": {"id": 522}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 231}, "user": {"role": "owner"}}}, "resource": {"id": 308, "owner": {"id": 456}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "owner": {"id": 465}, "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "owner": {"id": 482}, "organization": {"id": 501}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 442}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "owner": {"id": 478}, "organization": {"id": 134}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "owner": {"id": 401}, "organization": {"id": 572}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 356, "owner": {"id": 439}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 446}, "organization": {"id": 147}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": 380, "owner": {"id": 426}, "organization": {"id": 524}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 301, "owner": {"id": 418}, "organization": {"id": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 364, "owner": {"id": 485}, "organization": {"id": 120}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 406}, "organization": {"id": 529}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 426}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"id": 320, "owner": {"id": 43}, "organization": {"id": 528}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"id": 397, "owner": {"id": 58}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": null}, "resource": {"id": 348, "owner": {"id": 454}, "organization": {"id": 554}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"id": 304, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": null}, "resource": {"id": 320, "owner": {"id": 418}, "organization": {"id": 561}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"id": 326, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": null}, "resource": {"id": 328, "owner": {"id": 95}, "organization": {"id": 521}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"id": 302, "owner": {"id": 44}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": null}, "resource": {"id": 324, "owner": {"id": 426}, "organization": {"id": 587}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": null}, "resource": {"id": 305, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 485}, "organization": {"id": 575}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"id": 358, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": null}, "resource": {"id": 302, "owner": {"id": 28}, "organization": {"id": 516}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": null}, "resource": {"id": 377, "owner": {"id": 17}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": null}, "resource": {"id": 318, "owner": {"id": 411}, "organization": {"id": 548}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": null}, "resource": {"id": 388, "owner": {"id": 408}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": null}, "resource": {"id": 327, "owner": {"id": 418}, "organization": {"id": 590}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": null}, "resource": {"id": 302, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": null}, "resource": {"id": 345, "owner": {"id": 44}, "organization": {"id": 589}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}, "resource": {"id": 367, "owner": {"id": 5}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": null}, "resource": {"id": 318, "owner": {"id": 413}, "organization": {"id": 566}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"id": 312, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"id": 317, "owner": {"id": 470}, "organization": {"id": 575}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": null}, "resource": {"id": 327, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"id": 315, "owner": {"id": 85}, "organization": {"id": 566}}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": null}, "resource": {"id": 354, "owner": {"id": 81}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": null}, "resource": {"id": 322, "owner": {"id": 449}, "organization": {"id": 507}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": null}, "resource": {"id": 301, "owner": {"id": 481}, "organization": {"id": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": null}, "resource": {"id": 339, "owner": {"id": 446}, "organization": {"id": 597}}}
}

test_scope_VIEW_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": null}, "resource": {"id": 319, "owner": {"id": 479}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 272}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 35}, "organization": {"id": 188}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"id": 311, "owner": {"id": 39}, "organization": {"id": 547}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"id": 356, "owner": {"id": 91}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 377, "owner": {"id": 68}, "organization": {"id": 118}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 385, "owner": {"id": 27}, "organization": {"id": 512}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 37}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": 351, "owner": {"id": 83}, "organization": {"id": 119}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 78}, "organization": {"id": 536}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 350, "owner": {"id": 24}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 346, "owner": {"id": 72}, "organization": {"id": 153}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 393, "owner": {"id": 46}, "organization": {"id": 585}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 44}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 300, "owner": {"id": 62}, "organization": {"id": 118}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"id": 308, "owner": {"id": 78}, "organization": {"id": 592}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 386, "owner": {"id": 73}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"id": 354, "owner": {"id": 401}, "organization": {"id": 526}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"id": 399, "owner": {"id": 447}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 386, "owner": {"id": 444}, "organization": {"id": 539}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 398, "owner": {"id": 464}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 356, "owner": {"id": 471}, "organization": {"id": 595}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 399, "owner": {"id": 412}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 451}, "organization": {"id": 575}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": 379, "owner": {"id": 464}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 370, "owner": {"id": 413}, "organization": {"id": 539}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"id": 389, "owner": {"id": 480}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"id": 346, "owner": {"id": 435}, "organization": {"id": 199}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"id": 389, "owner": {"id": 465}, "organization": {"id": 567}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"id": 372, "owner": {"id": 476}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 300, "owner": {"id": 459}, "organization": {"id": 166}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "owner": {"id": 438}, "organization": {"id": 529}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 313, "owner": {"id": 421}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"id": 347, "owner": {"id": 481}, "organization": {"id": 137}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 331, "owner": {"id": 414}, "organization": {"id": 561}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_SUPERVISOR_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 216}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "owner": {"id": 434}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 377, "owner": {"id": 415}, "organization": {"id": 184}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 479}, "organization": {"id": 583}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_WORKER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 378, "owner": {"id": 425}, "organization": {"id": 126}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 412}, "organization": {"id": 500}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"id": 354, "owner": {"id": 403}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"id": 342, "owner": {"id": 75}, "organization": {"id": 173}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 48}, "organization": {"id": 558}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"id": 334, "owner": {"id": 8}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 385, "owner": {"id": 43}, "organization": {"id": 104}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 344, "owner": {"id": 11}, "organization": {"id": 539}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 41}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"id": 363, "owner": {"id": 5}, "organization": {"id": 154}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 367, "owner": {"id": 81}, "organization": {"id": 520}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"id": 390, "owner": {"id": 14}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 356, "owner": {"id": 45}, "organization": {"id": 117}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"id": 323, "owner": {"id": 53}, "organization": {"id": 597}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 396, "owner": {"id": 65}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 385, "owner": {"id": 61}, "organization": {"id": 189}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 366, "owner": {"id": 19}, "organization": {"id": 512}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 387, "owner": {"id": 4}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"id": 369, "owner": {"id": 428}, "organization": {"id": 570}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"id": 317, "owner": {"id": 419}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "owner": {"id": 489}, "organization": {"id": 505}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 434}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 437}, "organization": {"id": 520}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 345, "owner": {"id": 499}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 326, "owner": {"id": 484}, "organization": {"id": 580}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 341, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"id": 313, "owner": {"id": 487}, "organization": {"id": 549}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 470}, "organization": {"id": 177}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 459}, "organization": {"id": 512}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"id": 310, "owner": {"id": 412}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "owner": {"id": 429}, "organization": {"id": 185}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 109, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "owner": {"id": 444}, "organization": {"id": 535}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 321, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "owner": {"id": 407}, "organization": {"id": 120}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 469}, "organization": {"id": 546}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 373, "owner": {"id": 424}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 332, "owner": {"id": 469}, "organization": {"id": 115}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"id": 348, "owner": {"id": 440}, "organization": {"id": 592}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 334, "owner": {"id": 494}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 334, "owner": {"id": 487}, "organization": {"id": 160}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 459}, "organization": {"id": 569}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"id": 388, "owner": {"id": 464}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"id": 377, "owner": {"id": 44}, "organization": {"id": 148}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 217}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 95}, "organization": {"id": 567}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"id": 328, "owner": {"id": 7}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 367, "owner": {"id": 3}, "organization": {"id": 104}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 38}, "organization": {"id": 578}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 328, "owner": {"id": 99}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 71}, "organization": {"id": 115}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": 388, "owner": {"id": 39}, "organization": {"id": 545}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "owner": {"id": 39}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 39}, "organization": {"id": 114}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 306, "owner": {"id": 36}, "organization": {"id": 541}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 379, "owner": {"id": 89}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 380, "owner": {"id": 40}, "organization": {"id": 102}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 8}, "organization": {"id": 516}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"id": 309, "owner": {"id": 48}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"id": 325, "owner": {"id": 445}, "organization": {"id": 524}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 286}, "user": {"role": "owner"}}}, "resource": {"id": 320, "owner": {"id": 489}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": 315, "owner": {"id": 498}, "organization": {"id": 539}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "owner": {"id": 410}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 305, "owner": {"id": 431}, "organization": {"id": 507}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 310, "owner": {"id": 489}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 398, "owner": {"id": 426}, "organization": {"id": 545}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 448}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 389, "owner": {"id": 407}, "organization": {"id": 570}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 435}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 332, "owner": {"id": 428}, "organization": {"id": 161}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"id": 388, "owner": {"id": 419}, "organization": {"id": 528}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_OWNER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 230}, "user": {"role": "owner"}}}, "resource": {"id": 331, "owner": {"id": 470}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_SAME {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 302, "owner": {"id": 409}, "organization": {"id": 108}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 338, "owner": {"id": 494}, "organization": {"id": 587}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_MAINTAINER_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 440}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"id": 351, "owner": {"id": 450}, "organization": {"id": 137}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "owner": {"id": 422}, "organization": {"id": 569}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": 319, "owner": {"id": 492}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"id": 314, "owner": {"id": 446}, "organization": {"id": 127}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": 344, "owner": {"id": 496}, "organization": {"id": 516}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 394, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 344, "owner": {"id": 434}, "organization": {"id": 166}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": 383, "owner": {"id": 411}, "organization": {"id": 509}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": 316, "owner": {"id": 449}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"id": 357, "owner": {"id": 4}, "organization": {"id": 132}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"id": 351, "owner": {"id": 18}, "organization": {"id": 535}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 64}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "owner": {"id": 29}, "organization": {"id": 137}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "owner": {"id": 31}, "organization": {"id": 509}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 91}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 332, "owner": {"id": 5}, "organization": {"id": 153}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 363, "owner": {"id": 36}, "organization": {"id": 598}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 394, "owner": {"id": 36}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"id": 321, "owner": {"id": 36}, "organization": {"id": 196}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 378, "owner": {"id": 9}, "organization": {"id": 539}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 47}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 94}, "organization": {"id": 127}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 39}, "organization": {"id": 529}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 69}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 412}, "organization": {"id": 557}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 243}, "user": {"role": "owner"}}}, "resource": {"id": 360, "owner": {"id": 475}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 332, "owner": {"id": 412}, "organization": {"id": 560}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "owner": {"id": 466}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "owner": {"id": 462}, "organization": {"id": 510}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 461}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 497}, "organization": {"id": 585}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 307, "owner": {"id": 486}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"id": 352, "owner": {"id": 438}, "organization": {"id": 567}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"id": 331, "owner": {"id": 454}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 226}, "user": {"role": "owner"}}}, "resource": {"id": 376, "owner": {"id": 493}, "organization": {"id": 148}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 427}, "organization": {"id": 572}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 343, "owner": {"id": 463}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 366, "owner": {"id": 479}, "organization": {"id": 103}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 428}, "organization": {"id": 528}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 329, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "owner": {"id": 472}, "organization": {"id": 111}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 320, "owner": {"id": 430}, "organization": {"id": 583}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 303, "owner": {"id": 450}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"id": 319, "owner": {"id": 434}, "organization": {"id": 105}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 415}, "organization": {"id": 575}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 319, "owner": {"id": 452}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 434}, "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 383, "owner": {"id": 421}, "organization": {"id": 535}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"id": 370, "owner": {"id": 461}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"id": 337, "owner": {"id": 30}, "organization": {"id": 127}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"id": 394, "owner": {"id": 90}, "organization": {"id": 593}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"id": 334, "owner": {"id": 89}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "owner": {"id": 12}, "organization": {"id": 117}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": 367, "owner": {"id": 79}, "organization": {"id": 522}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "owner": {"id": 95}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 74}, "organization": {"id": 155}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 303, "owner": {"id": 94}, "organization": {"id": 517}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 50}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 397, "owner": {"id": 68}, "organization": {"id": 159}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": 303, "owner": {"id": 72}, "organization": {"id": 516}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 366, "owner": {"id": 65}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": 335, "owner": {"id": 66}, "organization": {"id": 113}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 325, "owner": {"id": 33}, "organization": {"id": 580}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 320, "owner": {"id": 90}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 290}, "user": {"role": "owner"}}}, "resource": {"id": 377, "owner": {"id": 491}, "organization": {"id": 511}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 483}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"id": 372, "owner": {"id": 470}, "organization": {"id": 572}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 385, "owner": {"id": 489}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 308, "owner": {"id": 492}, "organization": {"id": 503}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "owner": {"id": 457}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 484}, "organization": {"id": 586}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": 391, "owner": {"id": 417}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 374, "owner": {"id": 425}, "organization": {"id": 558}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 333, "owner": {"id": 441}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"id": 329, "owner": {"id": 494}, "organization": {"id": 106}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"id": 362, "owner": {"id": 469}, "organization": {"id": 510}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_OWNER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"id": 342, "owner": {"id": 461}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 316, "owner": {"id": 437}, "organization": {"id": 175}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 358, "owner": {"id": 475}, "organization": {"id": 545}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_MAINTAINER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"id": 327, "owner": {"id": 438}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "owner": {"id": 407}, "organization": {"id": 194}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 310, "owner": {"id": 492}, "organization": {"id": 579}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_SUPERVISOR_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 463}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 345, "owner": {"id": 461}, "organization": {"id": 133}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"id": 389, "owner": {"id": 475}, "organization": {"id": 509}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_WORKER_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 473}, "organization": {"id": null}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_SAME {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 231}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 418}, "organization": {"id": 186}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"id": 314, "owner": {"id": 475}, "organization": {"id": 583}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": 378, "owner": {"id": 406}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": null}, "resource": {"id": 313, "owner": {"id": 84}, "organization": {"id": 563}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": null}, "resource": {"id": 329, "owner": {"id": 83}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}, "resource": {"id": 393, "owner": {"id": 470}, "organization": {"id": 565}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"id": 331, "owner": {"id": 442}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": null}, "resource": {"id": 303, "owner": {"id": 410}, "organization": {"id": 531}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_ADMIN_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": null}, "resource": {"id": 370, "owner": {"id": 493}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": null}, "resource": {"id": 354, "owner": {"id": 77}, "organization": {"id": 550}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": null}, "resource": {"id": 395, "owner": {"id": 66}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"id": 385, "owner": {"id": 456}, "organization": {"id": 532}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": null}, "resource": {"id": 332, "owner": {"id": 490}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": null}, "resource": {"id": 316, "owner": {"id": 450}, "organization": {"id": 507}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_BUSINESS_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": null}, "resource": {"id": 364, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": null}, "resource": {"id": 324, "owner": {"id": 22}, "organization": {"id": 590}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": null}, "resource": {"id": 381, "owner": {"id": 24}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": null}, "resource": {"id": 390, "owner": {"id": 456}, "organization": {"id": 514}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": null}, "resource": {"id": 344, "owner": {"id": 445}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_OTHER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": null}, "resource": {"id": 381, "owner": {"id": 451}, "organization": {"id": 546}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_USER_membership_NONE_resource_org_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"id": 365, "owner": {"id": 430}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": null}, "resource": {"id": 301, "owner": {"id": 53}, "organization": {"id": 526}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"id": 334, "owner": {"id": 78}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": null}, "resource": {"id": 383, "owner": {"id": 416}, "organization": {"id": 548}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": null}, "resource": {"id": 322, "owner": {"id": 427}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}, "resource": {"id": 353, "owner": {"id": 477}, "organization": {"id": 593}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_WORKER_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"id": 352, "owner": {"id": 474}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"id": 355, "owner": {"id": 31}, "organization": {"id": 555}}}
}

test_scope_CREATE_context_SANDBOX_ownership_USER_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": null}, "resource": {"id": 351, "owner": {"id": 63}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": null}, "resource": {"id": 388, "owner": {"id": 472}, "organization": {"id": 503}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": null}, "resource": {"id": 353, "owner": {"id": 495}, "organization": {"id": null}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_OTHER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": null}, "resource": {"id": 395, "owner": {"id": 489}, "organization": {"id": 559}}}
}

test_scope_CREATE_context_SANDBOX_ownership_ORGANIZATION_privilege_NONE_membership_NONE_resource_org_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"id": 341, "owner": {"id": 479}, "organization": {"id": null}}}
}



# cloudstorages_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
## import csv
# import json
# import random
# import sys
# import os
## SAME_ORG = "same"
# OTHER_ORG = "other"
# NONE_ORG = None
## simple_rules = []
# with open(os.path.join(sys.argv[1], 'cloudstorages.csv')) as f:
#     reader = csv.DictReader(f)
#     for row in reader:
#         row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
#         row['limit'] = row['limit'].replace('none', 'None')
#         row['limit'] = row['limit'].replace('true', 'True')
#         found = False
#         for col,val in row.items():
#             if col in ["limit", "method", "url"]:
#                 continue
#             complex_val = [v.strip() for v in val.split(',')]
#             if len(complex_val) > 1:
#                 found = True
#                 for item in complex_val:
#                     new_row = row.copy()
#                     new_row[col] = item
#                     simple_rules.append(new_row)
##         if not found:
#             simple_rules.append(row)
## SCOPES = {rule['scope'] for rule in simple_rules}
# CONTEXTS = ['organization', 'sandbox']
# OWNERSHIPS = ['user', 'none', 'organization']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
## def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == 'admin':
#         return True
##     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or
#         ORG_ROLES.index(membership) <= ORG_ROLES.index(r['membership']), rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
#     num_invalid_rules = 0
#     for r in rules:
#         if r['ownership'] == 'user':
#             if data['resource']['owner']['id'] != data['auth']['user']['id']:
#                 num_invalid_rules += 1
#         if r['ownership'] == 'organization':
#             if data['resource']['organization'].get('id') != data['auth']['organization'].get('id'):
#                 num_invalid_rules += 1
##     return bool(len(rules) - num_invalid_rules)
## def get_data(scope, context, ownership, privilege, membership, resource_org):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#             "organization": {
#                 "id": random.randrange(100,200),
#                 "owner": { "id": random.randrange(200, 300) },
#                 "user": { "role": membership }
#             } if context == 'organization' else None
#         },
#         "resource": {
#             "id": random.randrange(300, 400),
#             "owner": { "id": random.randrange(400, 500) },
#             "organization": {
#                 "id": random.randrange(500,600)
#             }
#         }
#     }
##     user_id = data['auth']['user']['id']
#     if ownership == 'user':
#         data['resource']['owner']['id'] = user_id
#     if resource_org == SAME_ORG:
#         data['resource']['organization']['id'] = data['auth']['organization']['id']
#     if resource_org == NONE_ORG:
#         data['resource']['organization']['id'] = None
##     return data
## def get_name(scope, context, ownership, privilege, membership, resource_org):
#     return (f'test_scope_{scope.replace(":", "_").upper()}_context_{context.upper()}'
#         f'_ownership_{str(ownership).upper()}_privilege_{privilege.upper()}'
#         f'_membership_{str(membership).upper()}_resource_org_{str(resource_org).upper()}')
## with open('cloudstorages_test.gen.rego', 'wt') as f:
#     f.write('package cloudstorages\n\n')
##     for scope in SCOPES:
#         for context in CONTEXTS:
#             for privilege in GROUPS:
#                 for ownership in OWNERSHIPS:
#                     for membership in ORG_ROLES:
#                         for resource_org in [SAME_ORG, OTHER_ORG, NONE_ORG]:
#                             if context == 'sandbox' and membership:
#                                 continue
#                             if context == 'sandbox' and resource_org == SAME_ORG:
#                                 continue
#                             if ownership == 'none' and resource_org == SAME_ORG:
#                                 continue
#                             test_name = get_name(scope, context, ownership, privilege, membership, resource_org)
#                             data = get_data(scope, context, ownership, privilege, membership, resource_org)
#                             result = eval_rule(scope, context, ownership, privilege, membership, data)
##                             f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                                 test_name=test_name, allow='allow' if result else 'not allow',
#                                 data=json.dumps(data)))
##     with open(sys.argv[0]) as this_file:
#         f.write(f'\n\n# {os.path.split(sys.argv[0])[1]}\n')
#         for line in this_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')
##     with open(os.path.join(sys.argv[1], 'cloudstorages.csv')) as rego_file:
#         f.write(f'\n\n# cloudstorages.csv\n')
#         for line in rego_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')


# cloudstorages.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# create,Storage,Sandbox,N/A,,POST,/cloudstorages,User,N/A
# create,Storage,Organization,N/A,,POST,/cloudstorages,User,Maintainer
# list,Storage,Sandbox,N/A,filter(organization=None),GET,/cloudstorages,None,N/A
# list,Storage,Organization,N/A,filter(organization),GET,/cloudstorages,None,Worker
# view,Storage,Sandbox,None,,GET,/cloudstorages/{id},Admin,N/A
# view,Storage,N/A,User,,GET,/cloudstorages/{id},None,N/A
# view,Storage,Organization,Organization,,GET,/cloudstorages/{id},User,Supervisor
# update,Storage,Sandbox,None,,PATCH,/cloudstorages/{id},Admin,N/A
# update,Storage,N/A,User,,PATCH,/cloudstorages/{id},Worker,N/A
# update,Storage,Organization,Organization,,PATCH,/cloudstorages/{id},User,Maintainer
# delete,Storage,Sandbox,None,,DELETE,/cloudstorages/{id},Admin,N/A
# delete,Storage,N/A,User,,DELETE,/cloudstorages/{id},Worker,N/A
# delete,Storage,Organization,Organization,,DELETE,/cloudstorages/{id},User,Maintainer
# list:content,Storage,Sandbox,None,,GET,/cloudstorages/{id}/content,Admin,N/A
# list:content,Storage,N/A,User,,GET,/cloudstorages/{id}/content,None,N/A
# list:content,Storage,Organization,Organization,,GET,/cloudstorages/{id}/content,User,Supervisor