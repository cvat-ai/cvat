
class Task:
	def __init__(self, organization_name, project_name, task_name, upload_type, upload_path, assignee, jobStage, jobState):
		self.organization_name = organization_name
		self.project_name = project_name
		self.task_name = task_name
		self.upload_type = upload_type
		self.upload_path = upload_path
		self.assignee = assignee
		self.jobStage = jobStage
		self.jobState = jobState

	def get_all(self):
		return self.organization_name, self.project_name, self.task_name, self.upload_type, self.upload_path, self.assignee, self.jobStage, self.jobState
		
	def get(self):
		return self.organization_name, self.project_name, self.task_name, self.assignee, self.jobStage, self.jobState

	def display(self):
		print(self.get_all())

	def check_all(self):
		for i in self.get_all():
			if i == None or str(i) == "" or str(i) == "nan":	
				return False
		return True

	def check(self, str_arg):
		if str_arg == None or str(str_arg) == "" or str(str_arg) == "nan" or str_arg == "None":	
			return False
		return True
