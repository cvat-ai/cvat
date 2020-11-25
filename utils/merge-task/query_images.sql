select '/home/jiangrong/dev/cvat/assets/cvat_data/data/' || data_id || '/raw/' || path
from
(select
l.*
,label.name as label_name
,i.task_id
,i.path
,i.data_id
from engine_labeledimage l
inner join engine_label label
on l.label_id = label.id
and label.name in ('pick')
inner join engine_image_v as i
on l.frame = i.frame
and l.job_id = i.job_id
and i.task_id in (29,33)) as tmp
;

