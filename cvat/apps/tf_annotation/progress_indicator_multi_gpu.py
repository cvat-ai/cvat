import django_rq
import os
from cvat.settings.base import DATA_ROOT
import time

def track_progress(task_id_tf, num_gpus):
    num_gpus = int(num_gpus)
    source_task_path = os.path.join(DATA_ROOT,"data", str(task_id_tf))
    queue = django_rq.get_queue('low')
    job = queue.fetch_job('tf_annotation.create/{}'.format(task_id_tf))

    # Report progress back to user
    continue_reading_progress = True
    progress_indicators = {}
    while continue_reading_progress:
        wait_for_progress_files = False
        if num_gpus == 0: #no gpu workspace
            i = 0
            progress_filename = 'progress_{}.txt'.format(i)
            progress_file_path = os.path.join(source_task_path, progress_filename)
            if not os.path.isfile(progress_file_path):
                wait_for_progress_files = True
                print("run_tensorflow_annotation, waiting for file {}".format(progress_file_path))
                continue
            else:
                progress_indicators = update_progress_indicators(progress_file_path, progress_indicators, i)
        else:
            for i in range(num_gpus):
                progress_filename = 'progress_{}.txt'.format(i)
                progress_file_path = os.path.join(source_task_path, progress_filename)
                if not os.path.isfile(progress_file_path):
                    wait_for_progress_files = True
                    print("run_tensorflow_annotation, waiting for file {}".format(progress_file_path))
                    continue
                else:
                    progress_indicators = update_progress_indicators(progress_file_path, progress_indicators, i)
        wait_for_progress_indicators_to_finish = update_job_progress(progress_indicators, job, num_gpus, source_task_path)
        if wait_for_progress_files or wait_for_progress_indicators_to_finish:
           time.sleep(1)
        else:
            continue_reading_progress = False

def update_progress_indicators(progress_file_path, progress_indicators, specific_gpu):
    i = int(specific_gpu)
    file_lines = open(progress_file_path, "r").readlines()
    if len(file_lines) < 2:
        return progress_indicators
    progress_val_file = int(float(file_lines[1].strip()))
    progress_indicators[i] = progress_val_file
    return progress_indicators


def update_job_progress(progress_indicators, job, num_gpus, source_task_path):
    progress_val = 0
    progress_indicators_wait = False
    for key, val in progress_indicators.items():
        progress_val += val
        if val != 100:
            progress_indicators_wait = True
    if len(progress_indicators) != 0:
        progress_val = progress_val / len(progress_indicators)
    job.refresh()
    if 'cancel' in job.meta:
        job.save()
        if num_gpus == 0:
            i = 0
            progress_filename = 'progress_{}.txt'.format(i)
            progress_file_path = os.path.join(source_task_path, progress_filename)
            if os.path.isfile(progress_file_path):
                os.remove(progress_file_path)
        else:
            for i in range(num_gpus):
                progress_filename = 'progress_{}.txt'.format(i)
                progress_file_path = os.path.join(source_task_path, progress_filename)
                if os.path.isfile(progress_file_path):
                    os.remove(progress_file_path)
        return None
    job.meta['progress'] = progress_val
    job.save_meta()
    return progress_indicators_wait

if __name__ == "__main__":
    import sys
    data = sys.argv[1].split("::")
    task_id = data[0]
    num_gpus_tf = data[1]
    track_progress(task_id,num_gpus_tf)