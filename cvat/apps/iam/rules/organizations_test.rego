package organizations

test_admin_allow {
	allow with input as {
		"auth": {
			"organization": null,
			"user": {"id": 1, "privilege": "admin"},
		}
	}
}

test_empty_not_allow {
	not allow with input as {}
}

test_user_create_allow {
	allow with input as {
		"auth": {
			"organization": null,
			"user": {"id": 2, "privilege": "user"},
		},
		"scope": "create",
		"resource": {
			"user": {"num_resources": 0}
		}
	}
}

test_user_create_not_allow {
	not allow with input as {
		"auth": {
			"organization": null,
			"user": {"id": 2, "privilege": "user"},
		},
		"scope": "create",
		"resource": {
			"user": {"num_resources": 1}
		}
	}
}

test_worker_create_not_allow {
	not allow with input as {
		"auth": {
			"organization": null,
			"user": {"id": 2, "privilege": "worker"},
		},
		"scope": "create",
		"resource": {
			"user": {"num_resources": 1}
		}
	}
}

test_business_create_allow {
	allow with input as {
		"auth": {
			"organization": null,
			"user": {"id": 2, "privilege": "business"},
		},
		"scope": "create",
		"resource": {
			"user": {"num_resources": 10}
		}
	}
}

test_anybody_list_allow {
	allow with input as {"scope": "list"}
}

test_owner_view_allow {
	allow with input as {
		"auth": {"organization": null, "user": {"id": 5, "privilege": "worker"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": null}},
		"scope": "view"
	}
}

test_member_view_allow {
	allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": "supervisor"}},
		"scope": "view"
	}
}

test_non_member_view_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "user"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": null}},
		"scope": "view"
	}
}

test_owner_update_allow {
	allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
		"resource": {"id": 10, "owner": {"id": 7}, "user": {"role": "owner"}},
		"scope": "update"
	}
}

test_nobody_update_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": null}},
		"resource": {"id": 10, "owner": {"id": 7}, "user": {"role": "owner"}},
		"scope": "update"
	}
}

test_non_member_update_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "user"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": null}},
		"scope": "update"
	}
}

test_owner_delete_allow {
	allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
		"resource": {"id": 10, "owner": {"id": 7}, "user": {"role": "owner"}},
		"scope": "delete"
	}
}

test_nobody_delete_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": null}},
		"resource": {"id": 10, "owner": {"id": 7}, "user": {"role": "owner"}},
		"scope": "delete"
	}
}


test_member_delete_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "worker"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": "maintainer"}},
		"scope": "delete"
	}
}

test_non_member_delete_not_allow {
	not allow with input as {
		"auth": {"organization": null, "user": {"id": 7, "privilege": "user"}},
		"resource": {"id": 10, "owner": {"id": 5}, "user": {"role": null}},
		"scope": "delete"
	}
}
