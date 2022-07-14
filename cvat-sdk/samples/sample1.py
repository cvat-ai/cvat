from cvat_sdk.core import Client

if __name__ == '__main__':
    with Client('localhost:7000', ('admin', 'admin')) as client:
        tasks, _ = client.api.tasks_api.list()
        pass
