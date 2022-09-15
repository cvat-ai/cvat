1-) Check CSV:
python cvat_script.py --check_csv csv_file -> path'i verilen csv_file dosyasının içeriğinin uygun formatta olup olmadığını kontrol eder. Format doğruysa format doğru mesajı döner. Yanlışsa yanlışların nerede olduğunu listeler. Her komutta önce kontrol işlemi yapılır.

2-) List:
python cvat_script.py list -> çıktı olarak tüm taskların mevcut durumlarını csv formatında verir
python cvat_script.py list -o csv_file -> çıktı olarak oluşturulacak csv'nin adı	| -o DEFAULT: output.csv
python cvat_script.py list --organization organization_name -> çıktı olarak organization_name organizasyonundaki tüm taskların mevcut durumlarını csv formatında verir
python cvat_script.py list --project project_name-> çıktı olarak project_name projesindeki tüm taskların mevcut durumlarını  csv formatında verir
python cvat_script.py list --jobstage annotation-> çıktı olarak annotation stage'indeki tüm taskların mevcut durumlarını csv formatında verir
python cvat_script.py list --jobstate in_progress-> çıktı olarak in_progress state'indeki tüm taskların mevcut durumlarını csv formatında verir
python cvat_script.py list --jobstate in_progress --organization organization_name --andor or -> --andor ile farklı filtreler birlikte kulanılabilir	| --andor DEFAULT: and

3-) Create:
python cvat_script.py create  csv_file -> csv dosyasındaki her satırın task'ının açıp olmadığına bakar, açık olup durumu güncellenecekse günceller, açık değilse task'ı açar.

4-) Update:
python cvat_script.py update  csv_file -> csv dosyasındaki her satırın task'ının durumuna bakar, güncellenecekse günceller, açık değilse task'ı açmaz. Sadece update operasyonu gerçekleştirir.

5-) Export:
python cvat_script.py export  csv_file --format PASCAL_VOC_1.1 -> csv dosyasındaki her task'ın annotation'larını verilen formatta export eder.	| --format DEFAULT: "PASCAL VOC 1.1"

6-) Upload:
python cvat_script.py upload  csv_file --annotation annotation_file --format PASCAL_VOC -> csv dosyasındaki her task'ın annotation'larını verilen annotation dosyasında arar ve annotation dosyasında yer alanları upload eder. 	| --format DEFAULT: "PASCAL VOC 1.1" 


CONFIG
config.cfg
"log_file=True" şeklinde ise loglar bir dosyaya yazılır.
"username=" ve "password=" bilgileri eksikse kullanıcıdan bu bilgiler command line aracılığı ile istenir.
