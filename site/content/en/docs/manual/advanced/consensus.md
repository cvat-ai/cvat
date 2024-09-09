---
title: 'Consensus'
linkTitle: 'Consensus'
weight: 26
description: 'Consensus based annotation'
---

By involving multiple annotators, consensus-based annotation incorporates a range of perspectives and interpretations, which helps in minimising individual biases that might skew the annotations.

Multiple annotators reviewing and agreeing on annotations can help identify and correct errors or inconsistencies that might arise from individual biases.

For example creating bounding boxes around the face of a Basset Hound dog. One person might consider the ears also as the part of dogs face and one might not, this is due to fact that different people would have different understanding of things around them. In such cases, consensus based approach helps in reducing this bias by considering the interpretation through consensus.

| | |
|---|---|
|![basset_hound_ear_covered](/images/basset_hound_ear_covered.jpeg)|![basset_hound_ear_not_covered](/images/basset_hound_ear_not_covered.jpeg)|


See:

- [Use Cases](#use-cases)
- [Terminology:](#terminology)
- [Working](#working)
- [Finding Overlap between two annotations:](#finding-overlap-between-two-annotations)
- [Step by Step Guide](#step-by-step-guide)

## Use Cases

The basic use case is annotating the entire dataset with multiple annotators to obtain high-quality annotations in the dataset. In some cases it may work, but typically, however, this way of annotating is prohibitively expensive, as you need to annotate everything several times. There are several ways how the situation can be improved.

1. You can use several highly skilled annotators and rely on their consensus to create high-quality Ground Truth annotations. Typically, the Ground Truth subset contains a small portion of the whole dataset (e.g. 2-5%), so it's relatively easy to annotate it several times. These annotations are used then to validate work of different annotators randomly, so it's very desirable to avoid single expert bias in Ground Truth, and this is one of the key benefits of the consensus annotation. This method requires extra work, but it's much lower than annotating all the dataset several times. For instance, annotating a 3% of images 5 times will result in extra 3% * (5 - 1) = 12% overhead, comparing to single GT annotations.
2. In cases of points and poly-line / poly-shape annotations, annotators can add more annotations without a fixed structure, which can introduce significant variation. Similarly, for skeleton annotations, while there is a structure, annotators can move the points around. Due to the presence of numerous points, this can lead to significant variations in annotations for the same data. Using a consensus-based approach for such data types can help reduce these variations, which may arise from minor errors in placing the points.  For example, in the figure, an annotator might place a point representing the foot anywhere across the pink region, leading to significant variation in the annotations. Using such annotations for model training of for model validation is likely to result in reduced performance scores, exactly because of these variations in the correct annotations of the same objects. The consensus annotation approach allows you to minimize such kind of errors by using averaged annotations instead.

![pink_shoes](/images/pink_shoes.jpeg)


## Terminology:
1. `min_iou_threshold`: This is the same as `iou_threshold` param in Quality Settings. It's used for distinction between matched / unmatched annotations. An annotation is considered in the consensus only with the annotations it has an overlap greater than or equal to this
2. `agreement_score_threshold`: After consensus has produced a merged annotation, it is assigned a score based on it's overlap with other annotations in the cluster, (add label score thing also). Merged annotations with this score lesser than `agreement_score_threshold` are discarded.
3. `Quorum`: The minimum number of annotations in a consensus for the merging to occur. While deciding the final label of a merged annotation, the count of specific label shouldn't be less than this. Clusters having less than this number of annotations are discarded.
4. `oks_sigma`: This is the same as `oks_sigma` param in Quality Settings. Like `min_iou_threshold`, but for points. The percent of the bbox area, used as the radius of the circle around the GT point, where the checked point is expected to be. Read more: [https://cocodataset.org/#keypoints-eval](https://cocodataset.org/#keypoints-eval)
5. `line_thickness`: This is the same as `line_thickness` param in Quality Settings. Thickness of polylines, relatively to the (image area) ^ 0.5. The distance to the boundary around the GT line, inside of which the checked line points should be.


## Working
1. Get matching annotations for every annotation:
   1. For annotations in consensus jobs, find matching annotations in other consensus jobs derived from the same regular job. Two annotations match if their overlap is less than min_iou_threshold
   2. If there is more than one annotation in a consensus job matching an annotation, we only pick the closest annotation
2. Group matching annotations into clusters:
   1. Start from an annotation and include the annotation in the next consensus job, which matches this annotation
   2. Now, while adding annotations from the remaining consensus jobs, we go through the matching annotations of the first annotation
   3. Here, we add the annotations that match all the annotations in the cluster, and no two annotations in a cluster belong to the same consensus job
   4. After this, we repeat this for the annotation added second, and so on, until we go through all the matching annotations of the annotations in cluster
   5. In this, we keep track of the annotations we have added to a cluster. To avoid going through the matching annotation multiple times, We are doing so as we can come across an annotation multiple times since an annotation can be a matching annotation to multiple annotations from other consensus jobs
3. Merging cluster into single annotation:
   1. A cluster having annotations less than quorum is discarded
   2. Create a bounding box corresponding to every annotation
   3. Calculate the mean bounding box for these bounding boxes
   4. Go through the bounding box representation of the annotations in the cluster, and choose the annotation which is closest to the mean bounding box as the merged annotation
   5. Steps 3 and 4 are done differently for skeleton-type annotation, where the merged annotation is the one which has the least mean distance with other annotations in cluster
   6. The consensus score of this merged annotation is the mean of the overlap between the merged annotation and the rest of the annotations in cluster
   7. The merged annotation with a consensus score less than the agreement score threshold is discarded.


## Finding Overlap between two annotations:
1. Bounding Box, Polygon and Mask type:
   1. A polygon representation of the annotation is obtained, and then the Intersection over Union (IoU) is calculated between them.
   2. The annotator can draw a rotated bounding box. Thus, it’s converted into a polygon-type annotation
2. Points type: Object Keypoint Similarity (OKS)
3. PolyLine type:
   1. We first derive another polyline having the same number of points but placed such that a polyline close to the original polyline is obtained
   2. Gaussian (similar to OKS) is calculated between these approximated lines with the same number of points
4. Skeleton type:
   1. Convert the skeleton annotation into points
   2. Find the distance between these two sets of points. A set of points represents a skeleton.
   3. Here, while calculating Object Keypoint Similarity (OKS) between the points, the scale parameter is also passed, accounting for the spread of the skeleton. This scale is obtained from the bounding box formed around the skeleton.


## Step by Step Guide
1. Create a new task ![new task](/images/new_task_page.jpeg)
2. Set a non zero value to `Consensus Jobs Per Regular Job` parameter under the `Advanced configuration`
   1. ![advanced config page](/images/adv_conf_page.jpeg)
   2. ![task_page_consensus](/images/task_page_consensus.jpeg)
3. Open this task, and assign workers to the consensus jobs
   1. ![consensus task](/images/consensus_task.jpeg)
   2. ![assigned workers](/images/assigned_workers.jpeg)
4. This are the annotations made by `worker 1`
   1. ![frame 1](/images/worker_1_1.jpeg)
   2. ![frame 2](/images/worker_1_2.jpeg)
   3. ![frame 3](/images/worker_1_3.jpeg)
5. This are the annotations made by `worker 2`
   1. ![frame 1](/images/worker_2_1.jpeg) In this frame the annotations are significantly off by our expectations.
   2. ![frame 2](/images/worker_2_2.jpeg) In this frame worker 2 hasn't annotated one of the dogs.
   3. ![frame 3](/images/worker_2_3.jpeg)
6. Click on `Merge Consensus Jobs`, this will merge all the consensus jobs into their regular job.
   1. ![consensus merge button](/images/consensus_merge_button.jpeg)
   2. ![consensus merge confirmation](/images/consensus_merge_confirmation.jpeg)
   3. ![loading consensus merge](/images/loading_consensus_merge.jpeg) The button will be disabled until the previous merge action isn't completed.
7. Below are the merged results
   1. ![frame 1](/images/merged_1.jpeg)
   2. ![frame 2](/images/merged_2.jpeg) Through consensus it got the annotation from worker 1's annotation
   3. ![frame 3](/images/merged_3.jpeg)
8. On clicking on `View Consensus Analytics` ![view consensus analytics](/images/view_consensus_analytics.jpeg)
   1. ![consensus analytics](/images/consensus_analytics_1.jpeg) Here the score corresponding to the job (merged job) represents, the mean overlap (IoU) among the annotations in it's consensus jobs and the merged job.
   2. ![consensus analytics conflicts](/images/consensus_analytics_1_conf.jpeg) There was an annotation made by worker 1 but not by worker 2, that annotation didn't had any matching annotations so it raised `No matching annotation` conflict. Similarly, there were two annotations in the first frame which didn't matched as they didn't satisfied the `Min Overlap Threshold` condition. Thus, 3 `No matching annotation` conflicts are raised.
   3. ![consensus settings](/images/consensus_settings_1.jpeg)
9. Now we will change the `Min Overlap Threshold` from `50%` to `20%` and again merge the consensus jobs. ![consensus settings](/images/consensus_settings_2.jpeg)
10. We can see after this, in the first frame we have a single annotation instead of two annotations which weren't matched previously. ![updated frame 1](/images/consensus_label.jpeg)
11. Thus now in the consensus analytics page the number of conflict is reduced to one.
    1. ![updated consensus analytics](/images/consensus_analytics_2.jpeg)
    1. ![updated consensus analytics conflicts](/images/consensus_analytics_2_conf.jpeg)
12. On clicking on `Assignees` assignee level analytics can also be viewed. ![consensus analytics assignee](/images/consensus_analytics_2_assignee.jpeg)

- Annotations made manually have a tag of `MANUAL` in them, whereas annotations obtained through consensus have `CONSENSUS` tag in them.
  - ![manual label](/images/manual_label.jpeg)
  - ![consensus label](/images/consensus_label.jpeg)
- Similar merge option is available under each Regular Job, to perform merging of consensus job at job level instead of task level ![job wise consensus merge button](/images/job_wise_consensus.jpeg)