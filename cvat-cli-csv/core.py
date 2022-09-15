
import json
import logging
import os
import requests
#from io import BytesIO
#import mimetypes
from time import sleep
#from PIL import Image

from myTask import Task 

log = logging.getLogger(__name__)


class CLI():
	def __init__(self, session, api, credentials):
		self.api = api
		self.session = session
		self.login(credentials)
		self.resource_type_dict = {"computer" : 0, "connected_file" : 1, "remote" : 2}
		self.LOCAL = 0
		self.SHARE = 1
		self.REMOTE = 2


	def find_organization_name(self, organization_id):
		try:
			for organization in self.organizations_list():
				if organization["id"] == organization_id:
					return organization["name"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))

	def find_project_name(self, project_id):
		try:
			for project in self.projects_list():
				if project["id"] == project_id:
					return project["name"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def find_user_id(self, username):
		try:
			for user in self.users_list():
				if user["username"] == username:
					return user["id"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))

	def find_project_id(self, project_name):
		try:
			for project in self.projects_list():
				if project["name"] == project_name:
					return project["id"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def find_organization_id(self, organization_name):
		try:
			for organization in self.organizations_list():
				if organization["name"] == organization_name:
					return organization["id"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))

	def find_task_id(self, task_name):
		try:
			for task in self.tasks_list():
				if task["name"] == task_name:
					return task["id"]
			return None
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def find_task2job_id(self, task_name, use_json_output=True):
		try:
			for task in self.tasks_list():
				if task["name"] == task_name:
					return task["segments"][0]["jobs"][0]["id"]
			return None


			""" List all projects in either basic or JSON format. """
			url = self.api.users
			response = self.session.get(url)
			response.raise_for_status()
			output = []
			page = 1
			json_data_list = []
			while True:
				response_json = response.json()
				output += response_json['results']
				for r in response_json['results']:
					if use_json_output:
						json_data_list.append(r)
					else:
						log.info('User ID: {id} USERNAME: {username}'.format(**r))
				if not response_json['next']:
					#log.info(json.dumps(json_data_list, indent=4))
					return output
				page += 1
				url = self.api.users_page(page)
				response = self.session.get(url)
				response.raise_for_status()
			return output
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def users_list(self, use_json_output=True):
		try:
			""" List all tasks in either basic or JSON format. """
			url = self.api.users
			response = self.session.get(url)
			response.raise_for_status()
			output = []
			page = 1
			json_data_list = []
			while True:
				response_json = response.json()
				output += response_json['results']
				for r in response_json['results']:
					if use_json_output:
						json_data_list.append(r)
					else:
						log.info('Task ID: {id} NAME: {name}'.format(**r))
				if not response_json['next']:
					#log.info(json.dumps(json_data_list, indent=4))
					return output
				page += 1
				url = self.api.users_page(page)
				response = self.session.get(url)
				response.raise_for_status()
			return output
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def organizations_list(self, use_json_output=True):
		try:
			""" List all organizations in either basic or JSON format. """
			temp_ids = []
			url = self.api.organizations
			response = self.session.get(url)
			response.raise_for_status()
			output = []
			page = 1
			json_data_list = []
			while True:
				response_json = response.json()
				output += response_json
				for r in response_json:
					temp_ids.append(r["id"])
					if temp_ids.count(r["id"]) > 1:
						#log.info(json.dumps(json_data_list, indent=4))
						temp_ids.clear()
						return output
					if use_json_output:
						json_data_list.append(r)
					else:
						log.info('Organization ID: {id} NAME: {name}'.format(**r))
				page += 1
				url = self.api.organizations_page(page)
				response = self.session.get(url)
				response.raise_for_status()
			temp_ids.clear()
			return output
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def projects_list(self, use_json_output=True):
		try:
			""" List all projects in either basic or JSON format. """
			url = self.api.projects
			response = self.session.get(url)
			response.raise_for_status()
			output = []
			page = 1
			json_data_list = []
			while True:
				response_json = response.json()
				output += response_json['results']
				for r in response_json['results']:
					if use_json_output:
						json_data_list.append(r)
					else:
						log.info('Project ID: {id} NAME: {name}'.format(**r))
				if not response_json['next']:
					#log.info(json.dumps(json_data_list, indent=4))
					return output
				page += 1
				url = self.api.projects_page(page)
				response = self.session.get(url)
				response.raise_for_status()
			return output
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_list(self, use_json_output=True):
		try:
			""" List all tasks in either basic or JSON format. """
			url = self.api.tasks
			response = self.session.get(url)
			response.raise_for_status()
			output = []
			page = 1
			json_data_list = []
			while True:
				response_json = response.json()
				output += response_json['results']
				for r in response_json['results']:
					if use_json_output:
						json_data_list.append(r)
					else:
						log.info('Task ID: {id} NAME: {name}'.format(**r))
				if not response_json['next']:
					#log.info(json.dumps(json_data_list, indent=4))
					return output
				page += 1
				url = self.api.tasks_page(page)
				response = self.session.get(url)
				response.raise_for_status()
			return output
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def job_create(self,assignee, job_id, organization_name):
		try:
			print("Job creating...")
			url = self.api.jobs_id(job_id) + "?org=" + str(organization_name)
			data = {}
			data["assignee"] = assignee.id
			response = self.session.patch(url, data)
			response.raise_for_status()
			response_json = response.json()
			log.info('Assigned user ID: {assignee[id]} NAME: {assignee[username]}'.format(**response_json))
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))
			

	def assignee_create(self, assignee, task_id, organization_name):
		try:
			print("Assigne...")
			if assignee is not None:
				url = self.api.tasks_id_jobs(task_id) + "?org=" + str(organization_name)
				data = {}
				response = self.session.get(url)
				response.raise_for_status()
				response_json = response.json()
				job_id = response_json[0]["id"]
				self.job_create(assignee, job_id, organization_name)
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_data(self, task_id, resource_type, resources, organization_name, assignee, chunk_size=None, copy_data=None, image_quality=70, sorting_method="lexicographical",
			start_frame=None, stop_frame=None, use_cache=True, use_zip_chunks=True, frame_step=None, segment_size=None, mode="annotation"):
		try:
			""" Add local, remote, or shared files to an existing task. """
			url = self.api.tasks_id_data(task_id) + "?org=" + str(organization_name)
			get_url_status = self.api.tasks_id_status(task_id) + "?org=" + str(organization_name)
			get_url = self.api.tasks_id(task_id) + "?org=" + str(organization_name)
			print("Data loading...")
			data = {}
			files = None

			if self.resource_type_dict[resource_type] == self.LOCAL:
				files = {'client_files[{}]'.format(i): open(f, 'rb') for i, f in enumerate(resources)}
			elif self.resource_type_dict[resource_type] == self.REMOTE:
				data = {'remote_files[{}]'.format(i): f for i, f in enumerate(resources)}
			elif self.resource_type_dict[resource_type] == self.SHARE:
				data = {'server_files[{}]'.format(i): f for i, f in enumerate(resources)}

			if image_quality is not None:
				data["image_quality"] = image_quality
			if start_frame is not None:
				data["start_frame"] = start_frame
			if stop_frame is not None:
				data["stop_frame"] = stop_frame
			if segment_size is not None:
				data["segment_size"] = segment_size
			if chunk_size is not None:
				data["chunk_size"] = chunk_size
			if copy_data is not None:
				data["copy_data"] = copy_data
			if sorting_method is not None:
				data["sorting_method"] = sorting_method
			if use_cache is not None:
				data["use_cache"] = use_cache
			if use_zip_chunks is not None:
				data["use_zip_chunks"] = use_zip_chunks
			if frame_step is not None:
				data['frame_filter'] = f"step={frame_step}"
			if mode is not None:
				data['mode'] = mode
			data['mode'] = "annotation"
			data['overlap'] = 0
			
			response = self.session.post(url, data=data, files=files)
			response.raise_for_status()
			
			response = self.session.get(get_url_status)
			response_json = response.json()
			while not response_json["state"] == "Finished":
				sleep(0.2)
				response = self.session.get(get_url_status)
				response_json = response.json()		
			response = self.session.get(get_url)
			response_json = response.json()
			log.info("Uploaded files")
			self.assignee_create(assignee, task_id, organization_name)
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_create(self, name,  project_id, resource_type, resources, organization_name, assignee, annotation_path='', annotation_format='PASCAL VOC 1.1', 
			completion_verification_period=20, git_completion_verification_period=2, dataset_repository_url='', lfs=False, labels=None, bug_tracker=None, overlap=None, 
			chunk_size=None, copy_data=None, image_quality=70, sorting_method="lexicographical", start_frame=None, stop_frame=None, use_cache=True, use_zip_chunks=True, 
			frame_step=None, segment_size=None, mode="annotation"):
		try:
			""" Create a new task with the given name and labels JSON and
			add the files to it. """
			url = self.api.tasks + "?org=" + str(organization_name)
			labels = [] if project_id is not None else labels
			data = {'name': name,
					'labels': labels
			}

			data["project_id"] = project_id
			data["mode"] = "annotation"

			response = self.session.post(url, json=data)
			response.raise_for_status()
			response_json = response.json()
			log.info('Created task ID: {id} NAME: {name} MODE: {mode}'.format(**response_json))
			task_id = response_json['id']
			self.tasks_data(task_id, resource_type, resources, organization_name, assignee, chunk_size, copy_data, image_quality, sorting_method,
							start_frame, stop_frame, use_cache, use_zip_chunks, frame_step, segment_size, mode)

			if annotation_path != '':
				url = self.api.tasks_id_status(task_id)
				response = self.session.get(url)
				response_json = response.json()
				log.info('Awaiting data compression before uploading annotations...')
				while response_json['state'] != 'Finished':
					sleep(completion_verification_period)
					response = self.session.get(url)
					response_json = response.json()
					logger_string= '''Awaiting compression for task {}.Status={}, Message={}'''.format(task_id, response_json['state'], response_json['message'])
					log.info(logger_string)
				self.tasks_upload(task_id, annotation_format, annotation_path)

			if dataset_repository_url:
				response = self.session.post(
							self.api.git_create(task_id),
							json={
								'path': dataset_repository_url,
								'lfs': lfs,
								'tid': task_id})
				response_json = response.json()
				rq_id = response_json['rq_id']
				log.info(f"Create RQ ID: {rq_id}")
				check_url = self.api.git_check(rq_id)
				response = self.session.get(check_url)
				response_json = response.json()
				while response_json['status'] != 'finished':
					log.info('''Awaiting a dataset repository to be created for the task. Response status: {}'''.format(
						response_json['status']))
					sleep(git_completion_verification_period)
					response = self.session.get(check_url)
					response_json = response.json()
					if response_json['status'] == 'failed' or response_json['status'] == 'unknown':
						log.error(f'Dataset repository creation request for task {task_id} failed with status {response_json["status"]}.')
						break
				log.info(f"Dataset repository creation completed with status: {response_json['status']}.")
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))

	
	def create_list(self, task):
		try:
			organization_name = self.find_organization_name(task["organization"])
			project_name = self.find_project_name(task["project_id"])
			if project_name is None:
				project_name = "None"
			if task["segments"][0]["jobs"][0]["assignee"] is None:
				assignee_name = "None"
			else:
				assignee_name = task["segments"][0]["jobs"][0]["assignee"]["username"]
			return Task(organization_name, project_name, task["name"], "", "", assignee_name, task["segments"][0]["jobs"][0]["stage"], task["segments"][0]["jobs"][0]["state"])
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_list_special(self, args):
		try:
			filters = {}

			if not args.organization is None:
				filters["organization_id"] = self.find_organization_id(args.organization)
			if not args.project is None:
				filters["project_id"] = self.find_project_id(args.project)
			if not args.jobstage is None:
				filters["jobstage"] = args.jobstage.replace("_", " ")
			if not args.jobstate is None:
				filters["jobstate"] = args.jobstate.replace("_", " ")
			
			#filter_tasks = []
			result_tasks = []
			tasks = self.tasks_list()
			for task in tasks:
				if len(filters) == 0:
					result_tasks.append(self.create_list(task))
				else:
					get_flag = True
					for key, value in filters.items():
						if key == "organization_id":
							if not task["organization"] == value:
								get_flag = False
						if key == "project_id":
							if not task["project_id"] == value:
								get_flag = False						
						if key == "jobstage":
							if not task["segments"][0]["jobs"][0]["stage"] == value:
								get_flag = False
						if key == "jobstate":
							if not task["segments"][0]["jobs"][0]["state"] == value:
								get_flag = False

						if args.andor == "or" and get_flag:
							result_tasks.append(self.create_list(task))
					if (not args.andor == "or") and get_flag:
						result_tasks.append(self.create_list(task))
			return result_tasks
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_update(self, job_id, state, stage):
		try:
			print("Updating..")
			data = {}
			data["state"] = state
			data["stage"] = stage
			url = self.api.jobs_id(job_id)
			response = self.session.put(url, data=data)
			try:
				response.raise_for_status()
				log.info('Job ID: {} STATE: {} STAGE: {} updated'.format(job_id, state, stage))
			except requests.exceptions.HTTPError as e:
				if response.status_code == 404:
					log.error('Job ID {} not found'.format(job_id))
					raise e
				else:
					log.error(str(e))
					raise e
		except Exception as e:
			log.error("Failed update")			
			log.error(str(e))
			raise Exception(str(e))

	def tasks_delete(self, task_ids):
		try:
			""" Delete a list of tasks, ignoring those which don't exist. """
			for task_id in task_ids:
				url = self.api.tasks_id(task_id)
				response = self.session.delete(url)
				try:
					response.raise_for_status()
					log.info('Task ID {} deleted'.format(task_id))
				except requests.exceptions.HTTPError as e:
					if response.status_code == 404:
						log.info('Task ID {} not found'.format(task_id))
					else:
						raise e
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))

	"""
	def tasks_frame(self, task_id, frame_ids, outdir='', quality='original'):
		# Download the requested frame numbers for a task and save images as task_<ID>_frame_<FRAME>.jpg. #
		try:
			for frame_id in frame_ids:
				url = self.api.tasks_id_frame_id(task_id, frame_id, quality)
				response = self.session.get(url)
				response.raise_for_status()
				im = Image.open(BytesIO(response.content))
				mime_type = im.get_format_mimetype() or 'image/jpg'
				im_ext = mimetypes.guess_extension(mime_type)
				# FIXME It is better to use meta information from the server
				# to determine the extension
				# replace '.jpe' or '.jpeg' with a more used '.jpg'
				if im_ext in ('.jpe', '.jpeg', None):
					im_ext = '.jpg'
				outfile = 'task_{}_frame_{:06d}{}'.format(task_id, frame_id, im_ext)
				im.save(os.path.join(outdir, outfile))
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))
	"""

	def tasks_dump(self, task_id, fileformat, filename):
		""" Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0')."""
		try:
			url = self.api.tasks_id(task_id)
			response = self.session.get(url)
			response.raise_for_status()
			response_json = response.json()
			url = self.api.tasks_id_annotations_filename(task_id, response_json['name'], fileformat)
			while True:
				response = self.session.get(url)
				response.raise_for_status()
				log.info('STATUS {}'.format(response.status_code))
				if response.status_code == 201:
					break
			response = self.session.get(url + '&action=download')
			response.raise_for_status()
			with open(filename, 'wb') as fp:
				fp.write(response.content)
			logger_string = "Task {} has been dump sucessfully. FORMAT {} ".format(task_id, fileformat) +\
				"FILE {}".format(os.path.abspath(filename))
			log.info(logger_string)
		except Exception as e:
			logger_string = "Task {} has been dump Failed. FORMAT {} ".format(task_id, fileformat) +\
				"FILE {}".format(os.path.abspath(filename))
			log.error(logger_string)
			log.error(str(e))
			raise Exception(str(e))


	def tasks_upload(self, task_id, fileformat, filename):
		try:
			""" Upload annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0')."""
			url = self.api.tasks_id_annotations_format(task_id, fileformat)
			while True:
				response = self.session.put(
					url,
					files={'annotation_file': open(filename, 'rb')}
				)
				response.raise_for_status()
				if response.status_code == 201:
					break
			logger_string = "Upload job for Task ID {} ".format(task_id) +\
			    "with annotation file {} finished".format(filename)
			log.info(logger_string)
		except Exception as e:
			logger_string = "Upload job for Task ID {} ".format(task_id) +\
			    "with annotation file {} Failed".format(filename)
			log.error(logger_string)
			log.error(str(e))
			raise Exception(str(e))


	def tasks_export(self, task_id, filename, export_verification_period=3):
		""" Export and download a whole task """
		try:
			export_url = self.api.tasks_id(task_id) + '/backup'
			while True:
				response = self.session.get(export_url)
				response.raise_for_status()
				log.info('STATUS {}'.format(response.status_code))
				if response.status_code == 201:
					break
				sleep(export_verification_period)
			response = self.session.get(export_url + '?action=download')
			response.raise_for_status()
			with open(filename, 'wb') as fp:
				fp.write(response.content)
			logger_string = "Task {} has been exported sucessfully. ".format(task_id) +\
				"to {}".format(os.path.abspath(filename))
			log.info(logger_string)
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def tasks_import(self, filename, import_verification_period=3):
		""" Import a task""",
		try:
			url = self.api.tasks + '/backup'
			with open(filename, 'rb') as input_file:
				response = self.session.post(
					url,
					files={'task_file': input_file}
				)
			response.raise_for_status()
			response_json = response.json()
			rq_id = response_json['rq_id']
			while True:
				sleep(import_verification_period)
				response = self.session.post(
					url,
					data={'rq_id': rq_id}
				)
				response.raise_for_status()
				if response.status_code == 201:
					break
			task_id = response.json()['id']
			logger_string = "Task has been imported sucessfully. Task ID: {}".format(task_id)
			log.info(logger_string)
		except Exception as e:
			log.error(str(e))
			raise Exception(str(e))


	def login(self, credentials):
		try:
			url = self.api.login
			auth = {'username': credentials[0], 'password': credentials[1]}
			response = self.session.post(url, auth)
			response.raise_for_status()
			if 'csrftoken' in response.cookies:
				self.session.headers['X-CSRFToken'] = response.cookies['csrftoken']
		except Exception as e:
			log.error("Username or Password is wrong")
			log.error(str(e))
			raise Exception(str(e))



class CVAT_API_V2():
	""" Build parameterized API URLs """

	def __init__(self, host, https=False):
		if host.startswith('https://'):
		    https = True
		if host.startswith('http://') or host.startswith('https://'):
		    host = host.replace('http://', '')
		    host = host.replace('https://', '')
		scheme = 'https' if https else 'http'
		self.base = '{}://{}/api/'.format(scheme, host)
		self.git = f'{scheme}://{host}/git/repository/'

	@property
	def tasks(self):
		return self.base + 'tasks'

	def tasks_page(self, page_id):
		return self.tasks + '?page={}'.format(page_id)

	def tasks_id(self, task_id):
		return self.tasks + '/{}'.format(task_id)

	def tasks_id_jobs(self, task_id):
		return self.tasks_id(task_id) + '/jobs'

	def tasks_id_data(self, task_id):
		return self.tasks_id(task_id) + '/data'

	def tasks_id_frame_id(self, task_id, frame_id, quality):
		return self.tasks_id(task_id) + '/data?type=frame&number={}&quality={}'.format(frame_id, quality)

	def tasks_id_status(self, task_id):
		return self.tasks_id(task_id) + '/status'

	def tasks_id_annotations_format(self, task_id, fileformat):
		return self.tasks_id(task_id) + '/annotations?format={}' \
		    .format(fileformat)

	def tasks_id_annotations_filename(self, task_id, name, fileformat):
		return self.tasks_id(task_id) + '/annotations?format={}&filename={}' \
		    .format(fileformat, name)

	def git_create(self, task_id):
		return self.git + f'create/{task_id}'

	def git_check(self, rq_id):
		return self.git + f'check/{rq_id}'

	@property
	def jobs(self):
		return self.base + 'jobs'
	
	def jobs_id(self, task_id):
		return self.jobs + '/{}'.format(task_id)
	
	def jobs_page(self, page_id):
		return self.jobs + '?page={}'.format(page_id)
	
	@property
	def users(self):
		return self.base + 'users'
	
	def users_page(self, page_id):
		return self.users + '?page={}'.format(page_id)
	
	@property
	def projects(self):
		return self.base + 'projects'

	def projects_page(self, page_id):
		return self.projects + '?page={}'.format(page_id)

	@property
	def organizations(self):
		return self.base + 'organizations'

	def organizations_page(self, page_id):
		return self.organizations + '?page={}'.format(page_id)

	@property
	def login(self):
		return self.base + 'auth/login'


