/* eslint-disable */

const aboutDummyData = {
    "name": "Computer Vision Annotation Tool",
    "description": "CVAT is completely re-designed and re-implemented version of Video Annotation Tool from Irvine, California tool. It is free, online, interactive video and image annotation tool for computer vision. It is being used by our team to annotate million of objects with different properties. Many UI and UX decisions are based on feedbacks from professional data annotation team.",
    "version": "0.5.dev20190516142240"
}

const usersDummyData = {
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "url": "http://localhost:7000/api/v1/users/1",
            "id": 1,
            "username": "admin",
            "first_name": "",
            "last_name": "",
            "email": "admin@dummy.com",
            "groups": [
                "admin"
            ],
            "is_staff": true,
            "is_superuser": true,
            "is_active": true,
            "last_login": "2019-05-17T11:53:05.961434+03:00",
            "date_joined": "2019-05-13T15:33:17.833200+03:00"
        },
        {
            "url": "http://localhost:7000/api/v1/users/2",
            "id": 2,
            "username": "bsekache",
            "first_name": "",
            "last_name": "",
            "email": "",
            "groups": [
                "user",
                "observer"
            ],
            "is_staff": false,
            "is_superuser": false,
            "is_active": true,
            "last_login": "2019-05-16T13:07:19.564241+03:00",
            "date_joined": "2019-05-16T13:05:57+03:00"
        }
    ]
}

const shareDummyData = [
    {
        "name": "images",
        "type": "DIR",
        "children": [
            {
                "name": "image000001.jpg",
                "type": "REG"
            },
            {
                "name": "nowy-jork-time-sqare.jpg",
                "type": "REG"
            },
            {
                "name": "123123.jpg",
                "type": "REG"
            },
            {
                "name": "ws_Oasis-night_1920x1200.jpg",
                "type": "REG"
            },
            {
                "name": "image000002.jpg",
                "type": "REG"
            },
            {
                "name": "fdgdfgfd.jpg",
                "type": "REG"
            },
            {
                "name": "bbbbb.jpg",
                "type": "REG"
            },
            {
                "name": "gdfgdfgdf.jpg",
                "type": "REG"
            }
        ]
    },
    {
        "name": "2.avi",
        "type": "REG"
    },
    {
        "name": "data",
        "type": "DIR",
        "children": [],
    },
    {
        "name": "out.MOV",
        "type": "REG"
    },
    {
        "name": "bbbbb.jpg",
        "type": "REG"
    }
]

const tasksDummyData = {
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
        {
            "url": "http://localhost:7000/api/v1/tasks/3",
            "id": 3,
            "name": "Test Task",
            "size": 5002,
            "mode": "interpolation",
            "owner": 2,
            "assignee": null,
            "bug_tracker": "",
            "created_date": "2019-05-16T13:08:00.621747+03:00",
            "updated_date": "2019-05-16T13:08:00.621797+03:00",
            "overlap": 5,
            "segment_size": 5000,
            "z_order": true,
            "flipped": false,
            "status": "annotation",
            "labels": [
                {
                    "id": 16,
                    "name": "bicycle",
                    "attributes": [
                        {
                            "id": 43,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "radio",
                            "default_value": "man",
                            "values": [
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 44,
                            "name": "sport",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        }
                    ]
                },
                {
                    "id": 15,
                    "name": "car",
                    "attributes": [
                        {
                            "id": 40,
                            "name": "model",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "bmw",
                                "mazda",
                                "suzuki",
                                "kia"
                            ]
                        },
                        {
                            "id": 41,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 42,
                            "name": "parked",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "true",
                            "values": [
                                "true"
                            ]
                        }
                    ]
                },
                {
                    "id": 14,
                    "name": "face",
                    "attributes": [
                        {
                            "id": 36,
                            "name": "age",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "baby (0-5)",
                                "child (6-12)",
                                "adolescent (13-19)",
                                "adult (20-45)",
                                "middle-age (46-64)",
                                "old (65-)"
                            ]
                        },
                        {
                            "id": 37,
                            "name": "glass",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "sunglass",
                                "transparent",
                                "other"
                            ]
                        },
                        {
                            "id": 38,
                            "name": "beard",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "yes"
                            ]
                        },
                        {
                            "id": 39,
                            "name": "race",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "asian",
                                "black",
                                "caucasian",
                                "other"
                            ]
                        }
                    ]
                },
                {
                    "id": 17,
                    "name": "motorcycle",
                    "attributes": [
                        {
                            "id": 45,
                            "name": "model",
                            "mutable": false,
                            "input_type": "text",
                            "default_value": "unknown",
                            "values": [
                                "unknown"
                            ]
                        }
                    ]
                },
                {
                    "id": 13,
                    "name": "person, pedestrian",
                    "attributes": [
                        {
                            "id": 31,
                            "name": "action",
                            "mutable": true,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "sitting",
                                "raising_hand",
                                "standing"
                            ]
                        },
                        {
                            "id": 32,
                            "name": "age",
                            "mutable": false,
                            "input_type": "number",
                            "default_value": "1",
                            "values": [
                                "1",
                                "100",
                                "1"
                            ]
                        },
                        {
                            "id": 33,
                            "name": "gender",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "male",
                            "values": [
                                "male",
                                "female"
                            ]
                        },
                        {
                            "id": 34,
                            "name": "false positive",
                            "mutable": false,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        },
                        {
                            "id": 35,
                            "name": "clother",
                            "mutable": true,
                            "input_type": "text",
                            "default_value": "non, initialized",
                            "values": [
                                "non, initialized"
                            ]
                        }
                    ]
                },
                {
                    "id": 18,
                    "name": "road",
                    "attributes": []
                }
            ],
            "segments": [
                {
                    "start_frame": 0,
                    "stop_frame": 4999,
                    "jobs": [
                        {
                            "url": "http://localhost:7000/api/v1/jobs/3",
                            "id": 3,
                            "assignee": null,
                            "status": "annotation"
                        }
                    ]
                },
                {
                    "start_frame": 4995,
                    "stop_frame": 5001,
                    "jobs": [
                        {
                            "url": "http://localhost:7000/api/v1/jobs/4",
                            "id": 4,
                            "assignee": null,
                            "status": "annotation"
                        }
                    ]
                }
            ],
            "image_quality": 50
        },
        {
            "url": "http://localhost:7000/api/v1/tasks/2",
            "id": 2,
            "name": "Video",
            "size": 75,
            "mode": "interpolation",
            "owner": 1,
            "assignee": null,
            "bug_tracker": "",
            "created_date": "2019-05-15T11:40:19.487999+03:00",
            "updated_date": "2019-05-15T16:58:27.992785+03:00",
            "overlap": 5,
            "segment_size": 0,
            "z_order": false,
            "flipped": false,
            "status": "annotation",
            "labels": [
                {
                    "id": 10,
                    "name": "bicycle",
                    "attributes": [
                        {
                            "id": 28,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "radio",
                            "default_value": "man",
                            "values": [
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 29,
                            "name": "sport",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        }
                    ]
                },
                {
                    "id": 9,
                    "name": "car",
                    "attributes": [
                        {
                            "id": 25,
                            "name": "model",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "bmw",
                                "mazda",
                                "suzuki",
                                "kia"
                            ]
                        },
                        {
                            "id": 26,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 27,
                            "name": "parked",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "true",
                            "values": [
                                "true"
                            ]
                        }
                    ]
                },
                {
                    "id": 8,
                    "name": "face",
                    "attributes": [
                        {
                            "id": 21,
                            "name": "age",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "baby (0-5)",
                                "child (6-12)",
                                "adolescent (13-19)",
                                "adult (20-45)",
                                "middle-age (46-64)",
                                "old (65-)"
                            ]
                        },
                        {
                            "id": 22,
                            "name": "glass",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "sunglass",
                                "transparent",
                                "other"
                            ]
                        },
                        {
                            "id": 23,
                            "name": "beard",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "yes"
                            ]
                        },
                        {
                            "id": 24,
                            "name": "race",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "asian",
                                "black",
                                "caucasian",
                                "other"
                            ]
                        }
                    ]
                },
                {
                    "id": 11,
                    "name": "motorcycle",
                    "attributes": [
                        {
                            "id": 30,
                            "name": "model",
                            "mutable": false,
                            "input_type": "text",
                            "default_value": "unknown",
                            "values": [
                                "unknown"
                            ]
                        }
                    ]
                },
                {
                    "id": 7,
                    "name": "person, pedestrian",
                    "attributes": [
                        {
                            "id": 16,
                            "name": "action",
                            "mutable": true,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "sitting",
                                "raising_hand",
                                "standing"
                            ]
                        },
                        {
                            "id": 17,
                            "name": "age",
                            "mutable": false,
                            "input_type": "number",
                            "default_value": "1",
                            "values": [
                                "1",
                                "100",
                                "1"
                            ]
                        },
                        {
                            "id": 18,
                            "name": "gender",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "male",
                            "values": [
                                "male",
                                "female"
                            ]
                        },
                        {
                            "id": 19,
                            "name": "false positive",
                            "mutable": false,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        },
                        {
                            "id": 20,
                            "name": "clother",
                            "mutable": true,
                            "input_type": "text",
                            "default_value": "non, initialized",
                            "values": [
                                "non, initialized"
                            ]
                        }
                    ]
                },
                {
                    "id": 12,
                    "name": "road",
                    "attributes": []
                }
            ],
            "segments": [
                {
                    "start_frame": 0,
                    "stop_frame": 74,
                    "jobs": [
                        {
                            "url": "http://localhost:7000/api/v1/jobs/2",
                            "id": 2,
                            "assignee": null,
                            "status": "annotation"
                        }
                    ]
                }
            ],
            "image_quality": 50
        },
        {
            "url": "http://localhost:7000/api/v1/tasks/1",
            "id": 1,
            "name": "Labels Set",
            "size": 9,
            "mode": "annotation",
            "owner": 1,
            "assignee": null,
            "bug_tracker": "http://bugtracker.com/issue12345",
            "created_date": "2019-05-13T15:35:29.871003+03:00",
            "updated_date": "2019-05-15T11:20:55.770587+03:00",
            "overlap": 0,
            "segment_size": 0,
            "z_order": true,
            "flipped": false,
            "status": "annotation",
            "labels": [
                {
                    "id": 4,
                    "name": "bicycle",
                    "attributes": [
                        {
                            "id": 13,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "radio",
                            "default_value": "man",
                            "values": [
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 14,
                            "name": "sport",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        }
                    ]
                },
                {
                    "id": 3,
                    "name": "car",
                    "attributes": [
                        {
                            "id": 10,
                            "name": "model",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "bmw",
                                "mazda",
                                "suzuki",
                                "kia"
                            ]
                        },
                        {
                            "id": 11,
                            "name": "driver",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "man",
                                "woman"
                            ]
                        },
                        {
                            "id": 12,
                            "name": "parked",
                            "mutable": true,
                            "input_type": "checkbox",
                            "default_value": "true",
                            "values": [
                                "true"
                            ]
                        }
                    ]
                },
                {
                    "id": 2,
                    "name": "face",
                    "attributes": [
                        {
                            "id": 6,
                            "name": "age",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "baby (0-5)",
                                "child (6-12)",
                                "adolescent (13-19)",
                                "adult (20-45)",
                                "middle-age (46-64)",
                                "old (65-)"
                            ]
                        },
                        {
                            "id": 7,
                            "name": "glass",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "sunglass",
                                "transparent",
                                "other"
                            ]
                        },
                        {
                            "id": 8,
                            "name": "beard",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "no",
                                "yes"
                            ]
                        },
                        {
                            "id": 9,
                            "name": "race",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "skip",
                                "asian",
                                "black",
                                "caucasian",
                                "other"
                            ]
                        }
                    ]
                },
                {
                    "id": 5,
                    "name": "motorcycle",
                    "attributes": [
                        {
                            "id": 15,
                            "name": "model",
                            "mutable": false,
                            "input_type": "text",
                            "default_value": "unknown",
                            "values": [
                                "unknown"
                            ]
                        }
                    ]
                },
                {
                    "id": 1,
                    "name": "person, pedestrian",
                    "attributes": [
                        {
                            "id": 1,
                            "name": "action",
                            "mutable": true,
                            "input_type": "select",
                            "default_value": "__undefined__",
                            "values": [
                                "__undefined__",
                                "sitting",
                                "raising_hand",
                                "standing"
                            ]
                        },
                        {
                            "id": 2,
                            "name": "age",
                            "mutable": false,
                            "input_type": "number",
                            "default_value": "1",
                            "values": [
                                "1",
                                "100",
                                "1"
                            ]
                        },
                        {
                            "id": 3,
                            "name": "gender",
                            "mutable": false,
                            "input_type": "select",
                            "default_value": "male",
                            "values": [
                                "male",
                                "female"
                            ]
                        },
                        {
                            "id": 4,
                            "name": "false positive",
                            "mutable": false,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [
                                "false"
                            ]
                        },
                        {
                            "id": 5,
                            "name": "clother",
                            "mutable": true,
                            "input_type": "text",
                            "default_value": "non, initialized",
                            "values": [
                                "non, initialized"
                            ]
                        }
                    ]
                },
                {
                    "id": 6,
                    "name": "road",
                    "attributes": []
                }
            ],
            "segments": [
                {
                    "start_frame": 0,
                    "stop_frame": 8,
                    "jobs": [
                        {
                            "url": "http://localhost:7000/api/v1/jobs/1",
                            "id": 1,
                            "assignee": null,
                            "status": "annotation"
                        }
                    ]
                }
            ],
            "image_quality": 95
        }
    ]
}

module.exports = {
    tasksDummyData,
    aboutDummyData,
    shareDummyData,
    usersDummyData,
}