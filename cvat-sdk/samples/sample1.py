from cvat_sdk.core import Client, models
from cvat_sdk.types import ResourceType

if __name__ == "__main__":
    with Client("localhost:7000", ("admin", "admin")) as client:
        task_id = client.create_task(models.TaskWriteRequest(name="test1",
            labels=[{
                'name': "cat",
                'attributes': [
                    models.AttributeRequest('color',
                        mutable=True,
                        input_type=models.InputTypeEnum("select"),
                        default_value="red", values=["red", "green", "blue"]
                    )
                ],
            }],
            subset="train"
        ), resource_type=ResourceType.LOCAL, resources=[
            'data/1.png',
            'data/2.png',
            'data/3.png',
        ])

        print(task_id)
