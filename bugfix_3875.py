class AnnotationManager:
    def __init__(self, max_polygons_per_image=1000):
        self.annotations = []
        self.max_polygons_per_image = max_polygons_per_image

    def add_annotation(self, polygon):
        if len(self.annotations) >= self.max_polygons_per_image:
            raise ValueError("Cannot add more annotations, maximum limit reached.")
        self.annotations.append(polygon)

    def get_annotations(self):
        return self.annotations

def test_annotation_manager():
    manager = AnnotationManager()
    for i in range(1001):
        try:
            manager.add_annotation((0, 0, 1, 1))
        except ValueError as e:
            assert str(e) == "Cannot add more annotations, maximum limit reached."
            break
    else:
        assert False, "Test failed: No exception raised for exceeding max annotations."

    # Test to ensure that annotations are added correctly
    assert len(manager.get_annotations()) == 1000, "Test failed: Annotations not added correctly."

# Run the test
test_annotation_manager()