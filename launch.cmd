docker-compose down
docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml -f components/serverless/docker-compose.serverless.yml build
docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml -f components/serverless/docker-compose.serverless.yml up -d

nuctl deploy --project-name cvat \
    --path serverless/openvino/omz/public/yolo-v3-tf/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local

nuctl deploy --project-name cvat \
    --path serverless/openvino/omz/public/faster_rcnn_inception_v2_coco/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local

nuctl deploy --project-name cvat \
    --path serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local

nuctl deploy --project-name cvat \
    --path serverless/pytorch/foolwood/siammask/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local

########## list all tasks ##########
python3 ../utils/cli/cli.py \
--auth admin:rockrobo123 \
--server-host 192.168.50.153 \
--server-port 8080 \
ls

########## delete tasks #############
python3 ../utils/cli/cli.py \
--auth admin:rockrobo123 \
--server-host 192.168.50.153 \
--server-port 8080 \
delete 12


psql -h 0.0.0.0 -p 15432 -U root -W rockrobo666 -d cvat

create view engine_image_v as
select
i.*
, t.id as task_id
, s.id as segment_id
, s.start_frame
, s.stop_frame
, j.id as job_id
from engine_image i
inner join engine_data d
on i.data_id = d.id
inner join engine_task t
on d.id = t.data_id
inner join engine_segment s
on t.id = s.task_id
and i.frame between s.start_frame and s.stop_frame
inner join engine_job j
on s.id = j.segment_id
;
