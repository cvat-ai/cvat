
import requests
import configparser
import pandas as pd
from http.client import HTTPConnection
import logging
import sys 
import os
import datetime
from getpass import getpass
import shutil

from myTask import Task
from user import User
from core import CLI, CVAT_API_V2
from customFormatter import CustomFormatter, CustomFormatter_2


log = logging.getLogger(__name__)
csv_heading = ["Organization", "Project","TaskName", "UploadType", "UploadPath", "Assignee", "JobStage", "JobState"]

def config_log(level, log_file, log, core_log=False):
	if core_log:
		log = logging.getLogger("core")
	today = datetime.date.today()
	fmt = '%(asctime)s | %(levelname)s | %(message)s'
	log.setLevel(level)

	stdout_handler = logging.StreamHandler(sys.stdout)
	stdout_handler.setLevel(level)
	stdout_handler.setFormatter(CustomFormatter(fmt))
	log.addHandler(stdout_handler)

	if log_file == "True":
		# Create file handler for logging to a file (logs all five levels)
		file_handler = logging.FileHandler('cvat_{}.log'.format(today.strftime('%Y_%m_%d')))
		file_handler.setLevel(level)
		file_handler.setFormatter(CustomFormatter_2(fmt))
		log.addHandler(file_handler)

	if level <= logging.DEBUG:
		HTTPConnection.debuglevel = 1


def read_cfg(filepath):
	parser = configparser.ConfigParser()
	parser.read(filepath)
	try:
		server_host = parser.get("server", "host")
		server_port = parser.get("server", "port")
		log_file = parser.get("log", "log_file")
		if server_host == "" or server_port == "" or log_file == "":
			error_msg = "config file is empty"
			log.error(error_msg)
			raise Exception(error_msg)
		if log_file == "True":
			print("log_file : True\n")
		else:
			print("log_file : False\n")
	except:
		error_msg = "config file is empty"
		log.error(error_msg)
		raise Exception(error_msg)
	try:
		user_username = parser.get("user", "username")
		user_password = parser.get("user", "password")
		if user_username == "" or user_password == "":
			print("Username ve password'unuzu config dosyasına ekleyebilirsiniz")
			user_username = str(input("Username: "))
			user_password = password = getpass()
	except:
		try:
			user_username = str(input("Username: "))
			user_password = password = getpass()
		except:
			error_msg = "Username or Password is empty"
			log.error(error_msg)
			raise Exception(error_msg)
	return user_username, user_password, server_host, server_port, log_file


def read_csv(filepath):
	try:
		tasks = []
		csv = pd.read_csv(filepath)
		for index, row in csv.iterrows():
			tasks.append(Task(str(row[csv_heading[0]]), str(row[csv_heading[1]]), str(row[csv_heading[2]]), str(row[csv_heading[3]]), str(row[csv_heading[4]]), str(row[csv_heading[5]]), str(row[csv_heading[6]]), str(row[csv_heading[7]])))
		return tasks
	except:
		error_msg = "Failed to read csv file"
		log.error(error_msg)
		raise Exception(error_msg)


def write_csv(df, csv_file_output):
	try:
		df.to_csv(csv_file_output, index=False)
		log.info("Csv written successfully")
	except Exception as e:
		log.error(str(e))
		raise Exception(str(e))

def tasks_list2df(tasks):
	try:
		df = pd.DataFrame({csv_heading[0]:[], csv_heading[1]:[], csv_heading[2]:[], csv_heading[3]:[], csv_heading[4]:[], csv_heading[5]:[], csv_heading[6]:[], csv_heading[7]:[]})
		for task in tasks:
			df_row = pd.DataFrame({csv_heading[0]:[task.organization_name], csv_heading[1]:[task.project_name], csv_heading[2]:[task.task_name], csv_heading[3]:[task.upload_type], csv_heading[4]:[task.upload_path], csv_heading[5]:[task.assignee], csv_heading[6]:[task.jobStage], csv_heading[7]:[task.jobState]})
			df = df.append(df_row)
		return df
	except Exception as e:
		log.error(str(e))
		raise Exception(str(e))


def check(cli, tasks, check_type=0):
	check_flag = 1
	index = 1
	states = ["new","in_progress","rejected","completed","in progress"]
	stages = ["annotation","validation","acceptance"]
	upload_types = ["computer", "connected_file", "remote"]
	for task in tasks:
		if not task.check_all():
			warning_msg = f"{index}. row is empty or wrong"
			log.warning(warning_msg)
		if task.check(task.organization_name):
			if cli.find_organization_id(task.organization_name) is None:
				check_flag = 0
				error_msg = f"{index}. row is wrong (Organization)"
				log.error(error_msg)
		if task.check(task.project_name):
			if cli.find_project_id(task.project_name) is None:
				check_flag = 0
				error_msg = f"{index}. row is wrong (Project)"
				log.error(error_msg)
		if task.check(task.assignee):
			if cli.find_user_id(task.assignee) is None:
				check_flag = 0
				error_msg = f"{index}. row is wrong (Assigne)"
				log.error(error_msg)
		if check_type == 1:
			if task.check(task.upload_path):
				if not os.path.exists(task.upload_path):
					check_flag = 0
					error_msg = f"{index}. row path is Not exist (UploadPath)"
					log.error(error_msg)
			if task.check(task.upload_type):
				if not task.upload_type in upload_types:
					check_flag = 0
					error_msg = f"{index}. row is wrong (UploadType)"
					log.error(error_msg)
		else:
			if cli.find_task_id(task.task_name) is None:
				check_flag = 0
				error_msg = f"{index}. row is wrong (TaskName)"
				log.error(error_msg)		
		if check_type == 1 or check_type == 2:
			if task.check(task.jobStage):
				if not task.jobStage in stages:
					check_flag = 0
					error_msg = f"{index}. row is wrong (jobStage)"
					log.error(error_msg)
			if task.check(task.jobState):
				if not task.jobState in states:
					check_flag = 0
					error_msg = f"{index}. row is wrong (jobState)"
					log.error(error_msg)
		index += 1
	if check_flag == 0:
		error_msg = "Csv format is wrong"
		log.error(error_msg)
		raise Exception(error_msg)
	info_msg = "Csv format is true"
	log.info(info_msg)


def update(cli, task, index):
	try:
		job_id = cli.find_task2job_id(task.task_name)
		if job_id is None:
			error_msg = f"{index}. row failed to update"
			log.error(error_msg)
			raise Exception(error_msg)							
		cli.tasks_update(job_id, task.jobState, task.jobStage)
	except:
		error_msg = f"{index}. row failed to update"
		log.error(error_msg)
		raise Exception(error_msg)

def get_user(cli, username):
	for user in cli.users_list():
		if user["username"] == username:
			log.info(f'Selected assignee ID: {user["id"]} NAME: {user["username"]}')
			return User(user["url"], user["id"], user["username"])
	return None

def main(args, cfg="config.cfg"):
	user_username, user_password, server_host, server_port, log_file = read_cfg(cfg)
	auth = [user_username, user_password]
	action = args.action

	config_log(logging.INFO, log_file, log)
	config_log(logging.INFO, log_file, log, True)

	with requests.Session() as session:
		api = CVAT_API_V2('%s:%s' % (server_host, server_port))
		cli = CLI(session, api, auth)
		try:
			# Maybe you will need #
			annotation_path, annotation_format, completion_verification_period, git_completion_verification_period, frame_step = '', 'PASCAL VOC 1.1', None, None, None
			dataset_repository_url, lfs, labels, bug_tracker, overlap, segment_size, chunk_size, fileformat = '', False, None, None, None, None, None, "Pascal VOC 1.1"
			copy_data, image_quality, sorting_method, start_frame, stop_frame, use_cache, use_zip_chunks = None, 70, "lexicographical", None, None, True, True
			outdir, quality, export_verification_period, import_verification_period, use_json_output, mode = '', 'original', 3, 3, True, "annotation"

			project_id = None
			#project_labels = []
			
			if action == "create":
				csv_file = args.file_path
				tasks = read_csv(csv_file)
				check(cli, tasks, 1)
				index = 1
				for i in tasks:
					task_id = cli.find_task_id(i.task_name)
					if task_id is None:
						print("\nNext Task:")
						if not i.assignee == "None":
							assignee = get_user(cli, i.assignee)
						else:
							assignee = None
						project_id = cli.find_project_id(i.project_name)
						upload_paths_temp = i.upload_path.split(",")
						if i.upload_type == "computer":
							upload_paths = []					
							for path in upload_paths_temp:
								if os.path.isdir(path):
									for file in os.listdir(path):
										if not os.path.isdir(path + "/" + file):
											upload_paths.append(path + "/" + file)
								else:
									upload_paths.append(path)
						else:
							upload_paths = upload_paths_temp

						cli.tasks_create(i.task_name, project_id, i.upload_type, upload_paths, i.organization_name, assignee, annotation_path, annotation_format,
							completion_verification_period, git_completion_verification_period, dataset_repository_url, lfs, labels, bug_tracker, overlap, chunk_size, 
							copy_data, image_quality, sorting_method, start_frame, stop_frame, use_cache, use_zip_chunks, frame_step, segment_size, mode)
					else:
						update(cli, i, index)
					index += 1
				print("\nFinished Tasks")


			elif action == "update":
				csv_file = args.file_path
				tasks = read_csv(csv_file)
				check(cli, tasks, 2)
				index = 1
				for task in tasks:
					print("\nNext Task:")					
					update(cli, task, index)
					index += 1
				print("\nFinished Tasks")


			elif action == "list":
				print("Tasks are listed")
				csv_file_output = args.o
				list_tasks = cli.tasks_list_special(args)
				check(cli, list_tasks, 2)
				dataframe = tasks_list2df(list_tasks)
				write_csv(dataframe, csv_file_output)


			elif action == "upload":
				csv_file = args.file_path
				fileformat = args.format
				fileformat = fileformat.replace(" ", "+")
				annotation_file = args.annotation
				tasks = read_csv(csv_file)
				check(cli, tasks)
				dirs = []
				for dir in os.listdir(annotation_file):
					dirs.append(dir)
				for task in tasks:
					print("\nNext Task:")
					if task.task_name + ".zip" in dirs:
						output_filename = annotation_file + "/" + task.task_name
						task_id = cli.find_task_id(task.task_name)
						cli.tasks_upload(task_id, fileformat, output_filename + ".zip")
					elif task.task_name in dirs:
						output_filename = annotation_file + "/" + task.task_name
						shutil.make_archive(output_filename, 'zip', annotation_file + "/" + task.task_name)
						log.info(f"Created {task.task_name + '.zip'}")
						task_id = cli.find_task_id(task.task_name)
						cli.tasks_upload(task_id, fileformat, output_filename + ".zip")
				print("\nFinished Tasks")


			elif action == "export":
				csv_file = args.file_path
				fileformat = args.format
				fileformat = fileformat.replace(" ", "+")
				tasks = read_csv(csv_file)
				check(cli, tasks)
				for task in tasks:
					print("\nNext Task:")					
					task_id = cli.find_task_id(task.task_name)
					cli.tasks_dump(task_id, fileformat, task.task_name + ".zip")
				print("\nFinished Tasks")

			
			elif action == "check_csv":
				csv_file = args.file_path
				tasks = read_csv(csv_file)
				check(cli, tasks)


			else:
				error_msg = "Wrong action"
				log.error(error_msg)
				raise Exception(error_msg)
		except (requests.exceptions.HTTPError,
			requests.exceptions.ConnectionError,
			requests.exceptions.RequestException,
			Exception) as e:
			log.critical(str(e))


