# %%
gt_label = {cls.strip():idx for idx, cls in enumerate(open('baiguang.class', 'r').read().split('\n'))}
# %%
db_label = {l[1].strip():int(l[0].strip()) for l in [each.split('|') for each in open('labels.txt', 'r').read().split('\n')]}
# %%
gt2db = {str(v):str(db_label[k]) for k, v in gt_label.items()}
# %%
name2frame = {l[1].strip().split('/')[-1].split('.')[0]:l[2].strip() for l in [each.split('|') for each in open('engine_image_data3_.txt', 'r').read().split('\n')]}
# %%
todo=[]
with open('baiguang-gt.txt', 'r') as rf:
  for line in rf:
    line = line.strip()
    name = line.split(' ')[0]
    frameid = name2frame[name]
    boxes = line.split(' ')[1:]
    for box in boxes:
      x0,y0,x1,y1,cls_id = box.split(',')
      x0,y0,x1,y1,cls_id = str(x0),str(y0),str(x1),str(y1),str(cls_id)
      tgt_cls_id = gt2db[cls_id]
      todo.append("({},0,\'rectangle\',\'f\',0,\'{},{},{},{}\',3,{},\'manual\')"\
        .format(frameid, x0, y0, x1, y1, tgt_cls_id))


# %%
with open('sql', 'w') as wf:
  wf.write("insert into engine_labeledshape (frame,\"group\",type,occluded,z_order,points,job_id,label_id,source) values\n")
  for each in todo:
    wf.write(each+",\n")
# %%
