from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from cvat.apps.engine.models import (
    Project, Task, Segment, Job, Label, 
    LabeledShape, LabeledTrack, TrackedShape
)

User = get_user_model()

class TestTaskAnnotationStatsView(APITestCase):
    def setUp(self):
        # Create an owner and an unauthorized user
        self.owner = User.objects.create_user(username="owner", password="password", is_superuser=True)
        self.other_user = User.objects.create_user(username="other", password="password")

        # Create project and task
        self.project = Project.objects.create(name="Test Project", owner=self.owner)
        self.task = Task.objects.create(name="Test Task", owner=self.owner, project=self.project)
        
        # Create segment and job
        self.segment = Segment.objects.create(task=self.task)
        self.job = Job.objects.create(segment=self.segment, assignee=self.owner)

        # Create labels
        self.label_person = Label.objects.create(name="Person", project=self.project, color="#ff0000")
        self.label_car = Label.objects.create(name="Car", project=self.project, color="#00ff00")
        self.label_empty = Label.objects.create(name="Empty", project=self.project, color="#0000ff")

        # Create annotations for Person
        LabeledShape.objects.create(job=self.job, label=self.label_person, type="rectangle", frame=0)
        LabeledShape.objects.create(job=self.job, label=self.label_person, type="polygon", frame=1)
        
        track = LabeledTrack.objects.create(job=self.job, label=self.label_person, frame=0)
        TrackedShape.objects.create(track=track, type="rectangle", frame=0)

        # Create annotations for Car
        LabeledShape.objects.create(job=self.job, label=self.label_car, type="rectangle", frame=0)

        self.url = f'/api/test/tasks/{self.task.id}/annotations/stats'

    def test_unauthenticated_request(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthorized_request(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(self.url)
        # CVAT typically returns 403 or 404 depending on how object retrieval works for non-owners.
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_correct_aggregation(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        self.assertEqual(data["task_id"], self.task.id)
        self.assertEqual(data["total_annotations"], 4) # 3 for person, 1 for car
        
        classes = data["classes"]
        self.assertEqual(len(classes), 3)

        person_class = next(c for c in classes if c["id"] == self.label_person.id)
        self.assertEqual(person_class["shapes"], 2)
        self.assertEqual(person_class["tracks"], 1)
        self.assertEqual(person_class["tags"], 0)
        self.assertEqual(person_class["intervals"], 0)
        self.assertEqual(person_class["total"], 3)

        car_class = next(c for c in classes if c["id"] == self.label_car.id)
        self.assertEqual(car_class["shapes"], 1)
        self.assertEqual(car_class["total"], 1)

    def test_empty_data_state(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        
        data = response.json()
        classes = data["classes"]
        empty_class = next(c for c in classes if c["id"] == self.label_empty.id)
        self.assertEqual(empty_class["shapes"], 0)
        self.assertEqual(empty_class["tracks"], 0)
        self.assertEqual(empty_class["tags"], 0)
        self.assertEqual(empty_class["intervals"], 0)
        self.assertEqual(empty_class["total"], 0)
