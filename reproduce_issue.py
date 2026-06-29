import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")
django.setup()

from cvat.apps.engine.models import Task, Data, StorageChoice
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

def test_task_name_uniqueness():
    # Ensure we have a user
    user, _ = User.objects.get_or_create(username="testuser")
    
    # Create a Data object (required for Task)
    data = Data.objects.create(storage=StorageChoice.LOCAL)
    
    name = "Duplicate Task Name"
    
    # Create the first task
    task1 = Task(name=name, owner=user, data=data)
    task1.save()
    print(f"Created task1 with name: {name}")
    
    # Try to create the second task with the same name
    task2 = Task(name=name, owner=user, data=data)
    try:
        task2.save()
        print("Error: Successfully created second task with duplicate name!")
    except ValidationError as e:
        print(f"Caught expected ValidationError: {e}")
    finally:
        # Cleanup
        task1.delete()
        data.delete()

if __name__ == "__main__":
    test_task_name_uniqueness()
