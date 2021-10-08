package organizations

data_admin1 := {"auth": {
	"organization": null,
	"user": {"id": 1, "privilege": "admin"},
}}

test_admin_allow {
	allow with input as data_admin1
}

test_empty_not_allow {
	not allow with input as {}
}

data_user1 := {
	"auth": {
		"organization": null,
		"user": {"id": 2, "privilege": "user"},
	},
	"scope": "CREATE",
	"user": {"num_resources": 0},
}

test_user_create_allow {
	allow with input as data_user1
}

data_user2 := {
	"auth": {
		"organization": null,
		"user": {"id": 2, "privilege": "user"},
	},
	"scope": "CREATE",
	"user": {"num_resources": 1},
}

test_user_create_not_allow {
	not allow with input as data_user2
}

data_worker1 := {
	"auth": {
		"organization": null,
		"user": {"id": 2, "privilege": "worker"},
	},
	"scope": "CREATE",
	"user": {"num_resources": 1},
}

test_worker_create_not_allow {
	not allow with input as data_worker1
}

data_business1 := {
	"auth": {
		"organization": null,
		"user": {"id": 2, "privilege": "business"},
	},
	"scope": "CREATE",
	"user": {"num_resources": 10},
}

test_business_create_allow {
	allow with input as data_business1
}

test_anybody_list_allow {
	allow with input as {"scope": "LIST"}
}

data_worker2 := {
    "auth": {"organization": null, "user": {"id": 5, "privilege": "worker"}},
    "resource": {"id": 10, "owner": {"id": 5}, "role": null},
    "scope": "VIEW",
    "user": {"num_resources": 2}
}

test_owner_view_allow {
    allow with input as data_worker2
}

data_worker3 := {
    "auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
    "resource": {"id": 10, "owner": {"id": 5}, "role": "worker"},
    "scope": "VIEW",
    "user": {"num_resources": 2}
}

test_member_view_allow {
    allow with input as data_worker3
}

data_user3 := {
    "auth": {"organization": null, "user": {"id": 7, "privilege": "user"}},
    "resource": {"id": 10, "owner": {"id": 5}, "role": null},
    "scope": "VIEW",
}

test_non_member_view_not_allow {
    not allow with input as data_user3
}

data_worker4 := {
    "auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
    "resource": {"id": 10, "owner": {"id": 7}, "role": "owner"},
    "scope": "UPDATE",
    "user": {"num_resources": 1}
}

test_owner_update_allow {
    allow with input as data_worker4
}

data_nobody := {
    "auth": {"organization": null, "user": {"id": 7, "privilege": null}},
    "resource": {"id": 10, "owner": {"id": 7}, "role": "owner"},
    "scope": "UPDATE",
    "user": {"num_resources": 1}
}

test_nobody_update_not_allow {
    not allow with input as data_nobody
}