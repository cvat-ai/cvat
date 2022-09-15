
import argparse

def parser_create():
	parser = argparse.ArgumentParser(description='CVAT SCRIPT INPUT')
	task_subparser = parser.add_subparsers(dest='action')


	#####################		CHECK		#####################
	check_csv_parser = task_subparser.add_parser(
	    'check_csv',
	    description='Check csv file'
	)
	check_csv_parser.add_argument('file_path', type=str, help='path of csv file')


	#####################		LIST		#####################
	task_list_parser = task_subparser.add_parser(
	    'list',
	    description='''List tasks'''
	)
	task_list_parser.add_argument('-o', default="output.csv", type=str, help='path of (output) csv file')
	task_list_parser.add_argument('--organization', dest='organization', type=str, help='list by organization')
	task_list_parser.add_argument('--project', dest='project', type=str, help='list by project')
	task_list_parser.add_argument('--jobstage', dest='jobstage', type=str, help='list by jobstage')
	task_list_parser.add_argument('--jobstate', dest='jobstate', type=str, help='list by jobstate')
	task_list_parser.add_argument('--andor', dest='andor', type=str, help='using filters as AND and OR')


	#####################		CREATE		#####################
	task_create_parser = task_subparser.add_parser(
	    'create',
	    description='Create tasks'
	)
	task_create_parser.add_argument('file_path', type=str, help='path of csv file')


	#####################		UPDATE		#####################
	task_update_parser = task_subparser.add_parser(
	    'update',
	    description='Update tasks'
	)
	task_update_parser.add_argument('file_path', type=str, help='path of csv file')


	#####################		EXPORT		#####################
	task_export_parser = task_subparser.add_parser(
	    'export',
	    description='Export task'
	)
	task_export_parser.add_argument('file_path', type=str, help='path of csv file')
	task_export_parser.add_argument('--format', default="PASCAL VOC 1.1", type=str, help='format of export data (.zip)')


	#####################		UPLOAD		#####################
	task_upload_parser = task_subparser.add_parser(
	    'upload',
	    description='Upload task'
	)
	task_upload_parser.add_argument('file_path', type=str, help='path of csv file')
	task_upload_parser.add_argument('--format', default="PASCAL VOC 1.1", type=str, help='format of upload data (.zip)')
	task_upload_parser.add_argument('--annotation', type=str, help='path of annotation file')

	args = parser.parse_args()

	return args


