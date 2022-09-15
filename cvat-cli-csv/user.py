

class User:
	def __init__(self, url, id, username, first_name="", last_name=""):
		self.url = url
		self.id = id
		self.username = username
		self.first_name = first_name
		self.last_name = last_name

	def get_dict(self):
		return {"url": self.url, "id": self.id, "username": self.username, "first_name": self.first_name, "last_name": self.last_name}
