import numpy as np

import csv
import os
import cv2
import random
import torch
import shutil

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def distribution_judge(img, name):
    """Judge the distribution of specific category.

    Args:
        img: [np.array] Image of the category to be judged.
        name: [str] Name of the category.
    """
    img_ = cv2.resize(img, (289, 289))
    img = cv2.cvtColor(img_, cv2.COLOR_BGR2GRAY)
    img = cv2.blur(img, (39, 39))

    dft = cv2.dft(np.float32(img), flags=cv2.DFT_COMPLEX_OUTPUT)
    dft_shift = np.fft.fftshift(dft)
    magnitude = 20 * np.log(cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1]))
    magnitude[magnitude > 170] = 255
    magnitude[magnitude <= 170] = 0

    height, width = magnitude.shape
    center = (height // 2, width // 2)
    y_indices, x_indices = np.where(magnitude == 255)
    y_all, x_all = np.indices((2 * height, 2 * width))

    l1_dist_x = np.abs(x_indices - center[1])
    l1_dist_y = np.abs(y_indices - center[0])

    dist = np.sqrt((x_indices - center[1]) ** 2 + (y_indices - center[0]) ** 2)
    l2_dist_all = np.sqrt((x_all - center[1]) ** 2 + (y_all - center[0]) ** 2)

    side_x = np.max(l1_dist_x)
    side_y = np.max(l1_dist_y)
    radius = np.max(dist)
    points_num = len(dist)

    l1_density = points_num / (4 * np.max([side_x, 1]) * np.max([side_y, 1]))
    l2_density = points_num / (np.sum(l2_dist_all <= radius) + 1e-10)
    flag = 1 if (l1_density > 0.21 or l2_density > 0.21) and radius > 12 and points_num > 60 else 0
    type = 'Maniflod' if flag == 0 else 'HyperSphere'
    print(f'Distribution: {flag} / {type}.')

    output_path = './results/judge/fft/' + str(flag) + '/' + name + '.png'
    img_up = np.hstack([img_, np.repeat(magnitude, 3).reshape((height, width, 3))])
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, img_up)
    return flag


def create_storage_folder(
        main_folder_path, project_folder, group_folder, run_name, mode="iterate"
):
    os.makedirs(main_folder_path, exist_ok=True)
    save_path = main_folder_path
    return save_path


def set_torch_device(gpu_ids):
    """Returns correct torch.device.

    Args:
        gpu_ids: [list] list of gpu ids. If empty, cpu is used.
    """
    if len(gpu_ids):
        return torch.device("cuda:{}".format(gpu_ids[0]))
    return torch.device("cpu")


def fix_seeds(seed, with_torch=True, with_cuda=True):
    """Fixed available seeds for reproducibility.

    Args:
        seed: [int] Seed value.
        with_torch: Flag. If true, torch-related seeds are fixed.
        with_cuda: Flag. If true, torch+cuda-related seeds are fixed
    """
    random.seed(seed)
    np.random.seed(seed)
    if with_torch:
        torch.manual_seed(seed)
    if with_cuda:
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True


def compute_and_store_final_results(
        results_path,
        results,
        column_names,
        row_names=None,
):
    """Store computed results as CSV file.

    Args:
        results_path: [str] Where to store result csv.
        results: [List[List]] List of lists containing results per dataset,
                 with results[i][0] == 'dataset_name' and results[i][1:6] =
                 [instance_auroc, full_pixelwisew_auroc, full_pro,
                 anomaly-only_pw_auroc, anomaly-only_pro]
    """
    if row_names is not None:
        assert len(row_names) == len(results), "#Rownames != #Result-rows."

    mean_metrics = {}
    for i, result_key in enumerate(column_names):
        mean_metrics[result_key] = np.mean([x[i] for x in results])

    savename = os.path.join(results_path, "results.csv")
    with open(savename, "w") as csv_file:
        csv_writer = csv.writer(csv_file, delimiter=",")
        header = column_names
        if row_names is not None:
            header = ["Row Names"] + header

        csv_writer.writerow(header)
        for i, result_list in enumerate(results):
            csv_row = result_list
            if row_names is not None:
                csv_row = [row_names[i]] + result_list
            csv_writer.writerow(csv_row)
        mean_scores = list(mean_metrics.values())
        if row_names is not None:
            mean_scores = ["Mean"] + mean_scores
        csv_writer.writerow(mean_scores)

    mean_metrics = {"mean_{0}".format(key): item for key, item in mean_metrics.items()}
    return mean_metrics


def del_remake_dir(path, del_flag=True):
    if os.path.exists(path):
        if del_flag:
            shutil.rmtree(path, ignore_errors=True)
        os.makedirs(path, exist_ok=True)
    else:
        os.makedirs(path, exist_ok=True)


def torch_format_2_numpy_img(img):
    if img.shape[0] == 3:
        img = img.transpose([1, 2, 0])
        img = img * np.array(IMAGENET_STD) + np.array(IMAGENET_MEAN)
        img = img[:, :, [2, 1, 0]]
        img = (img * 255).astype('uint8')
    else:
        img = img.transpose([1, 2, 0])
        img = np.repeat(img, 3, axis=-1)
        img = (img * 255).astype('uint8')
    return img
