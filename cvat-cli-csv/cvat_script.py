
from cli import main
from parse import parser_create

###############################################################
#	actions :
#		check_csv :
#			file_path <input.csv>
#		list :
#			-o <output.csv> | DEFAULT: output.csv
#			--organization <organizationName>
#			--project <projectName>
#			--jobstage <annotation>
#			--jobstate <in progress>
#			--andor <or> | DEFAULT: and
#		create :
#			csv_file <input.csv>
#		update :
#			csv_file <input.csv>
#		export :
#			csv_file <input.csv>
#			--format <PASCAL VOC 1.1> | DEFAULT: PASCAL VOC 1.1 
#		upload :
#			csv_file <input.csv>
#			--annotation <annotation_path>
#			--format <PASCAL VOC 1.1> | DEFAULT: PASCAL VOC 1.1 
#    
##############################################################



# command line (input)
args = parser_create()
main(args)		#main(args, cfg="config.cfg")


