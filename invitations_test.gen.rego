package invitations

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 412}, "accepted": false, "role": "owner", "organization": {"id": 140}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 493}, "accepted": false, "role": "maintainer", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 57}, "invitee": {"id": 474}, "accepted": false, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 33}, "invitee": {"id": 435}, "accepted": false, "role": "worker", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 67}, "invitee": {"id": 497}, "accepted": true, "role": "owner", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 66}, "invitee": {"id": 415}, "accepted": false, "role": "maintainer", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 13}, "invitee": {"id": 466}, "accepted": true, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 15}, "invitee": {"id": 406}, "accepted": false, "role": "worker", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 12}, "invitee": {"id": 458}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 404}, "accepted": true, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 461}, "accepted": true, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 0}, "invitee": {"id": 438}, "accepted": true, "role": "worker", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 469}, "accepted": false, "role": "owner", "organization": {"id": 175}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 25}, "invitee": {"id": 422}, "accepted": false, "role": "maintainer", "organization": {"id": 162}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 4}, "invitee": {"id": 456}, "accepted": false, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 17}, "invitee": {"id": 431}, "accepted": false, "role": "worker", "organization": {"id": 150}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 82}, "invitee": {"id": 423}, "accepted": true, "role": "owner", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 44}, "invitee": {"id": 464}, "accepted": true, "role": "maintainer", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 53}, "invitee": {"id": 401}, "accepted": true, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 445}, "accepted": false, "role": "worker", "organization": {"id": 177}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 430}, "accepted": true, "role": "owner", "organization": {"id": 173}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 29}, "invitee": {"id": 490}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 15}, "invitee": {"id": 496}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 78}, "invitee": {"id": 449}, "accepted": false, "role": "worker", "organization": {"id": 195}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 41}, "invitee": {"id": 497}, "accepted": false, "role": "owner", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 470}, "accepted": false, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 54}, "invitee": {"id": 436}, "accepted": true, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 44}, "invitee": {"id": 479}, "accepted": false, "role": "worker", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 65}, "invitee": {"id": 427}, "accepted": false, "role": "owner", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 28}, "invitee": {"id": 459}, "accepted": false, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 421}, "accepted": true, "role": "supervisor", "organization": {"id": 157}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 458}, "accepted": false, "role": "worker", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 43}, "invitee": {"id": 447}, "accepted": false, "role": "owner", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 43}, "invitee": {"id": 433}, "accepted": false, "role": "maintainer", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 25}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 451}, "accepted": false, "role": "worker", "organization": {"id": 175}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 78}, "invitee": {"id": 484}, "accepted": true, "role": "owner", "organization": {"id": 116}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 87}, "invitee": {"id": 415}, "accepted": false, "role": "maintainer", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 423}, "accepted": true, "role": "supervisor", "organization": {"id": 198}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 38}, "invitee": {"id": 494}, "accepted": true, "role": "worker", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 91}, "invitee": {"id": 427}, "accepted": false, "role": "owner", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 7}, "invitee": {"id": 463}, "accepted": false, "role": "maintainer", "organization": {"id": 167}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 471}, "accepted": true, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 445}, "accepted": false, "role": "worker", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 81}, "invitee": {"id": 423}, "accepted": true, "role": "owner", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 24}, "invitee": {"id": 469}, "accepted": false, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 41}, "invitee": {"id": 416}, "accepted": false, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 5}, "invitee": {"id": 488}, "accepted": false, "role": "worker", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 84}, "invitee": {"id": 402}, "accepted": false, "role": "owner", "organization": {"id": 127}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 82}, "invitee": {"id": 452}, "accepted": false, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 77}, "invitee": {"id": 403}, "accepted": true, "role": "supervisor", "organization": {"id": 128}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 41}, "invitee": {"id": 405}, "accepted": true, "role": "worker", "organization": {"id": 155}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 86}, "invitee": {"id": 491}, "accepted": true, "role": "owner", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 17}, "invitee": {"id": 453}, "accepted": false, "role": "maintainer", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 3}, "invitee": {"id": 400}, "accepted": true, "role": "supervisor", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 29}, "invitee": {"id": 446}, "accepted": true, "role": "worker", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 4}, "invitee": {"id": 453}, "accepted": false, "role": "owner", "organization": {"id": 179}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 86}, "invitee": {"id": 470}, "accepted": true, "role": "maintainer", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 86}, "invitee": {"id": 412}, "accepted": false, "role": "supervisor", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 429}, "accepted": true, "role": "worker", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 488}, "accepted": false, "role": "owner", "organization": {"id": 146}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 80}, "invitee": {"id": 450}, "accepted": true, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 495}, "accepted": true, "role": "supervisor", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 34}, "invitee": {"id": 473}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 37}, "invitee": {"id": 492}, "accepted": true, "role": "owner", "organization": {"id": 141}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 99}, "invitee": {"id": 402}, "accepted": false, "role": "maintainer", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 19}, "invitee": {"id": 439}, "accepted": false, "role": "supervisor", "organization": {"id": 124}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 465}, "accepted": true, "role": "worker", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 417}, "accepted": true, "role": "owner", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 455}, "accepted": true, "role": "maintainer", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 420}, "accepted": true, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 463}, "accepted": true, "role": "worker", "organization": {"id": 171}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 15}, "invitee": {"id": 404}, "accepted": false, "role": "owner", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 67}, "invitee": {"id": 441}, "accepted": false, "role": "maintainer", "organization": {"id": 176}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 5}, "invitee": {"id": 466}, "accepted": true, "role": "supervisor", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 68}, "invitee": {"id": 428}, "accepted": true, "role": "worker", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 87}, "invitee": {"id": 462}, "accepted": true, "role": "owner", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 66}, "invitee": {"id": 417}, "accepted": false, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 70}, "invitee": {"id": 477}, "accepted": true, "role": "supervisor", "organization": {"id": 167}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 35}, "invitee": {"id": 436}, "accepted": false, "role": "worker", "organization": {"id": 194}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 7}, "accepted": true, "role": "owner", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 92}, "accepted": true, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 37}, "accepted": false, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 78}, "accepted": true, "role": "worker", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 46}, "accepted": false, "role": "owner", "organization": {"id": 107}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 71}, "accepted": true, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 88}, "accepted": true, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 32}, "accepted": false, "role": "worker", "organization": {"id": 127}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 68}, "accepted": true, "role": "owner", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 72}, "accepted": true, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 7}, "accepted": false, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 31}, "accepted": false, "role": "worker", "organization": {"id": 180}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 348}, "invitee": {"id": 82}, "accepted": false, "role": "owner", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 10}, "accepted": true, "role": "maintainer", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 42}, "accepted": true, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 33}, "accepted": true, "role": "worker", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 51}, "accepted": true, "role": "owner", "organization": {"id": 179}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 2}, "accepted": false, "role": "maintainer", "organization": {"id": 147}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 350}, "invitee": {"id": 62}, "accepted": true, "role": "supervisor", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 329}, "invitee": {"id": 82}, "accepted": false, "role": "worker", "organization": {"id": 136}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 28}, "accepted": false, "role": "owner", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 309}, "invitee": {"id": 65}, "accepted": false, "role": "maintainer", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 55}, "accepted": false, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 352}, "invitee": {"id": 52}, "accepted": true, "role": "worker", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 16}, "accepted": true, "role": "owner", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 68}, "accepted": true, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 51}, "accepted": true, "role": "supervisor", "organization": {"id": 106}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 398}, "invitee": {"id": 13}, "accepted": true, "role": "worker", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 56}, "accepted": true, "role": "owner", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 396}, "invitee": {"id": 93}, "accepted": false, "role": "maintainer", "organization": {"id": 175}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 47}, "accepted": true, "role": "supervisor", "organization": {"id": 183}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 14}, "accepted": true, "role": "worker", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 84}, "accepted": false, "role": "owner", "organization": {"id": 134}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 357}, "invitee": {"id": 94}, "accepted": true, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 356}, "invitee": {"id": 95}, "accepted": false, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 30}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 54}, "accepted": false, "role": "owner", "organization": {"id": 197}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 390}, "invitee": {"id": 1}, "accepted": false, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 300}, "invitee": {"id": 25}, "accepted": false, "role": "supervisor", "organization": {"id": 136}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 77}, "accepted": true, "role": "worker", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 393}, "invitee": {"id": 52}, "accepted": true, "role": "owner", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 51}, "accepted": true, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 348}, "invitee": {"id": 41}, "accepted": true, "role": "supervisor", "organization": {"id": 132}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 53}, "accepted": false, "role": "worker", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 324}, "invitee": {"id": 90}, "accepted": true, "role": "owner", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 74}, "accepted": true, "role": "maintainer", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 10}, "accepted": true, "role": "supervisor", "organization": {"id": 128}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 15}, "accepted": false, "role": "worker", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 51}, "accepted": true, "role": "owner", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 15}, "accepted": false, "role": "maintainer", "organization": {"id": 185}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 346}, "invitee": {"id": 92}, "accepted": false, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 32}, "accepted": false, "role": "worker", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 36}, "accepted": true, "role": "owner", "organization": {"id": 162}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 4}, "accepted": true, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 98}, "accepted": true, "role": "supervisor", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 309}, "invitee": {"id": 15}, "accepted": false, "role": "worker", "organization": {"id": 185}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 94}, "accepted": true, "role": "owner", "organization": {"id": 180}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 54}, "accepted": true, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 70}, "accepted": false, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 27}, "accepted": true, "role": "worker", "organization": {"id": 136}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 0}, "accepted": false, "role": "owner", "organization": {"id": 195}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 28}, "accepted": false, "role": "maintainer", "organization": {"id": 108}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 94}, "accepted": true, "role": "supervisor", "organization": {"id": 132}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 350}, "invitee": {"id": 90}, "accepted": true, "role": "worker", "organization": {"id": 167}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 31}, "accepted": false, "role": "owner", "organization": {"id": 102}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 57}, "accepted": true, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 45}, "accepted": true, "role": "supervisor", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 68}, "accepted": true, "role": "worker", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 352}, "invitee": {"id": 15}, "accepted": false, "role": "owner", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 380}, "invitee": {"id": 10}, "accepted": true, "role": "maintainer", "organization": {"id": 157}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 31}, "accepted": true, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 67}, "accepted": true, "role": "worker", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 79}, "accepted": true, "role": "owner", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 313}, "invitee": {"id": 42}, "accepted": true, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 339}, "invitee": {"id": 89}, "accepted": false, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 332}, "invitee": {"id": 66}, "accepted": false, "role": "worker", "organization": {"id": 177}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 339}, "invitee": {"id": 59}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 399}, "invitee": {"id": 37}, "accepted": true, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 97}, "accepted": true, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 11}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 428}, "accepted": true, "role": "owner", "organization": {"id": 100}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 425}, "accepted": true, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 375}, "invitee": {"id": 443}, "accepted": false, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 438}, "accepted": false, "role": "worker", "organization": {"id": 123}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 476}, "accepted": true, "role": "owner", "organization": {"id": 116}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 407}, "accepted": true, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 400}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 482}, "accepted": true, "role": "worker", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 410}, "accepted": false, "role": "owner", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 448}, "accepted": true, "role": "maintainer", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 492}, "accepted": false, "role": "supervisor", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 401}, "accepted": true, "role": "worker", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 377}, "invitee": {"id": 488}, "accepted": true, "role": "owner", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 447}, "accepted": false, "role": "maintainer", "organization": {"id": 171}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 460}, "accepted": true, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 439}, "accepted": false, "role": "worker", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 437}, "accepted": true, "role": "owner", "organization": {"id": 168}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 423}, "accepted": true, "role": "maintainer", "organization": {"id": 148}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 408}, "accepted": true, "role": "supervisor", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 428}, "accepted": true, "role": "worker", "organization": {"id": 146}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 485}, "accepted": true, "role": "owner", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 444}, "accepted": false, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 438}, "accepted": true, "role": "supervisor", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 383}, "invitee": {"id": 482}, "accepted": true, "role": "worker", "organization": {"id": 133}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 382}, "invitee": {"id": 484}, "accepted": false, "role": "owner", "organization": {"id": 190}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 477}, "accepted": false, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 470}, "accepted": true, "role": "supervisor", "organization": {"id": 172}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 402}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 132}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 313}, "invitee": {"id": 470}, "accepted": false, "role": "maintainer", "organization": {"id": 172}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 456}, "accepted": true, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 427}, "accepted": false, "role": "worker", "organization": {"id": 167}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 324}, "invitee": {"id": 422}, "accepted": false, "role": "owner", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 356}, "invitee": {"id": 464}, "accepted": false, "role": "maintainer", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 421}, "accepted": true, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 493}, "accepted": true, "role": "worker", "organization": {"id": 150}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 475}, "accepted": false, "role": "owner", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 410}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 325}, "invitee": {"id": 444}, "accepted": true, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 381}, "invitee": {"id": 488}, "accepted": false, "role": "worker", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 399}, "invitee": {"id": 412}, "accepted": true, "role": "owner", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 429}, "accepted": false, "role": "maintainer", "organization": {"id": 149}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 432}, "accepted": true, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 466}, "accepted": false, "role": "worker", "organization": {"id": 143}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 430}, "accepted": false, "role": "owner", "organization": {"id": 157}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 451}, "accepted": false, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 403}, "accepted": true, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 420}, "accepted": true, "role": "worker", "organization": {"id": 173}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 484}, "accepted": true, "role": "owner", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 439}, "accepted": false, "role": "maintainer", "organization": {"id": 115}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 459}, "accepted": false, "role": "supervisor", "organization": {"id": 143}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 411}, "accepted": false, "role": "worker", "organization": {"id": 194}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 437}, "accepted": true, "role": "owner", "organization": {"id": 189}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 499}, "accepted": true, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 476}, "accepted": false, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 399}, "invitee": {"id": 408}, "accepted": true, "role": "worker", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 330}, "invitee": {"id": 450}, "accepted": true, "role": "owner", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 444}, "accepted": true, "role": "maintainer", "organization": {"id": 141}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 495}, "accepted": false, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 357}, "invitee": {"id": 413}, "accepted": false, "role": "worker", "organization": {"id": 141}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 410}, "accepted": false, "role": "owner", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 442}, "accepted": true, "role": "maintainer", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 431}, "accepted": true, "role": "supervisor", "organization": {"id": 198}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 466}, "accepted": true, "role": "worker", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 437}, "accepted": true, "role": "owner", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 455}, "accepted": true, "role": "maintainer", "organization": {"id": 115}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 484}, "accepted": true, "role": "supervisor", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 437}, "accepted": true, "role": "worker", "organization": {"id": 157}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 485}, "accepted": true, "role": "owner", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 460}, "accepted": false, "role": "maintainer", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 481}, "accepted": false, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 476}, "accepted": true, "role": "worker", "organization": {"id": 140}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 422}, "accepted": true, "role": "owner", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 429}, "accepted": true, "role": "maintainer", "organization": {"id": 190}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 494}, "accepted": false, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 481}, "accepted": false, "role": "worker", "organization": {"id": 143}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 449}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 465}, "accepted": true, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 380}, "invitee": {"id": 416}, "accepted": false, "role": "supervisor", "organization": {"id": 115}}}
}

test_scope_ACCEPT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 496}, "accepted": true, "role": "worker", "organization": {"id": 167}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 485}, "accepted": false, "role": "owner", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 0}, "invitee": {"id": 447}, "accepted": false, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 58}, "invitee": {"id": 410}, "accepted": true, "role": "supervisor", "organization": {"id": 191}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 24}, "invitee": {"id": 440}, "accepted": false, "role": "worker", "organization": {"id": 158}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 63}, "invitee": {"id": 466}, "accepted": true, "role": "owner", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 442}, "accepted": false, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 57}, "invitee": {"id": 499}, "accepted": false, "role": "supervisor", "organization": {"id": 166}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 24}, "invitee": {"id": 499}, "accepted": true, "role": "worker", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 71}, "invitee": {"id": 421}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 38}, "invitee": {"id": 497}, "accepted": false, "role": "maintainer", "organization": {"id": 145}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 43}, "invitee": {"id": 419}, "accepted": false, "role": "supervisor", "organization": {"id": 151}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 475}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 61}, "invitee": {"id": 408}, "accepted": false, "role": "owner", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 475}, "accepted": false, "role": "maintainer", "organization": {"id": 146}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 30}, "invitee": {"id": 416}, "accepted": true, "role": "supervisor", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 98}, "invitee": {"id": 421}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 61}, "invitee": {"id": 464}, "accepted": true, "role": "owner", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 63}, "invitee": {"id": 423}, "accepted": true, "role": "maintainer", "organization": {"id": 107}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 435}, "accepted": true, "role": "supervisor", "organization": {"id": 185}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 52}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 52}, "invitee": {"id": 419}, "accepted": false, "role": "worker", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 49}, "invitee": {"id": 432}, "accepted": true, "role": "owner", "organization": {"id": 146}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 23}, "invitee": {"id": 479}, "accepted": false, "role": "maintainer", "organization": {"id": 173}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 46}, "invitee": {"id": 488}, "accepted": false, "role": "supervisor", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 80}, "invitee": {"id": 489}, "accepted": true, "role": "worker", "organization": {"id": 154}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 33}, "invitee": {"id": 456}, "accepted": true, "role": "owner", "organization": {"id": 190}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 40}, "invitee": {"id": 439}, "accepted": true, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 449}, "accepted": false, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 55}, "invitee": {"id": 470}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 66}, "invitee": {"id": 466}, "accepted": false, "role": "owner", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 28}, "invitee": {"id": 490}, "accepted": true, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 39}, "invitee": {"id": 447}, "accepted": false, "role": "supervisor", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 419}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 71}, "invitee": {"id": 490}, "accepted": true, "role": "owner", "organization": {"id": 132}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 75}, "invitee": {"id": 432}, "accepted": false, "role": "maintainer", "organization": {"id": 147}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 439}, "accepted": false, "role": "supervisor", "organization": {"id": 157}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 78}, "invitee": {"id": 472}, "accepted": false, "role": "worker", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 469}, "accepted": false, "role": "owner", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 407}, "accepted": true, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 96}, "invitee": {"id": 401}, "accepted": false, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 22}, "invitee": {"id": 419}, "accepted": false, "role": "worker", "organization": {"id": 136}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 96}, "invitee": {"id": 429}, "accepted": true, "role": "owner", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 56}, "invitee": {"id": 482}, "accepted": true, "role": "maintainer", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 463}, "accepted": true, "role": "supervisor", "organization": {"id": 123}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 74}, "invitee": {"id": 408}, "accepted": false, "role": "worker", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 50}, "invitee": {"id": 408}, "accepted": true, "role": "owner", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 39}, "invitee": {"id": 423}, "accepted": true, "role": "maintainer", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 98}, "invitee": {"id": 428}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 95}, "invitee": {"id": 401}, "accepted": true, "role": "worker", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 7}, "invitee": {"id": 410}, "accepted": false, "role": "owner", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 21}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 21}, "invitee": {"id": 424}, "accepted": false, "role": "maintainer", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 96}, "invitee": {"id": 426}, "accepted": false, "role": "supervisor", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 7}, "invitee": {"id": 402}, "accepted": true, "role": "worker", "organization": {"id": 158}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 13}, "invitee": {"id": 488}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 76}, "invitee": {"id": 468}, "accepted": true, "role": "maintainer", "organization": {"id": 100}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 64}, "invitee": {"id": 496}, "accepted": false, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 20}, "invitee": {"id": 486}, "accepted": false, "role": "worker", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 11}, "invitee": {"id": 442}, "accepted": false, "role": "owner", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 63}, "invitee": {"id": 499}, "accepted": true, "role": "maintainer", "organization": {"id": 188}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 71}, "invitee": {"id": 482}, "accepted": false, "role": "supervisor", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 18}, "invitee": {"id": 426}, "accepted": true, "role": "worker", "organization": {"id": 115}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 65}, "invitee": {"id": 476}, "accepted": true, "role": "owner", "organization": {"id": 195}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 97}, "invitee": {"id": 479}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 15}, "invitee": {"id": 419}, "accepted": false, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 15}, "invitee": {"id": 442}, "accepted": false, "role": "worker", "organization": {"id": 131}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 42}, "invitee": {"id": 401}, "accepted": false, "role": "owner", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 39}, "invitee": {"id": 412}, "accepted": false, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 59}, "invitee": {"id": 473}, "accepted": false, "role": "supervisor", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 49}, "invitee": {"id": 492}, "accepted": true, "role": "worker", "organization": {"id": 194}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 46}, "invitee": {"id": 459}, "accepted": true, "role": "owner", "organization": {"id": 144}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 98}, "invitee": {"id": 447}, "accepted": true, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 13}, "invitee": {"id": 441}, "accepted": false, "role": "supervisor", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 482}, "accepted": false, "role": "worker", "organization": {"id": 110}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 407}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 17}, "invitee": {"id": 455}, "accepted": false, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 26}, "invitee": {"id": 489}, "accepted": false, "role": "supervisor", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 18}, "invitee": {"id": 498}, "accepted": true, "role": "worker", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 67}, "invitee": {"id": 400}, "accepted": true, "role": "owner", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 429}, "accepted": false, "role": "maintainer", "organization": {"id": 107}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 64}, "invitee": {"id": 467}, "accepted": true, "role": "supervisor", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 91}, "invitee": {"id": 414}, "accepted": false, "role": "worker", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 305}, "invitee": {"id": 61}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 41}, "accepted": true, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 79}, "accepted": false, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 59}, "accepted": true, "role": "worker", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 6}, "accepted": true, "role": "owner", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 0}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 356}, "invitee": {"id": 10}, "accepted": true, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 390}, "invitee": {"id": 54}, "accepted": true, "role": "worker", "organization": {"id": 120}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 24}, "accepted": true, "role": "owner", "organization": {"id": 151}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 15}, "accepted": false, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 24}, "accepted": false, "role": "supervisor", "organization": {"id": 166}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 34}, "accepted": true, "role": "worker", "organization": {"id": 180}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 84}, "accepted": true, "role": "owner", "organization": {"id": 155}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 16}, "accepted": false, "role": "maintainer", "organization": {"id": 112}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 60}, "accepted": false, "role": "supervisor", "organization": {"id": 172}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 308}, "invitee": {"id": 72}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 1}, "accepted": true, "role": "owner", "organization": {"id": 148}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 94}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 43}, "accepted": false, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 2}, "accepted": false, "role": "worker", "organization": {"id": 113}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 44}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 51}, "accepted": true, "role": "maintainer", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 391}, "invitee": {"id": 48}, "accepted": false, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 59}, "accepted": true, "role": "worker", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 356}, "invitee": {"id": 7}, "accepted": true, "role": "owner", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 360}, "invitee": {"id": 25}, "accepted": true, "role": "maintainer", "organization": {"id": 118}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 74}, "accepted": true, "role": "supervisor", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 17}, "accepted": true, "role": "worker", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 383}, "invitee": {"id": 4}, "accepted": true, "role": "owner", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 91}, "accepted": false, "role": "maintainer", "organization": {"id": 145}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 28}, "accepted": true, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 312}, "invitee": {"id": 2}, "accepted": false, "role": "worker", "organization": {"id": 126}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 36}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 13}, "accepted": false, "role": "maintainer", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 361}, "invitee": {"id": 38}, "accepted": true, "role": "supervisor", "organization": {"id": 197}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 86}, "accepted": false, "role": "worker", "organization": {"id": 104}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 374}, "invitee": {"id": 83}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 24}, "accepted": false, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 7}, "accepted": false, "role": "supervisor", "organization": {"id": 183}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 317}, "invitee": {"id": 19}, "accepted": true, "role": "worker", "organization": {"id": 194}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 20}, "accepted": false, "role": "owner", "organization": {"id": 126}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 35}, "accepted": true, "role": "maintainer", "organization": {"id": 193}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 98}, "accepted": true, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 395}, "invitee": {"id": 0}, "accepted": true, "role": "worker", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 383}, "invitee": {"id": 77}, "accepted": false, "role": "owner", "organization": {"id": 158}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 354}, "invitee": {"id": 16}, "accepted": false, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 40}, "accepted": true, "role": "supervisor", "organization": {"id": 186}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 68}, "accepted": true, "role": "worker", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 12}, "accepted": false, "role": "owner", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 42}, "accepted": true, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 52}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 382}, "invitee": {"id": 52}, "accepted": false, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 88}, "accepted": false, "role": "worker", "organization": {"id": 148}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 64}, "accepted": true, "role": "owner", "organization": {"id": 192}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 86}, "accepted": true, "role": "maintainer", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 96}, "accepted": true, "role": "supervisor", "organization": {"id": 192}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 72}, "accepted": true, "role": "worker", "organization": {"id": 134}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 398}, "invitee": {"id": 10}, "accepted": true, "role": "owner", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 356}, "invitee": {"id": 63}, "accepted": false, "role": "maintainer", "organization": {"id": 198}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 83}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 59}, "accepted": false, "role": "worker", "organization": {"id": 195}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 309}, "invitee": {"id": 31}, "accepted": false, "role": "owner", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 22}, "accepted": true, "role": "maintainer", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 65}, "accepted": false, "role": "supervisor", "organization": {"id": 153}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 81}, "accepted": false, "role": "worker", "organization": {"id": 117}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 374}, "invitee": {"id": 91}, "accepted": true, "role": "owner", "organization": {"id": 113}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 35}, "accepted": false, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 2}, "accepted": true, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 4}, "accepted": false, "role": "worker", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 64}, "accepted": true, "role": "owner", "organization": {"id": 178}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 16}, "accepted": false, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 391}, "invitee": {"id": 73}, "accepted": false, "role": "supervisor", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 35}, "accepted": true, "role": "worker", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 55}, "accepted": false, "role": "owner", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 74}, "accepted": true, "role": "maintainer", "organization": {"id": 143}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 41}, "accepted": false, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 60}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 5}, "accepted": true, "role": "owner", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 0}, "accepted": true, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 95}, "accepted": true, "role": "supervisor", "organization": {"id": 197}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 95}, "accepted": true, "role": "worker", "organization": {"id": 189}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 463}, "accepted": false, "role": "owner", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 308}, "invitee": {"id": 402}, "accepted": false, "role": "maintainer", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 20}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 438}, "accepted": true, "role": "supervisor", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 492}, "accepted": false, "role": "worker", "organization": {"id": 196}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 403}, "accepted": true, "role": "owner", "organization": {"id": 185}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 485}, "accepted": false, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 465}, "accepted": true, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 365}, "invitee": {"id": 418}, "accepted": true, "role": "worker", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 423}, "accepted": true, "role": "owner", "organization": {"id": 189}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 396}, "invitee": {"id": 486}, "accepted": true, "role": "maintainer", "organization": {"id": 158}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 358}, "invitee": {"id": 464}, "accepted": false, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 408}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 437}, "accepted": true, "role": "owner", "organization": {"id": 137}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 462}, "accepted": false, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 441}, "accepted": false, "role": "supervisor", "organization": {"id": 198}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "accept", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 334}, "invitee": {"id": 426}, "accepted": false, "role": "worker", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 315}, "invitee": {"id": 439}, "accepted": true, "role": "owner", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 346}, "invitee": {"id": 449}, "accepted": false, "role": "maintainer", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 434}, "accepted": false, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 358}, "invitee": {"id": 472}, "accepted": true, "role": "worker", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 490}, "accepted": true, "role": "owner", "organization": {"id": 103}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 372}, "invitee": {"id": 483}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 441}, "accepted": true, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 435}, "accepted": true, "role": "worker", "organization": {"id": 124}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 412}, "accepted": true, "role": "owner", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 464}, "accepted": true, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 498}, "accepted": true, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 109, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 421}, "accepted": false, "role": "worker", "organization": {"id": 109}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 406}, "accepted": false, "role": "owner", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 329}, "invitee": {"id": 440}, "accepted": true, "role": "maintainer", "organization": {"id": 171}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 477}, "accepted": false, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 402}, "accepted": true, "role": "worker", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 475}, "accepted": false, "role": "owner", "organization": {"id": 156}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 437}, "accepted": false, "role": "maintainer", "organization": {"id": 125}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 352}, "invitee": {"id": 412}, "accepted": false, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 310}, "invitee": {"id": 467}, "accepted": true, "role": "worker", "organization": {"id": 170}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 421}, "accepted": true, "role": "owner", "organization": {"id": 191}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 436}, "accepted": false, "role": "maintainer", "organization": {"id": 124}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 301}, "invitee": {"id": 489}, "accepted": true, "role": "supervisor", "organization": {"id": 172}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 439}, "accepted": true, "role": "worker", "organization": {"id": 174}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 482}, "accepted": false, "role": "owner", "organization": {"id": 150}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 421}, "accepted": false, "role": "maintainer", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 442}, "accepted": false, "role": "supervisor", "organization": {"id": 106}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 352}, "invitee": {"id": 414}, "accepted": true, "role": "worker", "organization": {"id": 199}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 448}, "accepted": true, "role": "owner", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 436}, "accepted": false, "role": "maintainer", "organization": {"id": 165}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 452}, "accepted": true, "role": "supervisor", "organization": {"id": 119}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 430}, "accepted": true, "role": "worker", "organization": {"id": 169}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 421}, "accepted": false, "role": "owner", "organization": {"id": 165}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 391}, "invitee": {"id": 424}, "accepted": false, "role": "maintainer", "organization": {"id": 132}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 431}, "accepted": true, "role": "supervisor", "organization": {"id": 100}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 445}, "accepted": false, "role": "worker", "organization": {"id": 192}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 356}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 442}, "accepted": false, "role": "maintainer", "organization": {"id": 163}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 460}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 481}, "accepted": true, "role": "worker", "organization": {"id": 160}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 348}, "invitee": {"id": 429}, "accepted": false, "role": "owner", "organization": {"id": 121}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 390}, "invitee": {"id": 435}, "accepted": true, "role": "maintainer", "organization": {"id": 133}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 348}, "invitee": {"id": 403}, "accepted": false, "role": "supervisor", "organization": {"id": 101}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 435}, "accepted": true, "role": "worker", "organization": {"id": 141}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 421}, "accepted": false, "role": "owner", "organization": {"id": 175}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 405}, "accepted": true, "role": "maintainer", "organization": {"id": 144}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 19, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 401}, "accepted": true, "role": "supervisor", "organization": {"id": 124}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 464}, "accepted": false, "role": "worker", "organization": {"id": 187}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 112}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 406}, "accepted": false, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 402}, "accepted": true, "role": "supervisor", "organization": {"id": 116}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 313}, "invitee": {"id": 459}, "accepted": true, "role": "worker", "organization": {"id": 134}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 432}, "accepted": true, "role": "owner", "organization": {"id": 129}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 455}, "accepted": true, "role": "maintainer", "organization": {"id": 139}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 460}, "accepted": false, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 456}, "accepted": true, "role": "worker", "organization": {"id": 162}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 191}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 464}, "accepted": false, "role": "maintainer", "organization": {"id": 133}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 443}, "accepted": true, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 470}, "accepted": false, "role": "worker", "organization": {"id": 172}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 441}, "accepted": true, "role": "owner", "organization": {"id": 164}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 424}, "accepted": true, "role": "maintainer", "organization": {"id": 105}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 435}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_ACCEPT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "accept", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 344}, "invitee": {"id": 497}, "accepted": false, "role": "worker", "organization": {"id": 142}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 436}, "accepted": true, "role": "owner", "organization": {"id": 116}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 63}, "invitee": {"id": 432}, "accepted": false, "role": "maintainer", "organization": {"id": 135}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 16}, "invitee": {"id": 481}, "accepted": true, "role": "supervisor", "organization": {"id": 109}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 78}, "invitee": {"id": 401}, "accepted": false, "role": "worker", "organization": {"id": 137}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 472}, "accepted": false, "role": "owner", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 93}, "invitee": {"id": 496}, "accepted": true, "role": "maintainer", "organization": {"id": 153}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 454}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 38}, "invitee": {"id": 449}, "accepted": true, "role": "worker", "organization": {"id": 132}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 483}, "accepted": false, "role": "owner", "organization": {"id": 193}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 61}, "invitee": {"id": 422}, "accepted": false, "role": "maintainer", "organization": {"id": 135}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 478}, "accepted": true, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 42}, "invitee": {"id": 405}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 93}, "invitee": {"id": 466}, "accepted": false, "role": "owner", "organization": {"id": 144}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 45}, "invitee": {"id": 462}, "accepted": true, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 75}, "invitee": {"id": 464}, "accepted": true, "role": "supervisor", "organization": {"id": 163}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 35}, "invitee": {"id": 467}, "accepted": true, "role": "worker", "organization": {"id": 106}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 446}, "accepted": false, "role": "owner", "organization": {"id": 128}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 51}, "invitee": {"id": 425}, "accepted": false, "role": "maintainer", "organization": {"id": 141}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 429}, "accepted": false, "role": "supervisor", "organization": {"id": 156}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 88}, "invitee": {"id": 459}, "accepted": false, "role": "worker", "organization": {"id": 138}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 53}, "invitee": {"id": 425}, "accepted": false, "role": "owner", "organization": {"id": 123}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 60}, "invitee": {"id": 473}, "accepted": true, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 46}, "invitee": {"id": 490}, "accepted": true, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 99}, "invitee": {"id": 444}, "accepted": true, "role": "worker", "organization": {"id": 184}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 40}, "invitee": {"id": 413}, "accepted": true, "role": "owner", "organization": {"id": 132}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 39}, "invitee": {"id": 434}, "accepted": true, "role": "maintainer", "organization": {"id": 103}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 416}, "accepted": true, "role": "worker", "organization": {"id": 114}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 421}, "accepted": false, "role": "owner", "organization": {"id": 134}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 433}, "accepted": true, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 42}, "invitee": {"id": 430}, "accepted": true, "role": "supervisor", "organization": {"id": 118}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 65}, "invitee": {"id": 470}, "accepted": false, "role": "worker", "organization": {"id": 175}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 1}, "invitee": {"id": 489}, "accepted": true, "role": "owner", "organization": {"id": 166}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 2}, "invitee": {"id": 452}, "accepted": false, "role": "maintainer", "organization": {"id": 117}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 91}, "invitee": {"id": 456}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 473}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 414}, "accepted": true, "role": "owner", "organization": {"id": 131}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 57}, "invitee": {"id": 457}, "accepted": false, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 46}, "invitee": {"id": 466}, "accepted": false, "role": "supervisor", "organization": {"id": 110}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 88}, "invitee": {"id": 490}, "accepted": true, "role": "worker", "organization": {"id": 191}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 53}, "invitee": {"id": 442}, "accepted": true, "role": "owner", "organization": {"id": 190}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 441}, "accepted": true, "role": "maintainer", "organization": {"id": 110}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 55}, "invitee": {"id": 417}, "accepted": true, "role": "supervisor", "organization": {"id": 151}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 435}, "accepted": true, "role": "worker", "organization": {"id": 179}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 94}, "invitee": {"id": 471}, "accepted": false, "role": "owner", "organization": {"id": 157}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 59}, "invitee": {"id": 485}, "accepted": true, "role": "maintainer", "organization": {"id": 149}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 418}, "accepted": false, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 10}, "invitee": {"id": 451}, "accepted": false, "role": "worker", "organization": {"id": 190}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 13}, "invitee": {"id": 482}, "accepted": false, "role": "owner", "organization": {"id": 141}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 446}, "accepted": true, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 94}, "invitee": {"id": 492}, "accepted": false, "role": "supervisor", "organization": {"id": 115}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 488}, "accepted": true, "role": "worker", "organization": {"id": 149}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 1}, "invitee": {"id": 407}, "accepted": false, "role": "owner", "organization": {"id": 180}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 465}, "accepted": false, "role": "maintainer", "organization": {"id": 158}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 43}, "invitee": {"id": 443}, "accepted": true, "role": "supervisor", "organization": {"id": 145}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 22}, "invitee": {"id": 467}, "accepted": false, "role": "worker", "organization": {"id": 175}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 73}, "invitee": {"id": 449}, "accepted": true, "role": "owner", "organization": {"id": 100}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 0}, "invitee": {"id": 434}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 55}, "invitee": {"id": 447}, "accepted": true, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 12}, "invitee": {"id": 458}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 444}, "accepted": true, "role": "owner", "organization": {"id": 179}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 1}, "invitee": {"id": 440}, "accepted": true, "role": "maintainer", "organization": {"id": 198}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 6}, "invitee": {"id": 496}, "accepted": true, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 39}, "invitee": {"id": 449}, "accepted": false, "role": "worker", "organization": {"id": 140}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 80}, "invitee": {"id": 404}, "accepted": false, "role": "owner", "organization": {"id": 183}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 22}, "invitee": {"id": 405}, "accepted": false, "role": "maintainer", "organization": {"id": 155}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 92}, "invitee": {"id": 439}, "accepted": true, "role": "supervisor", "organization": {"id": 186}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 38}, "invitee": {"id": 420}, "accepted": false, "role": "worker", "organization": {"id": 144}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 45}, "invitee": {"id": 488}, "accepted": true, "role": "owner", "organization": {"id": 140}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 70}, "invitee": {"id": 428}, "accepted": false, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 80}, "invitee": {"id": 400}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 438}, "accepted": false, "role": "worker", "organization": {"id": 155}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 26}, "invitee": {"id": 417}, "accepted": true, "role": "owner", "organization": {"id": 185}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 56}, "invitee": {"id": 425}, "accepted": true, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 82}, "invitee": {"id": 441}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 95}, "invitee": {"id": 490}, "accepted": true, "role": "worker", "organization": {"id": 165}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 91}, "invitee": {"id": 435}, "accepted": true, "role": "owner", "organization": {"id": 138}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 30}, "invitee": {"id": 444}, "accepted": true, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 19}, "invitee": {"id": 415}, "accepted": true, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_RESEND_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 33}, "invitee": {"id": 444}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 5}, "accepted": false, "role": "owner", "organization": {"id": 117}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 30}, "accepted": true, "role": "maintainer", "organization": {"id": 159}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 31}, "accepted": true, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 332}, "invitee": {"id": 65}, "accepted": true, "role": "worker", "organization": {"id": 149}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 2}, "accepted": false, "role": "owner", "organization": {"id": 168}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 321}, "invitee": {"id": 5}, "accepted": false, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 42}, "accepted": false, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 11}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 85}, "accepted": true, "role": "owner", "organization": {"id": 171}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 99}, "accepted": true, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 394}, "invitee": {"id": 67}, "accepted": true, "role": "supervisor", "organization": {"id": 143}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 65}, "accepted": false, "role": "worker", "organization": {"id": 131}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 341}, "invitee": {"id": 39}, "accepted": true, "role": "owner", "organization": {"id": 110}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 52}, "accepted": false, "role": "maintainer", "organization": {"id": 190}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 3}, "accepted": true, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 86}, "accepted": true, "role": "worker", "organization": {"id": 173}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 26}, "accepted": false, "role": "owner", "organization": {"id": 108}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 33}, "accepted": false, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 364}, "invitee": {"id": 73}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 375}, "invitee": {"id": 17}, "accepted": false, "role": "worker", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 85}, "accepted": true, "role": "owner", "organization": {"id": 113}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 39}, "accepted": true, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 81}, "accepted": false, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 313}, "invitee": {"id": 59}, "accepted": false, "role": "worker", "organization": {"id": 159}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 79}, "accepted": false, "role": "owner", "organization": {"id": 119}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 0}, "accepted": false, "role": "maintainer", "organization": {"id": 195}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 5}, "accepted": true, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 27}, "accepted": false, "role": "worker", "organization": {"id": 133}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 371}, "invitee": {"id": 98}, "accepted": false, "role": "owner", "organization": {"id": 106}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 390}, "invitee": {"id": 93}, "accepted": true, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 364}, "invitee": {"id": 14}, "accepted": true, "role": "supervisor", "organization": {"id": 143}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 26}, "accepted": true, "role": "worker", "organization": {"id": 130}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 92}, "accepted": true, "role": "owner", "organization": {"id": 105}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 74}, "accepted": false, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 371}, "invitee": {"id": 26}, "accepted": false, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 0}, "accepted": true, "role": "worker", "organization": {"id": 148}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 97}, "accepted": false, "role": "owner", "organization": {"id": 143}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 50}, "accepted": false, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 95}, "accepted": true, "role": "supervisor", "organization": {"id": 192}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 62}, "accepted": false, "role": "worker", "organization": {"id": 155}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 330}, "invitee": {"id": 42}, "accepted": true, "role": "owner", "organization": {"id": 172}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 91}, "accepted": false, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 20}, "accepted": false, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 314}, "invitee": {"id": 55}, "accepted": false, "role": "worker", "organization": {"id": 141}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 96}, "accepted": true, "role": "owner", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 58}, "accepted": true, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 329}, "invitee": {"id": 44}, "accepted": false, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 59}, "accepted": false, "role": "worker", "organization": {"id": 198}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 88}, "accepted": false, "role": "owner", "organization": {"id": 171}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 7}, "accepted": false, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 1}, "accepted": true, "role": "supervisor", "organization": {"id": 140}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 28}, "accepted": true, "role": "worker", "organization": {"id": 175}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 30}, "accepted": false, "role": "owner", "organization": {"id": 175}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 394}, "invitee": {"id": 82}, "accepted": false, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 84}, "accepted": false, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 67}, "accepted": true, "role": "worker", "organization": {"id": 156}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 81}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 337}, "invitee": {"id": 8}, "accepted": false, "role": "maintainer", "organization": {"id": 139}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 85}, "accepted": false, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 91}, "accepted": true, "role": "worker", "organization": {"id": 122}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 73}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 77}, "accepted": false, "role": "maintainer", "organization": {"id": 130}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 31}, "accepted": false, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 66}, "accepted": false, "role": "worker", "organization": {"id": 141}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 95}, "accepted": true, "role": "owner", "organization": {"id": 190}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 64}, "accepted": false, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 399}, "invitee": {"id": 98}, "accepted": true, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 27}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 38}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 93}, "accepted": false, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 97}, "accepted": true, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 55}, "accepted": true, "role": "worker", "organization": {"id": 187}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 79}, "accepted": true, "role": "owner", "organization": {"id": 165}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 393}, "invitee": {"id": 31}, "accepted": true, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 3}, "accepted": false, "role": "supervisor", "organization": {"id": 133}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 330}, "invitee": {"id": 53}, "accepted": false, "role": "worker", "organization": {"id": 113}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 60}, "accepted": true, "role": "owner", "organization": {"id": 189}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 60}, "accepted": true, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 5}, "accepted": true, "role": "supervisor", "organization": {"id": 140}}}
}

test_scope_RESEND_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 40}, "accepted": false, "role": "worker", "organization": {"id": 198}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 451}, "accepted": true, "role": "owner", "organization": {"id": 167}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 332}, "invitee": {"id": 404}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 445}, "accepted": true, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 486}, "accepted": true, "role": "worker", "organization": {"id": 160}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 434}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 496}, "accepted": false, "role": "maintainer", "organization": {"id": 106}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 350}, "invitee": {"id": 403}, "accepted": false, "role": "supervisor", "organization": {"id": 185}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 403}, "accepted": false, "role": "worker", "organization": {"id": 163}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 380}, "invitee": {"id": 469}, "accepted": true, "role": "owner", "organization": {"id": 127}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 402}, "accepted": true, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 332}, "invitee": {"id": 419}, "accepted": false, "role": "supervisor", "organization": {"id": 150}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 352}, "invitee": {"id": 445}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 466}, "accepted": true, "role": "owner", "organization": {"id": 115}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 313}, "invitee": {"id": 454}, "accepted": false, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 389}, "invitee": {"id": 473}, "accepted": true, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 423}, "accepted": false, "role": "worker", "organization": {"id": 135}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 456}, "accepted": false, "role": "owner", "organization": {"id": 154}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 483}, "accepted": true, "role": "maintainer", "organization": {"id": 152}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 481}, "accepted": false, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 496}, "accepted": false, "role": "worker", "organization": {"id": 185}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 476}, "accepted": true, "role": "owner", "organization": {"id": 102}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 408}, "accepted": true, "role": "maintainer", "organization": {"id": 160}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 477}, "accepted": true, "role": "supervisor", "organization": {"id": 156}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 337}, "invitee": {"id": 491}, "accepted": false, "role": "worker", "organization": {"id": 127}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 439}, "accepted": true, "role": "owner", "organization": {"id": 157}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 493}, "accepted": true, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 498}, "accepted": true, "role": "supervisor", "organization": {"id": 150}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 364}, "invitee": {"id": 442}, "accepted": true, "role": "worker", "organization": {"id": 197}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 484}, "accepted": false, "role": "owner", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 337}, "invitee": {"id": 400}, "accepted": true, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 424}, "accepted": true, "role": "supervisor", "organization": {"id": 133}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 425}, "accepted": false, "role": "worker", "organization": {"id": 139}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 473}, "accepted": true, "role": "owner", "organization": {"id": 107}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 426}, "accepted": true, "role": "maintainer", "organization": {"id": 130}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 481}, "accepted": false, "role": "supervisor", "organization": {"id": 167}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 341}, "invitee": {"id": 425}, "accepted": false, "role": "worker", "organization": {"id": 178}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 409}, "accepted": false, "role": "owner", "organization": {"id": 124}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 405}, "accepted": true, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 452}, "accepted": true, "role": "supervisor", "organization": {"id": 106}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 423}, "accepted": false, "role": "worker", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 436}, "accepted": false, "role": "owner", "organization": {"id": 134}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 485}, "accepted": true, "role": "maintainer", "organization": {"id": 195}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 464}, "accepted": false, "role": "supervisor", "organization": {"id": 174}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 422}, "accepted": true, "role": "worker", "organization": {"id": 191}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 389}, "invitee": {"id": 412}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 408}, "accepted": false, "role": "maintainer", "organization": {"id": 153}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 452}, "accepted": false, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 401}, "accepted": false, "role": "worker", "organization": {"id": 120}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 476}, "accepted": false, "role": "owner", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 409}, "accepted": false, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 429}, "accepted": true, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 433}, "accepted": true, "role": "worker", "organization": {"id": 199}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 455}, "accepted": true, "role": "owner", "organization": {"id": 173}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 411}, "accepted": true, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 465}, "accepted": false, "role": "supervisor", "organization": {"id": 101}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 435}, "accepted": true, "role": "worker", "organization": {"id": 128}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 349}, "invitee": {"id": 496}, "accepted": true, "role": "owner", "organization": {"id": 151}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 438}, "accepted": true, "role": "maintainer", "organization": {"id": 187}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 430}, "accepted": true, "role": "supervisor", "organization": {"id": 151}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 390}, "invitee": {"id": 440}, "accepted": true, "role": "worker", "organization": {"id": 119}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 403}, "accepted": true, "role": "owner", "organization": {"id": 185}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 487}, "accepted": true, "role": "maintainer", "organization": {"id": 168}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 381}, "invitee": {"id": 424}, "accepted": true, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 499}, "accepted": true, "role": "worker", "organization": {"id": 157}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 438}, "accepted": true, "role": "owner", "organization": {"id": 118}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 424}, "accepted": true, "role": "maintainer", "organization": {"id": 104}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 497}, "accepted": true, "role": "supervisor", "organization": {"id": 109}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 421}, "accepted": true, "role": "worker", "organization": {"id": 171}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 412}, "accepted": true, "role": "owner", "organization": {"id": 129}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 411}, "accepted": true, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 421}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 329}, "invitee": {"id": 427}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 463}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 422}, "accepted": true, "role": "maintainer", "organization": {"id": 146}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 309}, "invitee": {"id": 474}, "accepted": true, "role": "supervisor", "organization": {"id": 103}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 349}, "invitee": {"id": 475}, "accepted": true, "role": "worker", "organization": {"id": 142}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 477}, "accepted": false, "role": "owner", "organization": {"id": 133}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 450}, "accepted": false, "role": "maintainer", "organization": {"id": 152}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 467}, "accepted": false, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_RESEND_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 469}, "accepted": true, "role": "worker", "organization": {"id": 107}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 70}, "invitee": {"id": 440}, "accepted": false, "role": "owner", "organization": {"id": 123}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 92}, "invitee": {"id": 431}, "accepted": true, "role": "maintainer", "organization": {"id": 106}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 9}, "invitee": {"id": 475}, "accepted": true, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 9}, "invitee": {"id": 485}, "accepted": true, "role": "worker", "organization": {"id": 113}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 7}, "invitee": {"id": 481}, "accepted": true, "role": "owner", "organization": {"id": 130}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 12}, "invitee": {"id": 449}, "accepted": false, "role": "maintainer", "organization": {"id": 123}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 30}, "invitee": {"id": 421}, "accepted": true, "role": "supervisor", "organization": {"id": 180}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 1}, "invitee": {"id": 423}, "accepted": true, "role": "worker", "organization": {"id": 151}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 26}, "invitee": {"id": 497}, "accepted": true, "role": "owner", "organization": {"id": 173}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 99}, "invitee": {"id": 407}, "accepted": false, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 82}, "invitee": {"id": 448}, "accepted": true, "role": "supervisor", "organization": {"id": 145}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 51}, "invitee": {"id": 455}, "accepted": true, "role": "worker", "organization": {"id": 118}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 3}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 176}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 51}, "invitee": {"id": 410}, "accepted": false, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 5}, "invitee": {"id": 495}, "accepted": true, "role": "supervisor", "organization": {"id": 110}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 38}, "invitee": {"id": 433}, "accepted": false, "role": "worker", "organization": {"id": 137}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 83}, "invitee": {"id": 493}, "accepted": false, "role": "owner", "organization": {"id": 199}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 3}, "invitee": {"id": 407}, "accepted": false, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 90}, "invitee": {"id": 454}, "accepted": true, "role": "supervisor", "organization": {"id": 153}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 50}, "invitee": {"id": 409}, "accepted": true, "role": "worker", "organization": {"id": 160}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 24}, "invitee": {"id": 426}, "accepted": true, "role": "owner", "organization": {"id": 124}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 86}, "invitee": {"id": 445}, "accepted": true, "role": "maintainer", "organization": {"id": 163}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 0}, "invitee": {"id": 454}, "accepted": true, "role": "supervisor", "organization": {"id": 163}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 46}, "invitee": {"id": 437}, "accepted": true, "role": "worker", "organization": {"id": 197}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 76}, "invitee": {"id": 413}, "accepted": false, "role": "owner", "organization": {"id": 162}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 99}, "invitee": {"id": 407}, "accepted": true, "role": "maintainer", "organization": {"id": 108}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 85}, "invitee": {"id": 437}, "accepted": false, "role": "supervisor", "organization": {"id": 197}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 46}, "invitee": {"id": 407}, "accepted": false, "role": "worker", "organization": {"id": 118}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 42}, "invitee": {"id": 441}, "accepted": true, "role": "owner", "organization": {"id": 100}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 6}, "invitee": {"id": 419}, "accepted": false, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 403}, "accepted": false, "role": "supervisor", "organization": {"id": 119}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 407}, "accepted": false, "role": "worker", "organization": {"id": 172}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 27}, "invitee": {"id": 425}, "accepted": false, "role": "owner", "organization": {"id": 184}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 97}, "invitee": {"id": 422}, "accepted": false, "role": "maintainer", "organization": {"id": 147}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 481}, "accepted": false, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 85}, "invitee": {"id": 417}, "accepted": true, "role": "worker", "organization": {"id": 187}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 427}, "accepted": true, "role": "owner", "organization": {"id": 154}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 52}, "invitee": {"id": 489}, "accepted": true, "role": "maintainer", "organization": {"id": 148}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 451}, "accepted": false, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 30}, "invitee": {"id": 485}, "accepted": false, "role": "worker", "organization": {"id": 176}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 58}, "invitee": {"id": 473}, "accepted": true, "role": "owner", "organization": {"id": 170}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 74}, "invitee": {"id": 406}, "accepted": true, "role": "maintainer", "organization": {"id": 167}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 438}, "accepted": true, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 75}, "invitee": {"id": 473}, "accepted": true, "role": "worker", "organization": {"id": 169}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 464}, "accepted": false, "role": "owner", "organization": {"id": 137}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 493}, "accepted": false, "role": "maintainer", "organization": {"id": 180}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 96}, "invitee": {"id": 405}, "accepted": false, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 11}, "invitee": {"id": 464}, "accepted": false, "role": "worker", "organization": {"id": 153}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 69}, "invitee": {"id": 470}, "accepted": true, "role": "owner", "organization": {"id": 139}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 60}, "invitee": {"id": 463}, "accepted": false, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 24}, "invitee": {"id": 493}, "accepted": false, "role": "supervisor", "organization": {"id": 193}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 8}, "invitee": {"id": 420}, "accepted": true, "role": "worker", "organization": {"id": 168}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 37}, "invitee": {"id": 431}, "accepted": true, "role": "owner", "organization": {"id": 115}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 37}, "invitee": {"id": 492}, "accepted": true, "role": "maintainer", "organization": {"id": 153}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 67}, "invitee": {"id": 487}, "accepted": false, "role": "supervisor", "organization": {"id": 111}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 62}, "invitee": {"id": 438}, "accepted": false, "role": "worker", "organization": {"id": 177}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 73}, "invitee": {"id": 493}, "accepted": false, "role": "owner", "organization": {"id": 106}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 26}, "invitee": {"id": 414}, "accepted": true, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 17}, "invitee": {"id": 437}, "accepted": true, "role": "supervisor", "organization": {"id": 163}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 37}, "invitee": {"id": 434}, "accepted": true, "role": "worker", "organization": {"id": 144}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 65}, "invitee": {"id": 487}, "accepted": false, "role": "owner", "organization": {"id": 148}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 97}, "invitee": {"id": 461}, "accepted": false, "role": "maintainer", "organization": {"id": 174}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 59}, "invitee": {"id": 461}, "accepted": false, "role": "supervisor", "organization": {"id": 107}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 42}, "invitee": {"id": 476}, "accepted": true, "role": "worker", "organization": {"id": 177}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 46}, "invitee": {"id": 447}, "accepted": false, "role": "owner", "organization": {"id": 120}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 23}, "invitee": {"id": 438}, "accepted": true, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 420}, "accepted": true, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 94}, "invitee": {"id": 486}, "accepted": true, "role": "worker", "organization": {"id": 137}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 29}, "invitee": {"id": 495}, "accepted": true, "role": "owner", "organization": {"id": 117}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 462}, "accepted": false, "role": "maintainer", "organization": {"id": 123}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 20}, "invitee": {"id": 423}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 13}, "invitee": {"id": 415}, "accepted": false, "role": "worker", "organization": {"id": 132}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 496}, "accepted": true, "role": "owner", "organization": {"id": 149}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 3}, "invitee": {"id": 440}, "accepted": false, "role": "maintainer", "organization": {"id": 195}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 472}, "accepted": true, "role": "supervisor", "organization": {"id": 168}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 59}, "invitee": {"id": 436}, "accepted": true, "role": "worker", "organization": {"id": 180}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 70}, "invitee": {"id": 420}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 29}, "invitee": {"id": 458}, "accepted": false, "role": "maintainer", "organization": {"id": 172}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 19}, "invitee": {"id": 458}, "accepted": true, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 74}, "invitee": {"id": 461}, "accepted": false, "role": "worker", "organization": {"id": 177}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 35}, "accepted": true, "role": "owner", "organization": {"id": 133}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 88}, "accepted": false, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 89}, "accepted": false, "role": "supervisor", "organization": {"id": 171}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 65}, "accepted": true, "role": "worker", "organization": {"id": 102}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 24}, "accepted": true, "role": "owner", "organization": {"id": 198}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 25}, "accepted": false, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 18}, "accepted": false, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 60}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 42}, "accepted": false, "role": "owner", "organization": {"id": 107}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 78}, "accepted": true, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 372}, "invitee": {"id": 65}, "accepted": false, "role": "supervisor", "organization": {"id": 135}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 25}, "accepted": false, "role": "worker", "organization": {"id": 130}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 56}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 75}, "accepted": true, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 17}, "accepted": false, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 87}, "accepted": true, "role": "worker", "organization": {"id": 160}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 19}, "accepted": true, "role": "owner", "organization": {"id": 140}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 53}, "accepted": false, "role": "maintainer", "organization": {"id": 176}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 8}, "accepted": false, "role": "supervisor", "organization": {"id": 128}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 46}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 59}, "accepted": true, "role": "owner", "organization": {"id": 170}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 28}, "accepted": false, "role": "maintainer", "organization": {"id": 185}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 10}, "accepted": true, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 12}, "accepted": false, "role": "worker", "organization": {"id": 150}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 64}, "accepted": true, "role": "owner", "organization": {"id": 198}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 60}, "accepted": false, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 372}, "invitee": {"id": 12}, "accepted": false, "role": "supervisor", "organization": {"id": 105}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 39}, "accepted": true, "role": "worker", "organization": {"id": 110}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 41}, "accepted": true, "role": "owner", "organization": {"id": 138}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 4}, "accepted": false, "role": "maintainer", "organization": {"id": 157}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 68}, "accepted": false, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 345}, "invitee": {"id": 98}, "accepted": false, "role": "worker", "organization": {"id": 125}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 63}, "accepted": false, "role": "owner", "organization": {"id": 183}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 68}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 317}, "invitee": {"id": 53}, "accepted": true, "role": "supervisor", "organization": {"id": 115}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 86}, "accepted": true, "role": "worker", "organization": {"id": 115}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 93}, "accepted": true, "role": "owner", "organization": {"id": 191}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 92}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 1}, "accepted": false, "role": "supervisor", "organization": {"id": 135}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 389}, "invitee": {"id": 20}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 373}, "invitee": {"id": 35}, "accepted": true, "role": "owner", "organization": {"id": 113}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 99}, "accepted": true, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 29}, "accepted": true, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 350}, "invitee": {"id": 19}, "accepted": false, "role": "worker", "organization": {"id": 112}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 78}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 12}, "accepted": false, "role": "maintainer", "organization": {"id": 105}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 365}, "invitee": {"id": 94}, "accepted": false, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 322}, "invitee": {"id": 34}, "accepted": false, "role": "worker", "organization": {"id": 184}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 73}, "accepted": true, "role": "owner", "organization": {"id": 158}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 56}, "accepted": true, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 372}, "invitee": {"id": 72}, "accepted": false, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 396}, "invitee": {"id": 55}, "accepted": false, "role": "worker", "organization": {"id": 169}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 69}, "accepted": false, "role": "owner", "organization": {"id": 199}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 21}, "accepted": false, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 24}, "accepted": false, "role": "supervisor", "organization": {"id": 134}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 22}, "accepted": true, "role": "worker", "organization": {"id": 176}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 61}, "accepted": false, "role": "owner", "organization": {"id": 147}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 334}, "invitee": {"id": 26}, "accepted": false, "role": "maintainer", "organization": {"id": 155}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 340}, "invitee": {"id": 11}, "accepted": false, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 392}, "invitee": {"id": 87}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 21}, "accepted": true, "role": "owner", "organization": {"id": 130}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 91}, "accepted": true, "role": "maintainer", "organization": {"id": 110}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 65}, "accepted": false, "role": "supervisor", "organization": {"id": 160}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 309}, "invitee": {"id": 73}, "accepted": true, "role": "worker", "organization": {"id": 116}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 43}, "accepted": false, "role": "owner", "organization": {"id": 128}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 368}, "invitee": {"id": 48}, "accepted": true, "role": "maintainer", "organization": {"id": 143}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 4}, "accepted": false, "role": "supervisor", "organization": {"id": 171}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 96}, "accepted": true, "role": "worker", "organization": {"id": 187}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 327}, "invitee": {"id": 3}, "accepted": false, "role": "owner", "organization": {"id": 186}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 334}, "invitee": {"id": 4}, "accepted": true, "role": "maintainer", "organization": {"id": 150}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 11}, "accepted": false, "role": "supervisor", "organization": {"id": 168}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 67}, "accepted": true, "role": "worker", "organization": {"id": 104}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 96}, "accepted": false, "role": "owner", "organization": {"id": 140}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 398}, "invitee": {"id": 6}, "accepted": false, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 344}, "invitee": {"id": 48}, "accepted": false, "role": "supervisor", "organization": {"id": 101}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 52}, "accepted": false, "role": "worker", "organization": {"id": 127}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 10}, "accepted": false, "role": "owner", "organization": {"id": 142}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 89}, "accepted": false, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 9}, "accepted": false, "role": "supervisor", "organization": {"id": 172}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 30}, "accepted": false, "role": "worker", "organization": {"id": 108}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 497}, "accepted": false, "role": "owner", "organization": {"id": 106}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 418}, "accepted": false, "role": "maintainer", "organization": {"id": 124}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 416}, "accepted": true, "role": "supervisor", "organization": {"id": 183}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 372}, "invitee": {"id": 455}, "accepted": true, "role": "worker", "organization": {"id": 116}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 409}, "accepted": true, "role": "owner", "organization": {"id": 148}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 497}, "accepted": false, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 469}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 382}, "invitee": {"id": 459}, "accepted": false, "role": "worker", "organization": {"id": 198}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 408}, "accepted": false, "role": "owner", "organization": {"id": 108}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 464}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 305}, "invitee": {"id": 452}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 344}, "invitee": {"id": 482}, "accepted": false, "role": "worker", "organization": {"id": 131}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 350}, "invitee": {"id": 423}, "accepted": false, "role": "owner", "organization": {"id": 188}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 470}, "accepted": true, "role": "maintainer", "organization": {"id": 120}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 451}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 459}, "accepted": false, "role": "worker", "organization": {"id": 192}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 410}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 313}, "invitee": {"id": 466}, "accepted": true, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 419}, "accepted": true, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 472}, "accepted": false, "role": "worker", "organization": {"id": 102}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 419}, "accepted": false, "role": "owner", "organization": {"id": 116}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 466}, "accepted": false, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 368}, "invitee": {"id": 481}, "accepted": false, "role": "supervisor", "organization": {"id": 139}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 484}, "accepted": false, "role": "worker", "organization": {"id": 135}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 312}, "invitee": {"id": 495}, "accepted": false, "role": "owner", "organization": {"id": 113}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 490}, "accepted": false, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 454}, "accepted": false, "role": "supervisor", "organization": {"id": 175}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 416}, "accepted": false, "role": "worker", "organization": {"id": 117}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 493}, "accepted": false, "role": "owner", "organization": {"id": 197}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 389}, "invitee": {"id": 428}, "accepted": false, "role": "maintainer", "organization": {"id": 108}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 485}, "accepted": false, "role": "supervisor", "organization": {"id": 121}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 382}, "invitee": {"id": 461}, "accepted": false, "role": "worker", "organization": {"id": 182}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 438}, "accepted": true, "role": "owner", "organization": {"id": 135}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 421}, "accepted": true, "role": "maintainer", "organization": {"id": 176}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 365}, "invitee": {"id": 498}, "accepted": true, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 358}, "invitee": {"id": 460}, "accepted": true, "role": "worker", "organization": {"id": 149}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 490}, "accepted": false, "role": "owner", "organization": {"id": 158}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 383}, "invitee": {"id": 447}, "accepted": false, "role": "maintainer", "organization": {"id": 137}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 350}, "invitee": {"id": 482}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "resend", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 455}, "accepted": false, "role": "worker", "organization": {"id": 161}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 433}, "accepted": false, "role": "owner", "organization": {"id": 147}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 466}, "accepted": false, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 476}, "accepted": false, "role": "supervisor", "organization": {"id": 143}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 344}, "invitee": {"id": 465}, "accepted": true, "role": "worker", "organization": {"id": 161}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 416}, "accepted": false, "role": "owner", "organization": {"id": 184}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 414}, "accepted": true, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 453}, "accepted": true, "role": "supervisor", "organization": {"id": 107}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 458}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 430}, "accepted": false, "role": "owner", "organization": {"id": 167}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 314}, "invitee": {"id": 413}, "accepted": true, "role": "maintainer", "organization": {"id": 171}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 309}, "invitee": {"id": 491}, "accepted": true, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 467}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 493}, "accepted": false, "role": "owner", "organization": {"id": 120}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 373}, "invitee": {"id": 490}, "accepted": true, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 432}, "accepted": false, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 423}, "accepted": false, "role": "worker", "organization": {"id": 160}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 317}, "invitee": {"id": 468}, "accepted": true, "role": "owner", "organization": {"id": 156}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 497}, "accepted": false, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 123, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 411}, "accepted": true, "role": "supervisor", "organization": {"id": 123}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 350}, "invitee": {"id": 452}, "accepted": true, "role": "worker", "organization": {"id": 140}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 305}, "invitee": {"id": 439}, "accepted": false, "role": "owner", "organization": {"id": 150}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 368}, "invitee": {"id": 403}, "accepted": false, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 411}, "accepted": true, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 437}, "accepted": true, "role": "worker", "organization": {"id": 150}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 346}, "invitee": {"id": 447}, "accepted": true, "role": "owner", "organization": {"id": 115}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 401}, "accepted": true, "role": "maintainer", "organization": {"id": 160}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 476}, "accepted": true, "role": "supervisor", "organization": {"id": 142}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 479}, "accepted": true, "role": "worker", "organization": {"id": 101}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 400}, "accepted": true, "role": "owner", "organization": {"id": 143}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 319}, "invitee": {"id": 468}, "accepted": true, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 455}, "accepted": true, "role": "supervisor", "organization": {"id": 166}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 348}, "invitee": {"id": 434}, "accepted": false, "role": "worker", "organization": {"id": 159}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 445}, "accepted": true, "role": "owner", "organization": {"id": 135}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 460}, "accepted": true, "role": "maintainer", "organization": {"id": 130}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 389}, "invitee": {"id": 425}, "accepted": false, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 408}, "accepted": false, "role": "worker", "organization": {"id": 143}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 155}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 346}, "invitee": {"id": 475}, "accepted": true, "role": "maintainer", "organization": {"id": 187}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 442}, "accepted": true, "role": "supervisor", "organization": {"id": 133}}}
}

test_scope_RESEND_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "resend", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 310}, "invitee": {"id": 422}, "accepted": true, "role": "worker", "organization": {"id": 121}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 42}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 481}, "accepted": true, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 88}, "invitee": {"id": 469}, "accepted": true, "role": "supervisor", "organization": {"id": 141}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 94}, "invitee": {"id": 436}, "accepted": true, "role": "worker", "organization": {"id": 102}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 488}, "accepted": false, "role": "owner", "organization": {"id": 132}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 42}, "invitee": {"id": 453}, "accepted": false, "role": "maintainer", "organization": {"id": 125}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 453}, "accepted": false, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 13}, "invitee": {"id": 471}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 57}, "invitee": {"id": 459}, "accepted": true, "role": "owner", "organization": {"id": 196}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 7}, "invitee": {"id": 451}, "accepted": true, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 460}, "accepted": false, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 0}, "invitee": {"id": 495}, "accepted": false, "role": "worker", "organization": {"id": 123}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 57}, "invitee": {"id": 476}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 3}, "invitee": {"id": 490}, "accepted": true, "role": "maintainer", "organization": {"id": 147}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 18}, "invitee": {"id": 430}, "accepted": false, "role": "supervisor", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 6}, "invitee": {"id": 489}, "accepted": false, "role": "worker", "organization": {"id": 169}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 452}, "accepted": false, "role": "owner", "organization": {"id": 197}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 26}, "invitee": {"id": 440}, "accepted": false, "role": "maintainer", "organization": {"id": 182}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 49}, "invitee": {"id": 422}, "accepted": true, "role": "supervisor", "organization": {"id": 118}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 5}, "invitee": {"id": 460}, "accepted": false, "role": "worker", "organization": {"id": 161}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 29}, "invitee": {"id": 438}, "accepted": true, "role": "owner", "organization": {"id": 162}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 413}, "accepted": false, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 97}, "invitee": {"id": 425}, "accepted": true, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 31}, "invitee": {"id": 471}, "accepted": false, "role": "worker", "organization": {"id": 105}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 63}, "invitee": {"id": 420}, "accepted": true, "role": "owner", "organization": {"id": 102}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 83}, "invitee": {"id": 479}, "accepted": true, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 89}, "invitee": {"id": 461}, "accepted": true, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 471}, "accepted": false, "role": "worker", "organization": {"id": 121}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 78}, "invitee": {"id": 461}, "accepted": false, "role": "owner", "organization": {"id": 106}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 457}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 99}, "invitee": {"id": 484}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 441}, "accepted": true, "role": "worker", "organization": {"id": 185}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 29}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 145}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 472}, "accepted": true, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 92}, "invitee": {"id": 445}, "accepted": true, "role": "supervisor", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 446}, "accepted": true, "role": "worker", "organization": {"id": 118}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 20}, "invitee": {"id": 480}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 416}, "accepted": true, "role": "maintainer", "organization": {"id": 193}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 38}, "invitee": {"id": 421}, "accepted": true, "role": "supervisor", "organization": {"id": 196}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 44}, "invitee": {"id": 491}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 468}, "accepted": false, "role": "owner", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 41}, "invitee": {"id": 403}, "accepted": true, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 69}, "invitee": {"id": 450}, "accepted": false, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 62}, "invitee": {"id": 491}, "accepted": false, "role": "worker", "organization": {"id": 141}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 37}, "invitee": {"id": 419}, "accepted": true, "role": "owner", "organization": {"id": 107}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 75}, "invitee": {"id": 474}, "accepted": true, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 3}, "invitee": {"id": 423}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 36}, "invitee": {"id": 429}, "accepted": false, "role": "worker", "organization": {"id": 149}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 471}, "accepted": true, "role": "owner", "organization": {"id": 101}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 36}, "invitee": {"id": 402}, "accepted": false, "role": "maintainer", "organization": {"id": 117}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 65}, "invitee": {"id": 408}, "accepted": false, "role": "supervisor", "organization": {"id": 185}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 24}, "invitee": {"id": 490}, "accepted": true, "role": "worker", "organization": {"id": 170}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 58}, "invitee": {"id": 411}, "accepted": false, "role": "owner", "organization": {"id": 107}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 33}, "invitee": {"id": 433}, "accepted": false, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 51}, "invitee": {"id": 454}, "accepted": false, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 80}, "invitee": {"id": 446}, "accepted": true, "role": "worker", "organization": {"id": 195}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 79}, "invitee": {"id": 437}, "accepted": false, "role": "owner", "organization": {"id": 160}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 83}, "invitee": {"id": 480}, "accepted": true, "role": "maintainer", "organization": {"id": 157}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 77}, "invitee": {"id": 439}, "accepted": false, "role": "supervisor", "organization": {"id": 131}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 33}, "invitee": {"id": 426}, "accepted": true, "role": "worker", "organization": {"id": 190}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 68}, "invitee": {"id": 431}, "accepted": true, "role": "owner", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 25}, "invitee": {"id": 488}, "accepted": true, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 28}, "invitee": {"id": 423}, "accepted": false, "role": "supervisor", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 402}, "accepted": false, "role": "worker", "organization": {"id": 142}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 93}, "invitee": {"id": 465}, "accepted": true, "role": "owner", "organization": {"id": 112}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 484}, "accepted": true, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 34}, "invitee": {"id": 482}, "accepted": true, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 61}, "invitee": {"id": 410}, "accepted": true, "role": "worker", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 49}, "invitee": {"id": 460}, "accepted": false, "role": "owner", "organization": {"id": 145}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 72}, "invitee": {"id": 495}, "accepted": false, "role": "maintainer", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 402}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 12}, "invitee": {"id": 430}, "accepted": false, "role": "worker", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 28}, "invitee": {"id": 423}, "accepted": false, "role": "owner", "organization": {"id": 120}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 412}, "accepted": true, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 33}, "invitee": {"id": 440}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 85}, "invitee": {"id": 468}, "accepted": true, "role": "worker", "organization": {"id": 130}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 55}, "invitee": {"id": 471}, "accepted": false, "role": "owner", "organization": {"id": 182}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 0}, "invitee": {"id": 420}, "accepted": false, "role": "maintainer", "organization": {"id": 162}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 2}, "invitee": {"id": 463}, "accepted": true, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 95}, "invitee": {"id": 426}, "accepted": true, "role": "worker", "organization": {"id": 187}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 36}, "accepted": true, "role": "owner", "organization": {"id": 112}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 8}, "accepted": false, "role": "maintainer", "organization": {"id": 147}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 74}, "accepted": false, "role": "supervisor", "organization": {"id": 117}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 78}, "accepted": true, "role": "worker", "organization": {"id": 168}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 321}, "invitee": {"id": 99}, "accepted": true, "role": "owner", "organization": {"id": 166}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 41}, "accepted": true, "role": "maintainer", "organization": {"id": 106}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 81}, "accepted": false, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 15}, "accepted": true, "role": "worker", "organization": {"id": 189}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 394}, "invitee": {"id": 54}, "accepted": false, "role": "owner", "organization": {"id": 162}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 12}, "accepted": true, "role": "maintainer", "organization": {"id": 100}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 324}, "invitee": {"id": 97}, "accepted": true, "role": "supervisor", "organization": {"id": 168}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 325}, "invitee": {"id": 89}, "accepted": true, "role": "worker", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 33}, "accepted": false, "role": "owner", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 50}, "accepted": true, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 45}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 19}, "accepted": false, "role": "worker", "organization": {"id": 168}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 42}, "accepted": true, "role": "owner", "organization": {"id": 133}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 34}, "accepted": true, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 57}, "accepted": true, "role": "supervisor", "organization": {"id": 167}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 52}, "accepted": false, "role": "worker", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 54}, "accepted": true, "role": "owner", "organization": {"id": 175}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 85}, "accepted": true, "role": "maintainer", "organization": {"id": 139}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 396}, "invitee": {"id": 80}, "accepted": true, "role": "supervisor", "organization": {"id": 193}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 36}, "accepted": true, "role": "worker", "organization": {"id": 199}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 96}, "accepted": false, "role": "owner", "organization": {"id": 167}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 70}, "accepted": true, "role": "maintainer", "organization": {"id": 127}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 79}, "accepted": false, "role": "supervisor", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 53}, "accepted": true, "role": "worker", "organization": {"id": 115}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 32}, "accepted": false, "role": "owner", "organization": {"id": 149}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 64}, "accepted": false, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 39}, "accepted": true, "role": "supervisor", "organization": {"id": 183}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 346}, "invitee": {"id": 74}, "accepted": true, "role": "worker", "organization": {"id": 142}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 42}, "accepted": true, "role": "owner", "organization": {"id": 126}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 58}, "accepted": true, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 95}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 71}, "accepted": true, "role": "worker", "organization": {"id": 157}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 97}, "accepted": false, "role": "owner", "organization": {"id": 143}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 74}, "accepted": true, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 3}, "accepted": true, "role": "supervisor", "organization": {"id": 171}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 35}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 15}, "accepted": true, "role": "owner", "organization": {"id": 164}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 93}, "accepted": true, "role": "maintainer", "organization": {"id": 182}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 34}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 8}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 7}, "accepted": true, "role": "owner", "organization": {"id": 169}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 9}, "accepted": true, "role": "maintainer", "organization": {"id": 124}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 59}, "accepted": false, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 48}, "accepted": false, "role": "worker", "organization": {"id": 184}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 399}, "invitee": {"id": 60}, "accepted": false, "role": "owner", "organization": {"id": 125}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 79}, "accepted": false, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 46}, "accepted": true, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 389}, "invitee": {"id": 36}, "accepted": false, "role": "worker", "organization": {"id": 172}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 70}, "accepted": false, "role": "owner", "organization": {"id": 113}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 321}, "invitee": {"id": 98}, "accepted": true, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 14}, "accepted": false, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 4}, "accepted": true, "role": "worker", "organization": {"id": 159}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 66}, "accepted": false, "role": "owner", "organization": {"id": 194}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 39}, "accepted": false, "role": "maintainer", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 78}, "accepted": false, "role": "supervisor", "organization": {"id": 137}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 352}, "invitee": {"id": 10}, "accepted": false, "role": "worker", "organization": {"id": 177}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 329}, "invitee": {"id": 54}, "accepted": true, "role": "owner", "organization": {"id": 199}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 66}, "accepted": true, "role": "maintainer", "organization": {"id": 123}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 314}, "invitee": {"id": 68}, "accepted": true, "role": "supervisor", "organization": {"id": 143}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 96}, "accepted": false, "role": "worker", "organization": {"id": 187}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 74}, "accepted": false, "role": "owner", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 48}, "accepted": false, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 88}, "accepted": true, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 324}, "invitee": {"id": 91}, "accepted": true, "role": "worker", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 44}, "accepted": true, "role": "owner", "organization": {"id": 137}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 349}, "invitee": {"id": 16}, "accepted": true, "role": "maintainer", "organization": {"id": 163}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 97}, "accepted": true, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 28}, "accepted": false, "role": "worker", "organization": {"id": 159}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 396}, "invitee": {"id": 42}, "accepted": false, "role": "owner", "organization": {"id": 160}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 321}, "invitee": {"id": 43}, "accepted": true, "role": "maintainer", "organization": {"id": 189}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 77}, "accepted": true, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 53}, "accepted": true, "role": "worker", "organization": {"id": 128}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 393}, "invitee": {"id": 51}, "accepted": true, "role": "owner", "organization": {"id": 139}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 74}, "accepted": true, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 316}, "invitee": {"id": 2}, "accepted": true, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_VIEW_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 84}, "accepted": true, "role": "worker", "organization": {"id": 184}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 450}, "accepted": false, "role": "owner", "organization": {"id": 131}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 446}, "accepted": true, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 489}, "accepted": false, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 427}, "accepted": true, "role": "worker", "organization": {"id": 169}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 396}, "invitee": {"id": 492}, "accepted": false, "role": "owner", "organization": {"id": 126}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 406}, "accepted": true, "role": "maintainer", "organization": {"id": 168}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 349}, "invitee": {"id": 444}, "accepted": false, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 350}, "invitee": {"id": 446}, "accepted": true, "role": "worker", "organization": {"id": 109}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 431}, "accepted": false, "role": "owner", "organization": {"id": 189}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 436}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 449}, "accepted": true, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 394}, "invitee": {"id": 465}, "accepted": false, "role": "worker", "organization": {"id": 186}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 486}, "accepted": true, "role": "owner", "organization": {"id": 106}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 450}, "accepted": true, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 301}, "invitee": {"id": 470}, "accepted": true, "role": "supervisor", "organization": {"id": 138}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 330}, "invitee": {"id": 427}, "accepted": false, "role": "worker", "organization": {"id": 110}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 404}, "accepted": false, "role": "owner", "organization": {"id": 183}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 499}, "accepted": true, "role": "maintainer", "organization": {"id": 146}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 304}, "invitee": {"id": 429}, "accepted": false, "role": "supervisor", "organization": {"id": 101}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 485}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 314}, "invitee": {"id": 487}, "accepted": true, "role": "owner", "organization": {"id": 128}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 458}, "accepted": false, "role": "maintainer", "organization": {"id": 175}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 407}, "accepted": false, "role": "supervisor", "organization": {"id": 100}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 450}, "accepted": true, "role": "worker", "organization": {"id": 190}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 411}, "accepted": true, "role": "owner", "organization": {"id": 126}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 371}, "invitee": {"id": 485}, "accepted": false, "role": "maintainer", "organization": {"id": 150}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 346}, "invitee": {"id": 439}, "accepted": true, "role": "supervisor", "organization": {"id": 151}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 450}, "accepted": true, "role": "worker", "organization": {"id": 147}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 402}, "accepted": false, "role": "owner", "organization": {"id": 181}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 454}, "accepted": true, "role": "maintainer", "organization": {"id": 195}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 417}, "accepted": false, "role": "supervisor", "organization": {"id": 121}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 408}, "accepted": true, "role": "worker", "organization": {"id": 192}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 357}, "invitee": {"id": 468}, "accepted": true, "role": "owner", "organization": {"id": 109}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 460}, "accepted": true, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 417}, "accepted": false, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 350}, "invitee": {"id": 413}, "accepted": false, "role": "worker", "organization": {"id": 123}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 461}, "accepted": true, "role": "owner", "organization": {"id": 123}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 440}, "accepted": false, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 475}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 305}, "invitee": {"id": 404}, "accepted": false, "role": "worker", "organization": {"id": 115}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 365}, "invitee": {"id": 431}, "accepted": false, "role": "owner", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 441}, "accepted": true, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 374}, "invitee": {"id": 437}, "accepted": true, "role": "supervisor", "organization": {"id": 180}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 442}, "accepted": true, "role": "worker", "organization": {"id": 192}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 465}, "accepted": false, "role": "owner", "organization": {"id": 108}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 446}, "accepted": false, "role": "maintainer", "organization": {"id": 189}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 356}, "invitee": {"id": 456}, "accepted": false, "role": "supervisor", "organization": {"id": 188}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 377}, "invitee": {"id": 475}, "accepted": true, "role": "worker", "organization": {"id": 114}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 415}, "accepted": false, "role": "owner", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 447}, "accepted": true, "role": "maintainer", "organization": {"id": 120}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 409}, "accepted": true, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 441}, "accepted": false, "role": "worker", "organization": {"id": 181}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 406}, "accepted": false, "role": "owner", "organization": {"id": 120}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 474}, "accepted": true, "role": "maintainer", "organization": {"id": 173}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 442}, "accepted": true, "role": "supervisor", "organization": {"id": 156}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 393}, "invitee": {"id": 440}, "accepted": true, "role": "worker", "organization": {"id": 146}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 496}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 471}, "accepted": true, "role": "maintainer", "organization": {"id": 109}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 498}, "accepted": true, "role": "supervisor", "organization": {"id": 174}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 475}, "accepted": true, "role": "worker", "organization": {"id": 150}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 412}, "accepted": true, "role": "owner", "organization": {"id": 119}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 382}, "invitee": {"id": 417}, "accepted": false, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 463}, "accepted": false, "role": "supervisor", "organization": {"id": 134}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 462}, "accepted": false, "role": "worker", "organization": {"id": 197}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 474}, "accepted": true, "role": "owner", "organization": {"id": 130}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 463}, "accepted": true, "role": "maintainer", "organization": {"id": 170}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 484}, "accepted": true, "role": "supervisor", "organization": {"id": 174}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 345}, "invitee": {"id": 467}, "accepted": false, "role": "worker", "organization": {"id": 141}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 400}, "accepted": false, "role": "owner", "organization": {"id": 160}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 488}, "accepted": true, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 364}, "invitee": {"id": 409}, "accepted": true, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 448}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 407}, "accepted": true, "role": "owner", "organization": {"id": 117}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 474}, "accepted": true, "role": "maintainer", "organization": {"id": 135}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 408}, "accepted": true, "role": "worker", "organization": {"id": 174}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 307}, "invitee": {"id": 453}, "accepted": true, "role": "owner", "organization": {"id": 169}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 448}, "accepted": false, "role": "maintainer", "organization": {"id": 143}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 339}, "invitee": {"id": 453}, "accepted": false, "role": "supervisor", "organization": {"id": 117}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 418}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 470}, "accepted": true, "role": "owner", "organization": {"id": 136}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 16}, "invitee": {"id": 480}, "accepted": false, "role": "maintainer", "organization": {"id": 144}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 93}, "invitee": {"id": 433}, "accepted": false, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 67}, "invitee": {"id": 493}, "accepted": false, "role": "worker", "organization": {"id": 135}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 86}, "invitee": {"id": 452}, "accepted": false, "role": "owner", "organization": {"id": 184}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 44}, "invitee": {"id": 429}, "accepted": false, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 26}, "invitee": {"id": 401}, "accepted": false, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 94}, "invitee": {"id": 492}, "accepted": true, "role": "worker", "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 77}, "invitee": {"id": 439}, "accepted": true, "role": "owner", "organization": {"id": 157}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 11}, "invitee": {"id": 433}, "accepted": false, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 483}, "accepted": true, "role": "supervisor", "organization": {"id": 133}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 62}, "invitee": {"id": 459}, "accepted": true, "role": "worker", "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 21}, "invitee": {"id": 499}, "accepted": false, "role": "owner", "organization": {"id": 103}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 438}, "accepted": false, "role": "maintainer", "organization": {"id": 112}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 490}, "accepted": true, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 83}, "invitee": {"id": 429}, "accepted": false, "role": "worker", "organization": {"id": 192}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 19}, "invitee": {"id": 415}, "accepted": false, "role": "owner", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 67}, "invitee": {"id": 458}, "accepted": true, "role": "maintainer", "organization": {"id": 139}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 61}, "invitee": {"id": 412}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 27}, "invitee": {"id": 452}, "accepted": false, "role": "worker", "organization": {"id": 193}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 419}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 57}, "invitee": {"id": 434}, "accepted": false, "role": "maintainer", "organization": {"id": 101}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 93}, "invitee": {"id": 484}, "accepted": false, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 91}, "invitee": {"id": 460}, "accepted": false, "role": "worker", "organization": {"id": 182}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 41}, "invitee": {"id": 469}, "accepted": false, "role": "owner", "organization": {"id": 123}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 98}, "invitee": {"id": 485}, "accepted": false, "role": "maintainer", "organization": {"id": 171}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 62}, "invitee": {"id": 447}, "accepted": true, "role": "supervisor", "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 9}, "invitee": {"id": 422}, "accepted": true, "role": "worker", "organization": {"id": 118}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 92}, "invitee": {"id": 405}, "accepted": true, "role": "owner", "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 93}, "invitee": {"id": 462}, "accepted": false, "role": "maintainer", "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 92}, "invitee": {"id": 417}, "accepted": false, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 63}, "invitee": {"id": 430}, "accepted": false, "role": "worker", "organization": {"id": 196}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 15}, "invitee": {"id": 466}, "accepted": false, "role": "owner", "organization": {"id": 155}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 47}, "invitee": {"id": 435}, "accepted": true, "role": "maintainer", "organization": {"id": 192}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 40}, "invitee": {"id": 480}, "accepted": false, "role": "supervisor", "organization": {"id": 118}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 62}, "invitee": {"id": 403}, "accepted": true, "role": "worker", "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 17}, "invitee": {"id": 402}, "accepted": false, "role": "owner", "organization": {"id": 131}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 60}, "invitee": {"id": 455}, "accepted": true, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 39}, "invitee": {"id": 450}, "accepted": false, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 82}, "invitee": {"id": 431}, "accepted": false, "role": "worker", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 23}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 140}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 55}, "invitee": {"id": 492}, "accepted": false, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 90}, "invitee": {"id": 401}, "accepted": true, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 41}, "invitee": {"id": 467}, "accepted": true, "role": "worker", "organization": {"id": 155}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 27}, "invitee": {"id": 414}, "accepted": true, "role": "owner", "organization": {"id": 104}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 419}, "accepted": true, "role": "maintainer", "organization": {"id": 149}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 479}, "accepted": false, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 448}, "accepted": true, "role": "worker", "organization": {"id": 162}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 70}, "invitee": {"id": 466}, "accepted": true, "role": "owner", "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 43}, "invitee": {"id": 438}, "accepted": false, "role": "maintainer", "organization": {"id": 193}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 97}, "invitee": {"id": 463}, "accepted": true, "role": "supervisor", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 78}, "invitee": {"id": 429}, "accepted": false, "role": "worker", "organization": {"id": 122}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 58}, "invitee": {"id": 475}, "accepted": false, "role": "owner", "organization": {"id": 127}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 78}, "invitee": {"id": 416}, "accepted": true, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 80}, "invitee": {"id": 423}, "accepted": true, "role": "supervisor", "organization": {"id": 140}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 33}, "invitee": {"id": 472}, "accepted": true, "role": "worker", "organization": {"id": 144}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 451}, "accepted": true, "role": "owner", "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 498}, "accepted": false, "role": "maintainer", "organization": {"id": 149}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 52}, "invitee": {"id": 404}, "accepted": true, "role": "supervisor", "organization": {"id": 183}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 15}, "invitee": {"id": 487}, "accepted": false, "role": "worker", "organization": {"id": 190}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 66}, "invitee": {"id": 448}, "accepted": true, "role": "owner", "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 85}, "invitee": {"id": 459}, "accepted": true, "role": "maintainer", "organization": {"id": 121}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 34}, "invitee": {"id": 421}, "accepted": true, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 23}, "invitee": {"id": 464}, "accepted": true, "role": "worker", "organization": {"id": 174}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 50}, "invitee": {"id": 458}, "accepted": true, "role": "owner", "organization": {"id": 147}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 98}, "invitee": {"id": 454}, "accepted": false, "role": "maintainer", "organization": {"id": 185}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 50}, "invitee": {"id": 491}, "accepted": false, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 32}, "invitee": {"id": 460}, "accepted": true, "role": "worker", "organization": {"id": 101}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 2}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 28}, "invitee": {"id": 434}, "accepted": false, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 16}, "invitee": {"id": 406}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 83}, "invitee": {"id": 417}, "accepted": false, "role": "worker", "organization": {"id": 124}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 53}, "invitee": {"id": 486}, "accepted": false, "role": "owner", "organization": {"id": 121}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 17}, "invitee": {"id": 410}, "accepted": true, "role": "maintainer", "organization": {"id": 174}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 27}, "invitee": {"id": 420}, "accepted": false, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 50}, "invitee": {"id": 475}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 44}, "invitee": {"id": 486}, "accepted": false, "role": "owner", "organization": {"id": 115}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 71}, "invitee": {"id": 484}, "accepted": true, "role": "maintainer", "organization": {"id": 198}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 5}, "invitee": {"id": 402}, "accepted": false, "role": "supervisor", "organization": {"id": 123}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 1}, "invitee": {"id": 453}, "accepted": false, "role": "worker", "organization": {"id": 160}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 339}, "invitee": {"id": 73}, "accepted": false, "role": "owner", "organization": {"id": 186}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 57}, "accepted": true, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 5}, "accepted": false, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 352}, "invitee": {"id": 86}, "accepted": false, "role": "worker", "organization": {"id": 168}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 14}, "accepted": true, "role": "owner", "organization": {"id": 161}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 398}, "invitee": {"id": 19}, "accepted": true, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 74}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 65}, "accepted": true, "role": "worker", "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 63}, "accepted": true, "role": "owner", "organization": {"id": 133}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 321}, "invitee": {"id": 1}, "accepted": false, "role": "maintainer", "organization": {"id": 144}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 74}, "accepted": false, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 28}, "accepted": false, "role": "worker", "organization": {"id": 111}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 91}, "accepted": false, "role": "owner", "organization": {"id": 118}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 93}, "accepted": true, "role": "maintainer", "organization": {"id": 185}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 42}, "accepted": false, "role": "supervisor", "organization": {"id": 107}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 67}, "accepted": true, "role": "worker", "organization": {"id": 172}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 38}, "accepted": false, "role": "owner", "organization": {"id": 105}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 29}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 327}, "invitee": {"id": 29}, "accepted": false, "role": "maintainer", "organization": {"id": 194}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 32}, "accepted": true, "role": "supervisor", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 56}, "accepted": false, "role": "worker", "organization": {"id": 103}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 61}, "accepted": false, "role": "owner", "organization": {"id": 130}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 21}, "accepted": true, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 68}, "accepted": false, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 9}, "accepted": false, "role": "worker", "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 62}, "accepted": false, "role": "owner", "organization": {"id": 101}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 30}, "accepted": true, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 74}, "accepted": true, "role": "supervisor", "organization": {"id": 123}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 72}, "accepted": true, "role": "worker", "organization": {"id": 130}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 10}, "accepted": false, "role": "owner", "organization": {"id": 149}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 93}, "accepted": true, "role": "maintainer", "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 46}, "accepted": false, "role": "supervisor", "organization": {"id": 103}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 59}, "accepted": false, "role": "worker", "organization": {"id": 153}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 28}, "accepted": true, "role": "owner", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 92}, "accepted": true, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 373}, "invitee": {"id": 16}, "accepted": true, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 340}, "invitee": {"id": 15}, "accepted": true, "role": "worker", "organization": {"id": 154}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 68}, "accepted": false, "role": "owner", "organization": {"id": 195}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 15}, "accepted": true, "role": "maintainer", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 33}, "accepted": true, "role": "supervisor", "organization": {"id": 106}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 23}, "accepted": false, "role": "worker", "organization": {"id": 134}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 389}, "invitee": {"id": 62}, "accepted": true, "role": "owner", "organization": {"id": 132}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 312}, "invitee": {"id": 29}, "accepted": false, "role": "maintainer", "organization": {"id": 118}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 14}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 391}, "invitee": {"id": 23}, "accepted": false, "role": "worker", "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 48}, "accepted": false, "role": "owner", "organization": {"id": 182}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 56}, "accepted": false, "role": "maintainer", "organization": {"id": 196}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 22}, "accepted": false, "role": "supervisor", "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 354}, "invitee": {"id": 30}, "accepted": false, "role": "worker", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 30}, "accepted": false, "role": "owner", "organization": {"id": 173}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 0}, "accepted": false, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 69}, "accepted": false, "role": "supervisor", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 374}, "invitee": {"id": 63}, "accepted": true, "role": "worker", "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 396}, "invitee": {"id": 57}, "accepted": false, "role": "owner", "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 348}, "invitee": {"id": 92}, "accepted": true, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 37}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 9}, "accepted": true, "role": "worker", "organization": {"id": 173}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 18}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 31}, "accepted": false, "role": "maintainer", "organization": {"id": 119}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 78}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 77}, "accepted": false, "role": "worker", "organization": {"id": 165}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 41}, "accepted": true, "role": "owner", "organization": {"id": 139}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 7}, "accepted": false, "role": "maintainer", "organization": {"id": 109}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 53}, "accepted": false, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 77}, "accepted": true, "role": "worker", "organization": {"id": 194}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 17}, "accepted": true, "role": "owner", "organization": {"id": 128}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 301}, "invitee": {"id": 35}, "accepted": false, "role": "maintainer", "organization": {"id": 127}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 70}, "accepted": true, "role": "supervisor", "organization": {"id": 193}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 28}, "accepted": false, "role": "worker", "organization": {"id": 163}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 84}, "accepted": true, "role": "owner", "organization": {"id": 150}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 327}, "invitee": {"id": 56}, "accepted": true, "role": "maintainer", "organization": {"id": 100}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 51}, "accepted": true, "role": "supervisor", "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 96}, "accepted": false, "role": "worker", "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 49}, "accepted": false, "role": "owner", "organization": {"id": 180}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 36}, "accepted": true, "role": "maintainer", "organization": {"id": 190}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 94}, "accepted": true, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 31}, "accepted": true, "role": "worker", "organization": {"id": 125}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 386}, "invitee": {"id": 12}, "accepted": true, "role": "owner", "organization": {"id": 139}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 310}, "invitee": {"id": 91}, "accepted": false, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 35}, "accepted": true, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 327}, "invitee": {"id": 93}, "accepted": false, "role": "worker", "organization": {"id": 142}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 478}, "accepted": false, "role": "owner", "organization": {"id": 177}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 426}, "accepted": true, "role": "maintainer", "organization": {"id": 141}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 29}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 423}, "accepted": true, "role": "supervisor", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 422}, "accepted": false, "role": "worker", "organization": {"id": 192}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 452}, "accepted": true, "role": "owner", "organization": {"id": 125}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 393}, "invitee": {"id": 420}, "accepted": true, "role": "maintainer", "organization": {"id": 101}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 313}, "invitee": {"id": 482}, "accepted": false, "role": "supervisor", "organization": {"id": 110}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 334}, "invitee": {"id": 469}, "accepted": false, "role": "worker", "organization": {"id": 135}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 443}, "accepted": false, "role": "owner", "organization": {"id": 173}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 486}, "accepted": false, "role": "maintainer", "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 374}, "invitee": {"id": 423}, "accepted": true, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 420}, "accepted": true, "role": "worker", "organization": {"id": 186}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 496}, "accepted": true, "role": "owner", "organization": {"id": 177}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 483}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 478}, "accepted": false, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 385}, "invitee": {"id": 427}, "accepted": false, "role": "worker", "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 397}, "invitee": {"id": 448}, "accepted": false, "role": "owner", "organization": {"id": 103}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 448}, "accepted": false, "role": "maintainer", "organization": {"id": 172}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 470}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 411}, "accepted": false, "role": "worker", "organization": {"id": 182}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 308}, "invitee": {"id": 425}, "accepted": false, "role": "owner", "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 397}, "invitee": {"id": 470}, "accepted": false, "role": "maintainer", "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 319}, "invitee": {"id": 408}, "accepted": false, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 329}, "invitee": {"id": 415}, "accepted": true, "role": "worker", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 406}, "accepted": true, "role": "owner", "organization": {"id": 133}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 358}, "invitee": {"id": 439}, "accepted": false, "role": "maintainer", "organization": {"id": 167}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 471}, "accepted": true, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 495}, "accepted": true, "role": "worker", "organization": {"id": 151}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 317}, "invitee": {"id": 495}, "accepted": false, "role": "owner", "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 451}, "accepted": false, "role": "maintainer", "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 401}, "accepted": true, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 377}, "invitee": {"id": 454}, "accepted": true, "role": "worker", "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 418}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 316}, "invitee": {"id": 482}, "accepted": false, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 340}, "invitee": {"id": 473}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 479}, "accepted": false, "role": "worker", "organization": {"id": 183}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 443}, "accepted": true, "role": "owner", "organization": {"id": 123}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 373}, "invitee": {"id": 474}, "accepted": true, "role": "maintainer", "organization": {"id": 119}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 319}, "invitee": {"id": 435}, "accepted": true, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 496}, "accepted": true, "role": "worker", "organization": {"id": 187}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 301}, "invitee": {"id": 411}, "accepted": true, "role": "owner", "organization": {"id": 198}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 390}, "invitee": {"id": 478}, "accepted": false, "role": "maintainer", "organization": {"id": 184}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 435}, "accepted": true, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 410}, "accepted": true, "role": "worker", "organization": {"id": 104}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 374}, "invitee": {"id": 411}, "accepted": true, "role": "owner", "organization": {"id": 191}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 345}, "invitee": {"id": 426}, "accepted": true, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 344}, "invitee": {"id": 497}, "accepted": false, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 462}, "accepted": true, "role": "worker", "organization": {"id": 126}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 29}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 342}, "invitee": {"id": 422}, "accepted": false, "role": "owner", "organization": {"id": 163}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 446}, "accepted": false, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 460}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 326}, "invitee": {"id": 420}, "accepted": false, "role": "worker", "organization": {"id": 172}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 405}, "accepted": false, "role": "owner", "organization": {"id": 161}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 319}, "invitee": {"id": 451}, "accepted": false, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 499}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 305}, "invitee": {"id": 495}, "accepted": false, "role": "worker", "organization": {"id": 156}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 400}, "accepted": false, "role": "owner", "organization": {"id": 105}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 429}, "accepted": false, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 471}, "accepted": false, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 456}, "accepted": true, "role": "worker", "organization": {"id": 122}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 407}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 427}, "accepted": true, "role": "maintainer", "organization": {"id": 189}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 449}, "accepted": true, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 464}, "accepted": false, "role": "worker", "organization": {"id": 176}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 413}, "accepted": false, "role": "owner", "organization": {"id": 131}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 394}, "invitee": {"id": 429}, "accepted": true, "role": "maintainer", "organization": {"id": 117}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 485}, "accepted": false, "role": "supervisor", "organization": {"id": 158}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 483}, "accepted": true, "role": "worker", "organization": {"id": 124}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 484}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 445}, "accepted": false, "role": "maintainer", "organization": {"id": 179}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 397}, "invitee": {"id": 445}, "accepted": false, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 308}, "invitee": {"id": 467}, "accepted": false, "role": "worker", "organization": {"id": 107}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 422}, "accepted": true, "role": "owner", "organization": {"id": 185}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 427}, "accepted": true, "role": "maintainer", "organization": {"id": 133}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 346}, "invitee": {"id": 453}, "accepted": false, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 397}, "invitee": {"id": 420}, "accepted": false, "role": "worker", "organization": {"id": 118}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 456}, "accepted": true, "role": "owner", "organization": {"id": 152}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 428}, "accepted": false, "role": "maintainer", "organization": {"id": 135}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 425}, "accepted": false, "role": "supervisor", "organization": {"id": 160}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 387}, "invitee": {"id": 448}, "accepted": true, "role": "worker", "organization": {"id": 161}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 473}, "accepted": true, "role": "owner", "organization": {"id": 115}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 99}, "invitee": {"id": 414}, "accepted": true, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 11}, "invitee": {"id": 443}, "accepted": true, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 43}, "invitee": {"id": 437}, "accepted": true, "role": "worker", "organization": {"id": 146}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 482}, "accepted": false, "role": "owner", "organization": {"id": 103}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 73}, "invitee": {"id": 401}, "accepted": false, "role": "maintainer", "organization": {"id": 125}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 465}, "accepted": false, "role": "supervisor", "organization": {"id": 157}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 36}, "invitee": {"id": 478}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 15}, "invitee": {"id": 400}, "accepted": true, "role": "owner", "organization": {"id": 134}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 32}, "invitee": {"id": 413}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 73}, "invitee": {"id": 479}, "accepted": true, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 75}, "invitee": {"id": 461}, "accepted": false, "role": "worker", "organization": {"id": 127}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 86}, "invitee": {"id": 425}, "accepted": true, "role": "owner", "organization": {"id": 171}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 95}, "invitee": {"id": 429}, "accepted": true, "role": "maintainer", "organization": {"id": 192}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 39}, "invitee": {"id": 434}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 12}, "invitee": {"id": 451}, "accepted": true, "role": "worker", "organization": {"id": 112}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 31}, "invitee": {"id": 441}, "accepted": false, "role": "owner", "organization": {"id": 142}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 419}, "accepted": false, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 9}, "invitee": {"id": 453}, "accepted": false, "role": "supervisor", "organization": {"id": 100}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 490}, "accepted": false, "role": "worker", "organization": {"id": 194}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 36}, "invitee": {"id": 432}, "accepted": true, "role": "owner", "organization": {"id": 101}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 473}, "accepted": false, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 63}, "invitee": {"id": 489}, "accepted": true, "role": "supervisor", "organization": {"id": 116}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 46}, "invitee": {"id": 499}, "accepted": false, "role": "worker", "organization": {"id": 197}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 56}, "invitee": {"id": 409}, "accepted": false, "role": "owner", "organization": {"id": 141}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 71}, "invitee": {"id": 437}, "accepted": true, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 81}, "invitee": {"id": 405}, "accepted": false, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 69}, "invitee": {"id": 461}, "accepted": false, "role": "worker", "organization": {"id": 173}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 84}, "invitee": {"id": 494}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 99}, "invitee": {"id": 485}, "accepted": true, "role": "maintainer", "organization": {"id": 173}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 64}, "invitee": {"id": 447}, "accepted": false, "role": "supervisor", "organization": {"id": 166}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 21}, "invitee": {"id": 480}, "accepted": true, "role": "worker", "organization": {"id": 132}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 0}, "invitee": {"id": 469}, "accepted": true, "role": "owner", "organization": {"id": 176}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 36}, "invitee": {"id": 453}, "accepted": true, "role": "maintainer", "organization": {"id": 107}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 70}, "invitee": {"id": 415}, "accepted": false, "role": "supervisor", "organization": {"id": 158}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 26}, "invitee": {"id": 474}, "accepted": true, "role": "worker", "organization": {"id": 113}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 59}, "invitee": {"id": 494}, "accepted": true, "role": "owner", "organization": {"id": 183}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 35}, "invitee": {"id": 471}, "accepted": false, "role": "maintainer", "organization": {"id": 141}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 61}, "invitee": {"id": 426}, "accepted": false, "role": "supervisor", "organization": {"id": 166}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 92}, "invitee": {"id": 499}, "accepted": false, "role": "worker", "organization": {"id": 145}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 30}, "invitee": {"id": 460}, "accepted": false, "role": "owner", "organization": {"id": 149}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 90}, "invitee": {"id": 477}, "accepted": false, "role": "maintainer", "organization": {"id": 152}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 82}, "invitee": {"id": 467}, "accepted": false, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 26}, "invitee": {"id": 401}, "accepted": false, "role": "worker", "organization": {"id": 138}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 18}, "invitee": {"id": 494}, "accepted": false, "role": "owner", "organization": {"id": 153}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 89}, "invitee": {"id": 434}, "accepted": false, "role": "maintainer", "organization": {"id": 114}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 87}, "invitee": {"id": 404}, "accepted": true, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 34}, "invitee": {"id": 497}, "accepted": true, "role": "worker", "organization": {"id": 153}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 43}, "invitee": {"id": 492}, "accepted": true, "role": "owner", "organization": {"id": 165}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 67}, "invitee": {"id": 415}, "accepted": true, "role": "maintainer", "organization": {"id": 111}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 2}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 175}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 19}, "invitee": {"id": 437}, "accepted": true, "role": "worker", "organization": {"id": 117}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 25}, "invitee": {"id": 489}, "accepted": true, "role": "owner", "organization": {"id": 189}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 41}, "invitee": {"id": 408}, "accepted": true, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 30}, "invitee": {"id": 434}, "accepted": true, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 78}, "invitee": {"id": 460}, "accepted": true, "role": "worker", "organization": {"id": 158}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 92}, "invitee": {"id": 427}, "accepted": true, "role": "owner", "organization": {"id": 133}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 17}, "invitee": {"id": 459}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 97}, "invitee": {"id": 493}, "accepted": false, "role": "supervisor", "organization": {"id": 189}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 6}, "invitee": {"id": 495}, "accepted": true, "role": "worker", "organization": {"id": 139}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 86}, "invitee": {"id": 439}, "accepted": true, "role": "owner", "organization": {"id": 155}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 445}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 439}, "accepted": false, "role": "supervisor", "organization": {"id": 141}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 453}, "accepted": false, "role": "worker", "organization": {"id": 102}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 74}, "invitee": {"id": 437}, "accepted": true, "role": "owner", "organization": {"id": 180}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 44}, "invitee": {"id": 424}, "accepted": true, "role": "maintainer", "organization": {"id": 142}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 76}, "invitee": {"id": 436}, "accepted": false, "role": "supervisor", "organization": {"id": 123}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 48}, "invitee": {"id": 413}, "accepted": false, "role": "worker", "organization": {"id": 106}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 10}, "invitee": {"id": 464}, "accepted": false, "role": "owner", "organization": {"id": 144}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 8}, "invitee": {"id": 441}, "accepted": false, "role": "maintainer", "organization": {"id": 116}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 31}, "invitee": {"id": 431}, "accepted": false, "role": "supervisor", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 67}, "invitee": {"id": 462}, "accepted": false, "role": "worker", "organization": {"id": 106}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 4}, "invitee": {"id": 494}, "accepted": false, "role": "owner", "organization": {"id": 154}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 83}, "invitee": {"id": 478}, "accepted": true, "role": "maintainer", "organization": {"id": 165}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 50}, "invitee": {"id": 406}, "accepted": false, "role": "supervisor", "organization": {"id": 198}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 27}, "invitee": {"id": 408}, "accepted": false, "role": "worker", "organization": {"id": 125}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 47}, "invitee": {"id": 480}, "accepted": false, "role": "owner", "organization": {"id": 167}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 50}, "invitee": {"id": 452}, "accepted": true, "role": "maintainer", "organization": {"id": 136}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 1}, "invitee": {"id": 498}, "accepted": true, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 98}, "invitee": {"id": 480}, "accepted": true, "role": "worker", "organization": {"id": 162}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 366}, "invitee": {"id": 29}, "accepted": true, "role": "owner", "organization": {"id": 160}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 314}, "invitee": {"id": 20}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 329}, "invitee": {"id": 13}, "accepted": false, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 390}, "invitee": {"id": 56}, "accepted": true, "role": "worker", "organization": {"id": 143}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 31}, "accepted": false, "role": "owner", "organization": {"id": 111}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 27}, "accepted": false, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 375}, "invitee": {"id": 69}, "accepted": false, "role": "supervisor", "organization": {"id": 135}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 58}, "accepted": true, "role": "worker", "organization": {"id": 124}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 32}, "accepted": false, "role": "owner", "organization": {"id": 161}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 342}, "invitee": {"id": 11}, "accepted": false, "role": "maintainer", "organization": {"id": 108}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 365}, "invitee": {"id": 82}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 370}, "invitee": {"id": 72}, "accepted": true, "role": "worker", "organization": {"id": 183}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 309}, "invitee": {"id": 25}, "accepted": true, "role": "owner", "organization": {"id": 122}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 88}, "accepted": false, "role": "maintainer", "organization": {"id": 124}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 338}, "invitee": {"id": 10}, "accepted": true, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 93}, "accepted": true, "role": "worker", "organization": {"id": 145}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 49}, "accepted": true, "role": "owner", "organization": {"id": 130}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 16}, "accepted": false, "role": "maintainer", "organization": {"id": 146}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 3}, "accepted": false, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 52}, "accepted": false, "role": "worker", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 313}, "invitee": {"id": 1}, "accepted": false, "role": "owner", "organization": {"id": 193}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 90}, "accepted": true, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 42}, "accepted": false, "role": "supervisor", "organization": {"id": 165}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 34}, "accepted": false, "role": "worker", "organization": {"id": 171}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 64}, "accepted": true, "role": "owner", "organization": {"id": 125}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 6}, "accepted": true, "role": "maintainer", "organization": {"id": 160}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 46}, "accepted": false, "role": "supervisor", "organization": {"id": 130}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 384}, "invitee": {"id": 91}, "accepted": true, "role": "worker", "organization": {"id": 129}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 388}, "invitee": {"id": 60}, "accepted": true, "role": "owner", "organization": {"id": 101}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 99}, "accepted": true, "role": "maintainer", "organization": {"id": 176}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 34}, "accepted": false, "role": "supervisor", "organization": {"id": 153}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 2}, "accepted": false, "role": "worker", "organization": {"id": 184}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 32}, "accepted": false, "role": "owner", "organization": {"id": 118}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 63}, "accepted": false, "role": "maintainer", "organization": {"id": 187}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 99}, "accepted": true, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 16}, "accepted": true, "role": "worker", "organization": {"id": 108}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 393}, "invitee": {"id": 53}, "accepted": false, "role": "owner", "organization": {"id": 189}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 91}, "accepted": true, "role": "maintainer", "organization": {"id": 188}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 25}, "accepted": false, "role": "supervisor", "organization": {"id": 169}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 45}, "accepted": true, "role": "worker", "organization": {"id": 184}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 76}, "accepted": true, "role": "owner", "organization": {"id": 127}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 326}, "invitee": {"id": 22}, "accepted": true, "role": "maintainer", "organization": {"id": 171}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 85}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 14}, "accepted": true, "role": "worker", "organization": {"id": 163}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 18}, "accepted": true, "role": "owner", "organization": {"id": 112}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 62}, "accepted": true, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 58}, "accepted": false, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 86}, "accepted": false, "role": "worker", "organization": {"id": 129}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 343}, "invitee": {"id": 24}, "accepted": true, "role": "owner", "organization": {"id": 195}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 93}, "accepted": true, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 30}, "accepted": true, "role": "supervisor", "organization": {"id": 114}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 89}, "accepted": true, "role": "worker", "organization": {"id": 141}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 322}, "invitee": {"id": 88}, "accepted": true, "role": "owner", "organization": {"id": 172}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 72}, "accepted": false, "role": "maintainer", "organization": {"id": 182}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 47}, "accepted": true, "role": "supervisor", "organization": {"id": 197}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 32}, "accepted": false, "role": "worker", "organization": {"id": 138}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 13}, "accepted": true, "role": "owner", "organization": {"id": 191}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 314}, "invitee": {"id": 56}, "accepted": true, "role": "maintainer", "organization": {"id": 150}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 92}, "accepted": false, "role": "supervisor", "organization": {"id": 117}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 379}, "invitee": {"id": 70}, "accepted": true, "role": "worker", "organization": {"id": 195}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 25}, "accepted": true, "role": "owner", "organization": {"id": 125}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 387}, "invitee": {"id": 2}, "accepted": false, "role": "maintainer", "organization": {"id": 138}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 346}, "invitee": {"id": 35}, "accepted": true, "role": "supervisor", "organization": {"id": 107}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 3}, "accepted": false, "role": "worker", "organization": {"id": 159}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 373}, "invitee": {"id": 20}, "accepted": false, "role": "owner", "organization": {"id": 196}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 395}, "invitee": {"id": 62}, "accepted": false, "role": "maintainer", "organization": {"id": 153}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 3}, "accepted": false, "role": "supervisor", "organization": {"id": 137}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 59}, "accepted": false, "role": "worker", "organization": {"id": 151}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 38}, "accepted": false, "role": "owner", "organization": {"id": 199}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 348}, "invitee": {"id": 90}, "accepted": true, "role": "maintainer", "organization": {"id": 183}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 398}, "invitee": {"id": 20}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 39}, "accepted": true, "role": "worker", "organization": {"id": 118}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 363}, "invitee": {"id": 0}, "accepted": false, "role": "owner", "organization": {"id": 137}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 365}, "invitee": {"id": 97}, "accepted": false, "role": "maintainer", "organization": {"id": 123}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 19}, "accepted": false, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 311}, "invitee": {"id": 83}, "accepted": false, "role": "worker", "organization": {"id": 196}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 62}, "accepted": true, "role": "owner", "organization": {"id": 142}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 385}, "invitee": {"id": 67}, "accepted": true, "role": "maintainer", "organization": {"id": 157}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 45}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_CREATE_context_SANDBOX_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 351}, "invitee": {"id": 15}, "accepted": false, "role": "worker", "organization": {"id": 114}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 300}, "invitee": {"id": 456}, "accepted": false, "role": "owner", "organization": {"id": 127}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 386}, "invitee": {"id": 481}, "accepted": true, "role": "maintainer", "organization": {"id": 154}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 391}, "invitee": {"id": 443}, "accepted": true, "role": "supervisor", "organization": {"id": 154}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 442}, "accepted": true, "role": "worker", "organization": {"id": 167}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 406}, "accepted": true, "role": "owner", "organization": {"id": 101}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 499}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 365}, "invitee": {"id": 482}, "accepted": true, "role": "supervisor", "organization": {"id": 144}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 375}, "invitee": {"id": 499}, "accepted": true, "role": "worker", "organization": {"id": 137}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 369}, "invitee": {"id": 488}, "accepted": false, "role": "owner", "organization": {"id": 109}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 348}, "invitee": {"id": 404}, "accepted": true, "role": "maintainer", "organization": {"id": 166}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 451}, "accepted": false, "role": "supervisor", "organization": {"id": 137}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 429}, "accepted": true, "role": "worker", "organization": {"id": 164}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 387}, "invitee": {"id": 464}, "accepted": true, "role": "owner", "organization": {"id": 141}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 355}, "invitee": {"id": 473}, "accepted": true, "role": "maintainer", "organization": {"id": 104}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 415}, "accepted": false, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"owner": {"id": 325}, "invitee": {"id": 411}, "accepted": false, "role": "worker", "organization": {"id": 152}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 306}, "invitee": {"id": 468}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 449}, "accepted": false, "role": "maintainer", "organization": {"id": 182}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 495}, "accepted": true, "role": "supervisor", "organization": {"id": 157}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 371}, "invitee": {"id": 421}, "accepted": true, "role": "worker", "organization": {"id": 102}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 361}, "invitee": {"id": 482}, "accepted": false, "role": "owner", "organization": {"id": 144}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 406}, "accepted": true, "role": "maintainer", "organization": {"id": 135}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 424}, "accepted": false, "role": "supervisor", "organization": {"id": 173}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 341}, "invitee": {"id": 431}, "accepted": false, "role": "worker", "organization": {"id": 123}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 354}, "invitee": {"id": 407}, "accepted": false, "role": "owner", "organization": {"id": 112}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 493}, "accepted": false, "role": "maintainer", "organization": {"id": 172}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 441}, "accepted": false, "role": "supervisor", "organization": {"id": 109}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 392}, "invitee": {"id": 496}, "accepted": true, "role": "worker", "organization": {"id": 183}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 427}, "accepted": false, "role": "owner", "organization": {"id": 163}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 323}, "invitee": {"id": 453}, "accepted": false, "role": "maintainer", "organization": {"id": 117}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 440}, "accepted": true, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": null}, "resource": {"owner": {"id": 319}, "invitee": {"id": 479}, "accepted": true, "role": "worker", "organization": {"id": 185}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 378}, "invitee": {"id": 417}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 328}, "invitee": {"id": 424}, "accepted": false, "role": "maintainer", "organization": {"id": 113}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 445}, "accepted": false, "role": "supervisor", "organization": {"id": 128}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 371}, "invitee": {"id": 494}, "accepted": false, "role": "worker", "organization": {"id": 163}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 340}, "invitee": {"id": 461}, "accepted": false, "role": "owner", "organization": {"id": 150}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 477}, "accepted": true, "role": "maintainer", "organization": {"id": 181}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 320}, "invitee": {"id": 450}, "accepted": true, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 406}, "accepted": false, "role": "worker", "organization": {"id": 132}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 317}, "invitee": {"id": 457}, "accepted": true, "role": "owner", "organization": {"id": 188}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 397}, "invitee": {"id": 471}, "accepted": false, "role": "maintainer", "organization": {"id": 177}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 472}, "accepted": true, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 330}, "invitee": {"id": 471}, "accepted": false, "role": "worker", "organization": {"id": 199}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 414}, "accepted": false, "role": "owner", "organization": {"id": 157}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 303}, "invitee": {"id": 438}, "accepted": false, "role": "maintainer", "organization": {"id": 167}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 366}, "invitee": {"id": 486}, "accepted": false, "role": "supervisor", "organization": {"id": 179}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": null}, "resource": {"owner": {"id": 302}, "invitee": {"id": 461}, "accepted": true, "role": "worker", "organization": {"id": 146}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 478}, "accepted": false, "role": "owner", "organization": {"id": 158}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 466}, "accepted": false, "role": "maintainer", "organization": {"id": 146}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 358}, "invitee": {"id": 417}, "accepted": true, "role": "supervisor", "organization": {"id": 111}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 312}, "invitee": {"id": 423}, "accepted": true, "role": "worker", "organization": {"id": 163}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 368}, "invitee": {"id": 469}, "accepted": false, "role": "owner", "organization": {"id": 182}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 362}, "invitee": {"id": 445}, "accepted": false, "role": "maintainer", "organization": {"id": 192}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 353}, "invitee": {"id": 462}, "accepted": false, "role": "worker", "organization": {"id": 157}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 400}, "accepted": false, "role": "owner", "organization": {"id": 175}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 367}, "invitee": {"id": 444}, "accepted": true, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 372}, "invitee": {"id": 411}, "accepted": true, "role": "supervisor", "organization": {"id": 150}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 366}, "invitee": {"id": 443}, "accepted": false, "role": "worker", "organization": {"id": 174}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 334}, "invitee": {"id": 429}, "accepted": true, "role": "owner", "organization": {"id": 194}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 318}, "invitee": {"id": 415}, "accepted": false, "role": "maintainer", "organization": {"id": 100}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 327}, "invitee": {"id": 424}, "accepted": false, "role": "supervisor", "organization": {"id": 152}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": null}, "resource": {"owner": {"id": 308}, "invitee": {"id": 444}, "accepted": false, "role": "worker", "organization": {"id": 178}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 344}, "invitee": {"id": 457}, "accepted": false, "role": "owner", "organization": {"id": 117}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 409}, "accepted": true, "role": "maintainer", "organization": {"id": 198}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 360}, "invitee": {"id": 492}, "accepted": true, "role": "supervisor", "organization": {"id": 191}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 347}, "invitee": {"id": 428}, "accepted": false, "role": "worker", "organization": {"id": 108}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 366}, "invitee": {"id": 485}, "accepted": true, "role": "owner", "organization": {"id": 182}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 376}, "invitee": {"id": 475}, "accepted": false, "role": "maintainer", "organization": {"id": 160}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 375}, "invitee": {"id": 489}, "accepted": false, "role": "supervisor", "organization": {"id": 109}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 359}, "invitee": {"id": 418}, "accepted": false, "role": "worker", "organization": {"id": 173}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 333}, "invitee": {"id": 446}, "accepted": true, "role": "owner", "organization": {"id": 148}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 336}, "invitee": {"id": 465}, "accepted": false, "role": "maintainer", "organization": {"id": 118}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 398}, "invitee": {"id": 426}, "accepted": false, "role": "supervisor", "organization": {"id": 154}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 348}, "invitee": {"id": 490}, "accepted": true, "role": "worker", "organization": {"id": 144}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 315}, "invitee": {"id": 403}, "accepted": false, "role": "owner", "organization": {"id": 148}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 335}, "invitee": {"id": 464}, "accepted": false, "role": "maintainer", "organization": {"id": 148}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 310}, "invitee": {"id": 417}, "accepted": true, "role": "supervisor", "organization": {"id": 150}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": null}, "resource": {"owner": {"id": 331}, "invitee": {"id": 451}, "accepted": false, "role": "worker", "organization": {"id": 170}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 26}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 26}, "invitee": {"id": 419}, "accepted": false, "role": "owner", "organization": {"id": 156}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 83}, "invitee": {"id": 437}, "accepted": true, "role": "maintainer", "organization": {"id": 125}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 10}, "invitee": {"id": 415}, "accepted": false, "role": "supervisor", "organization": {"id": 177}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 34}, "invitee": {"id": 426}, "accepted": true, "role": "worker", "organization": {"id": 101}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 36}, "invitee": {"id": 441}, "accepted": false, "role": "owner", "organization": {"id": 151}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 73}, "invitee": {"id": 438}, "accepted": true, "role": "maintainer", "organization": {"id": 125}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 5}, "invitee": {"id": 406}, "accepted": true, "role": "supervisor", "organization": {"id": 180}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 77}, "invitee": {"id": 487}, "accepted": true, "role": "worker", "organization": {"id": 137}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 85}, "invitee": {"id": 461}, "accepted": true, "role": "owner", "organization": {"id": 142}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 19}, "invitee": {"id": 463}, "accepted": false, "role": "maintainer", "organization": {"id": 123}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 499}, "accepted": false, "role": "supervisor", "organization": {"id": 116}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 65}, "invitee": {"id": 492}, "accepted": false, "role": "worker", "organization": {"id": 144}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 48}, "invitee": {"id": 484}, "accepted": false, "role": "owner", "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 35}, "invitee": {"id": 496}, "accepted": true, "role": "maintainer", "organization": {"id": 121}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 33}, "invitee": {"id": 403}, "accepted": false, "role": "supervisor", "organization": {"id": 131}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 90}, "invitee": {"id": 478}, "accepted": true, "role": "worker", "organization": {"id": 179}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 55}, "invitee": {"id": 487}, "accepted": true, "role": "owner", "organization": {"id": 192}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 49}, "invitee": {"id": 491}, "accepted": false, "role": "maintainer", "organization": {"id": 156}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 72}, "invitee": {"id": 493}, "accepted": false, "role": "supervisor", "organization": {"id": 147}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 13}, "invitee": {"id": 485}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 76}, "invitee": {"id": 469}, "accepted": true, "role": "owner", "organization": {"id": 105}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 423}, "accepted": true, "role": "maintainer", "organization": {"id": 132}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 2}, "invitee": {"id": 446}, "accepted": true, "role": "supervisor", "organization": {"id": 132}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 6}, "invitee": {"id": 413}, "accepted": false, "role": "worker", "organization": {"id": 115}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 5}, "invitee": {"id": 481}, "accepted": true, "role": "owner", "organization": {"id": 193}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 89}, "invitee": {"id": 482}, "accepted": true, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 410}, "accepted": true, "role": "supervisor", "organization": {"id": 129}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 1}, "invitee": {"id": 455}, "accepted": true, "role": "worker", "organization": {"id": 124}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 71}, "invitee": {"id": 469}, "accepted": true, "role": "owner", "organization": {"id": 150}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 70}, "invitee": {"id": 474}, "accepted": true, "role": "maintainer", "organization": {"id": 185}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 64}, "invitee": {"id": 441}, "accepted": true, "role": "supervisor", "organization": {"id": 190}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 76}, "invitee": {"id": 403}, "accepted": true, "role": "worker", "organization": {"id": 174}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 34}, "invitee": {"id": 400}, "accepted": true, "role": "owner", "organization": {"id": 114}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 0}, "invitee": {"id": 424}, "accepted": true, "role": "maintainer", "organization": {"id": 102}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 49}, "invitee": {"id": 498}, "accepted": false, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 35}, "invitee": {"id": 409}, "accepted": false, "role": "worker", "organization": {"id": 186}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 483}, "accepted": true, "role": "owner", "organization": {"id": 108}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 427}, "accepted": false, "role": "maintainer", "organization": {"id": 145}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 69}, "invitee": {"id": 448}, "accepted": true, "role": "supervisor", "organization": {"id": 113}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 47}, "invitee": {"id": 417}, "accepted": true, "role": "worker", "organization": {"id": 110}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 45}, "invitee": {"id": 483}, "accepted": true, "role": "owner", "organization": {"id": 154}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 91}, "invitee": {"id": 487}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 67}, "invitee": {"id": 414}, "accepted": false, "role": "supervisor", "organization": {"id": 112}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 73}, "invitee": {"id": 496}, "accepted": false, "role": "worker", "organization": {"id": 105}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 34}, "invitee": {"id": 417}, "accepted": false, "role": "owner", "organization": {"id": 179}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 21}, "invitee": {"id": 407}, "accepted": false, "role": "maintainer", "organization": {"id": 144}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 16}, "invitee": {"id": 422}, "accepted": false, "role": "supervisor", "organization": {"id": 195}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 74}, "invitee": {"id": 491}, "accepted": false, "role": "worker", "organization": {"id": 172}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 93}, "invitee": {"id": 419}, "accepted": true, "role": "owner", "organization": {"id": 120}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 33}, "invitee": {"id": 433}, "accepted": true, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 44}, "invitee": {"id": 488}, "accepted": false, "role": "supervisor", "organization": {"id": 159}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 57}, "invitee": {"id": 471}, "accepted": false, "role": "worker", "organization": {"id": 188}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 18}, "invitee": {"id": 435}, "accepted": false, "role": "owner", "organization": {"id": 195}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 41}, "invitee": {"id": 438}, "accepted": true, "role": "maintainer", "organization": {"id": 145}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 65}, "invitee": {"id": 480}, "accepted": true, "role": "supervisor", "organization": {"id": 199}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 8}, "invitee": {"id": 450}, "accepted": true, "role": "worker", "organization": {"id": 101}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 33}, "invitee": {"id": 402}, "accepted": true, "role": "owner", "organization": {"id": 114}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 68}, "invitee": {"id": 430}, "accepted": true, "role": "maintainer", "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 63}, "invitee": {"id": 450}, "accepted": true, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 51}, "invitee": {"id": 405}, "accepted": true, "role": "worker", "organization": {"id": 139}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 95}, "invitee": {"id": 440}, "accepted": false, "role": "owner", "organization": {"id": 187}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 19}, "invitee": {"id": 476}, "accepted": true, "role": "maintainer", "organization": {"id": 168}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 3}, "invitee": {"id": 446}, "accepted": true, "role": "supervisor", "organization": {"id": 153}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 96}, "invitee": {"id": 408}, "accepted": true, "role": "worker", "organization": {"id": 143}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 51}, "invitee": {"id": 429}, "accepted": false, "role": "owner", "organization": {"id": 154}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 38}, "invitee": {"id": 466}, "accepted": false, "role": "maintainer", "organization": {"id": 108}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 80}, "invitee": {"id": 442}, "accepted": true, "role": "supervisor", "organization": {"id": 178}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 2}, "invitee": {"id": 402}, "accepted": true, "role": "worker", "organization": {"id": 198}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 3}, "invitee": {"id": 400}, "accepted": true, "role": "owner", "organization": {"id": 157}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 44}, "invitee": {"id": 481}, "accepted": false, "role": "maintainer", "organization": {"id": 161}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 16}, "invitee": {"id": 442}, "accepted": false, "role": "supervisor", "organization": {"id": 170}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 17}, "invitee": {"id": 461}, "accepted": true, "role": "worker", "organization": {"id": 167}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 31}, "invitee": {"id": 454}, "accepted": false, "role": "owner", "organization": {"id": 187}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 81}, "invitee": {"id": 462}, "accepted": true, "role": "maintainer", "organization": {"id": 126}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 27}, "invitee": {"id": 452}, "accepted": true, "role": "supervisor", "organization": {"id": 101}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 38}, "invitee": {"id": 453}, "accepted": false, "role": "worker", "organization": {"id": 176}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 28}, "invitee": {"id": 429}, "accepted": true, "role": "owner", "organization": {"id": 132}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 47}, "invitee": {"id": 432}, "accepted": false, "role": "maintainer", "organization": {"id": 173}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 29}, "invitee": {"id": 466}, "accepted": false, "role": "supervisor", "organization": {"id": 162}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 60}, "invitee": {"id": 441}, "accepted": false, "role": "worker", "organization": {"id": 148}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 39}, "accepted": true, "role": "owner", "organization": {"id": 113}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 369}, "invitee": {"id": 71}, "accepted": false, "role": "maintainer", "organization": {"id": 167}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 313}, "invitee": {"id": 68}, "accepted": true, "role": "supervisor", "organization": {"id": 134}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 307}, "invitee": {"id": 0}, "accepted": true, "role": "worker", "organization": {"id": 172}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 366}, "invitee": {"id": 2}, "accepted": true, "role": "owner", "organization": {"id": 187}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 379}, "invitee": {"id": 42}, "accepted": false, "role": "maintainer", "organization": {"id": 158}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 7}, "accepted": false, "role": "supervisor", "organization": {"id": 122}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 390}, "invitee": {"id": 91}, "accepted": true, "role": "worker", "organization": {"id": 138}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 42}, "accepted": true, "role": "owner", "organization": {"id": 173}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 0}, "accepted": false, "role": "maintainer", "organization": {"id": 189}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 324}, "invitee": {"id": 94}, "accepted": true, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 323}, "invitee": {"id": 30}, "accepted": false, "role": "worker", "organization": {"id": 173}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 381}, "invitee": {"id": 5}, "accepted": false, "role": "owner", "organization": {"id": 161}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 398}, "invitee": {"id": 22}, "accepted": true, "role": "maintainer", "organization": {"id": 189}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 354}, "invitee": {"id": 71}, "accepted": true, "role": "supervisor", "organization": {"id": 146}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 315}, "invitee": {"id": 33}, "accepted": true, "role": "worker", "organization": {"id": 132}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 17}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 363}, "invitee": {"id": 45}, "accepted": true, "role": "maintainer", "organization": {"id": 155}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 399}, "invitee": {"id": 56}, "accepted": false, "role": "supervisor", "organization": {"id": 187}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 361}, "invitee": {"id": 90}, "accepted": true, "role": "worker", "organization": {"id": 140}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 339}, "invitee": {"id": 17}, "accepted": false, "role": "owner", "organization": {"id": 142}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 11}, "accepted": true, "role": "maintainer", "organization": {"id": 145}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 341}, "invitee": {"id": 41}, "accepted": true, "role": "supervisor", "organization": {"id": 145}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 320}, "invitee": {"id": 4}, "accepted": false, "role": "worker", "organization": {"id": 125}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 97}, "accepted": true, "role": "owner", "organization": {"id": 169}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 2}, "accepted": false, "role": "maintainer", "organization": {"id": 134}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 318}, "invitee": {"id": 40}, "accepted": true, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 331}, "invitee": {"id": 93}, "accepted": true, "role": "worker", "organization": {"id": 172}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 29}, "accepted": true, "role": "owner", "organization": {"id": 127}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 77}, "accepted": false, "role": "maintainer", "organization": {"id": 151}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 349}, "invitee": {"id": 60}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_BUSINESS_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 330}, "invitee": {"id": 63}, "accepted": false, "role": "worker", "organization": {"id": 163}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 93}, "accepted": false, "role": "owner", "organization": {"id": 141}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 345}, "invitee": {"id": 36}, "accepted": true, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 350}, "invitee": {"id": 96}, "accepted": false, "role": "supervisor", "organization": {"id": 185}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 97}, "accepted": true, "role": "worker", "organization": {"id": 127}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 94}, "accepted": false, "role": "owner", "organization": {"id": 159}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 365}, "invitee": {"id": 51}, "accepted": true, "role": "maintainer", "organization": {"id": 197}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 329}, "invitee": {"id": 18}, "accepted": true, "role": "supervisor", "organization": {"id": 111}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 7}, "accepted": true, "role": "worker", "organization": {"id": 116}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 66}, "accepted": true, "role": "owner", "organization": {"id": 142}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 392}, "invitee": {"id": 96}, "accepted": false, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 355}, "invitee": {"id": 77}, "accepted": true, "role": "supervisor", "organization": {"id": 158}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 68}, "accepted": false, "role": "worker", "organization": {"id": 142}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 36}, "accepted": true, "role": "owner", "organization": {"id": 140}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 302}, "invitee": {"id": 25}, "accepted": false, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 303}, "invitee": {"id": 31}, "accepted": false, "role": "supervisor", "organization": {"id": 108}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_USER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 396}, "invitee": {"id": 49}, "accepted": false, "role": "worker", "organization": {"id": 179}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 343}, "invitee": {"id": 40}, "accepted": false, "role": "owner", "organization": {"id": 166}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 336}, "invitee": {"id": 17}, "accepted": false, "role": "maintainer", "organization": {"id": 112}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 15}, "accepted": true, "role": "supervisor", "organization": {"id": 175}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 362}, "invitee": {"id": 68}, "accepted": true, "role": "worker", "organization": {"id": 114}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 89}, "accepted": false, "role": "owner", "organization": {"id": 148}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 98}, "accepted": false, "role": "maintainer", "organization": {"id": 173}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 390}, "invitee": {"id": 3}, "accepted": true, "role": "supervisor", "organization": {"id": 148}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 371}, "invitee": {"id": 14}, "accepted": true, "role": "worker", "organization": {"id": 129}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 352}, "invitee": {"id": 39}, "accepted": true, "role": "owner", "organization": {"id": 196}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 354}, "invitee": {"id": 4}, "accepted": false, "role": "maintainer", "organization": {"id": 131}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 364}, "invitee": {"id": 94}, "accepted": true, "role": "supervisor", "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 22}, "accepted": false, "role": "worker", "organization": {"id": 154}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 378}, "invitee": {"id": 20}, "accepted": true, "role": "owner", "organization": {"id": 163}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 373}, "invitee": {"id": 58}, "accepted": true, "role": "maintainer", "organization": {"id": 169}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 391}, "invitee": {"id": 16}, "accepted": true, "role": "supervisor", "organization": {"id": 133}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_WORKER_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 325}, "invitee": {"id": 25}, "accepted": false, "role": "worker", "organization": {"id": 179}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 382}, "invitee": {"id": 2}, "accepted": true, "role": "owner", "organization": {"id": 180}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 395}, "invitee": {"id": 28}, "accepted": false, "role": "maintainer", "organization": {"id": 178}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 19}, "accepted": false, "role": "supervisor", "organization": {"id": 155}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_OWNER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 345}, "invitee": {"id": 90}, "accepted": true, "role": "worker", "organization": {"id": 158}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 301}, "invitee": {"id": 25}, "accepted": true, "role": "owner", "organization": {"id": 105}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 310}, "invitee": {"id": 33}, "accepted": true, "role": "maintainer", "organization": {"id": 122}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 359}, "invitee": {"id": 87}, "accepted": true, "role": "supervisor", "organization": {"id": 125}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_MAINTAINER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 351}, "invitee": {"id": 19}, "accepted": false, "role": "worker", "organization": {"id": 180}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 19}, "accepted": false, "role": "owner", "organization": {"id": 154}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 388}, "invitee": {"id": 58}, "accepted": true, "role": "maintainer", "organization": {"id": 155}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 370}, "invitee": {"id": 46}, "accepted": true, "role": "supervisor", "organization": {"id": 161}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_SUPERVISOR_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 337}, "invitee": {"id": 27}, "accepted": true, "role": "worker", "organization": {"id": 196}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 306}, "invitee": {"id": 88}, "accepted": true, "role": "owner", "organization": {"id": 186}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 382}, "invitee": {"id": 77}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 45}, "accepted": true, "role": "supervisor", "organization": {"id": 120}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_INVITEE_privilege_NONE_membership_WORKER_resource_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 392}, "invitee": {"id": 73}, "accepted": false, "role": "worker", "organization": {"id": 105}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 375}, "invitee": {"id": 444}, "accepted": true, "role": "owner", "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 472}, "accepted": true, "role": "maintainer", "organization": {"id": 128}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 367}, "invitee": {"id": 413}, "accepted": true, "role": "supervisor", "organization": {"id": 160}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 357}, "invitee": {"id": 458}, "accepted": true, "role": "worker", "organization": {"id": 184}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 376}, "invitee": {"id": 409}, "accepted": true, "role": "owner", "organization": {"id": 128}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 332}, "invitee": {"id": 474}, "accepted": false, "role": "maintainer", "organization": {"id": 140}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 346}, "invitee": {"id": 413}, "accepted": true, "role": "supervisor", "organization": {"id": 182}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 464}, "accepted": false, "role": "worker", "organization": {"id": 103}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 353}, "invitee": {"id": 474}, "accepted": false, "role": "owner", "organization": {"id": 100}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 338}, "invitee": {"id": 487}, "accepted": false, "role": "maintainer", "organization": {"id": 112}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 392}, "invitee": {"id": 493}, "accepted": false, "role": "supervisor", "organization": {"id": 176}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"owner": {"id": 311}, "invitee": {"id": 427}, "accepted": true, "role": "worker", "organization": {"id": 149}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 335}, "invitee": {"id": 485}, "accepted": true, "role": "owner", "organization": {"id": 162}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 301}, "invitee": {"id": 447}, "accepted": false, "role": "maintainer", "organization": {"id": 199}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 354}, "invitee": {"id": 403}, "accepted": true, "role": "supervisor", "organization": {"id": 102}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"owner": {"id": 384}, "invitee": {"id": 454}, "accepted": true, "role": "worker", "organization": {"id": 119}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 380}, "invitee": {"id": 450}, "accepted": false, "role": "owner", "organization": {"id": 103}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 333}, "invitee": {"id": 418}, "accepted": false, "role": "maintainer", "organization": {"id": 144}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 300}, "invitee": {"id": 478}, "accepted": false, "role": "supervisor", "organization": {"id": 149}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"owner": {"id": 347}, "invitee": {"id": 480}, "accepted": false, "role": "worker", "organization": {"id": 155}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 340}, "invitee": {"id": 422}, "accepted": false, "role": "owner", "organization": {"id": 116}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 304}, "invitee": {"id": 481}, "accepted": true, "role": "maintainer", "organization": {"id": 191}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"owner": {"id": 328}, "invitee": {"id": 416}, "accepted": false, "role": "supervisor", "organization": {"id": 120}}}
}

