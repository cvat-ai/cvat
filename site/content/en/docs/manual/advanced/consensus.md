---
title: 'Consensus'
linkTitle: 'Consensus'
weight: 26
description: 'Consensus based annotation'
---

By involving multiple annotators, consensus-based annotation incorporates a range of perspectives and interpretations,
which helps in minimising individual biases that might skew the annotations.

Multiple annotators reviewing and agreeing on annotations can help identify and correct errors or inconsistencies that
might arise from individual biases.

For example creating bounding boxes around the face of a Basset Hound dog.
1. One person might consider the ears also as the part of dogs face and one might not.
2. This is due to fact that different people would have different understanding of things around them.
3. In such cases, consensus based approach helps in reducing this bias by considering the interpretation through
   consensus.

|                                                                    |                                                                            |
|--------------------------------------------------------------------|----------------------------------------------------------------------------|
| ![basset_hound_ear_covered](/images/basset_hound_ear_covered.jpeg) | ![basset_hound_ear_not_covered](/images/basset_hound_ear_not_covered.jpeg) |


See:

- [Use Cases](#use-cases)
- [Terminology](#terminology)
- [Algorithm Description](#algorithm-description)
- [Finding Overlap between two annotations](#finding-overlap-between-two-annotations)
- [Step-by-Step Guide](#step-by-step-guide)

## Use Cases
The basic use case is annotating the entire dataset with multiple annotators to obtain high-quality annotations in the
dataset. In some cases it may work, but typically, however, this way of annotating is prohibitively expensive, as you
need to annotate everything several times. There are several ways how the situation can be improved.

1. Creating High quality Ground Truth (GT) Annotation:
   1. You can use several highly skilled annotators and rely on their consensus to create high-quality GT annotations.
   2. Typically, the GT subset contains a small portion of the whole dataset (e.g. 2-5%), so it's relatively easy to
      annotate it several times.
   3. These annotations are then used to validate work of different annotators randomly, so it's very desirable to
      avoid single expert bias in GT, and this is one of the key benefits of the consensus annotation.
   4. This method requires extra work, but it's much lower than annotating all the dataset several times.
   5. For instance, annotating 3% of images 5 times will result in extra 3% * (5 - 1) = 12% overhead, comparing to
      single GT annotations.
2. In cases of points and poly-line / poly-shape annotations, annotators can add more annotations without a fixed
   structure, which can introduce significant variation. Similarly, for skeleton annotations, while there is a
   structure, annotators can move the points around. Due to the presence of numerous points, this can lead to
   significant variations in annotations for the same data. Using a consensus-based approach for such data types can
   help reduce these variations, which may arise from minor errors in placing the points.  For example, in the figure,
   an annotator might place a point representing the foot anywhere across the pink region, leading to significant
   variation in the annotations. Using such annotations for model training of for model validation is likely to result
   in reduced performance scores, exactly because of these variations in the correct annotations of the same objects.
   The consensus annotation approach allows you to minimize such kind of errors by using averaged annotations instead.

![pink_shoes](/images/pink_shoes.jpeg)


## Terminology
1. `min_iou_threshold`: This is the same as `iou_threshold` param in Quality Settings. It's used for distinction
   between matched / unmatched annotations. An annotation is considered in the consensus only with the annotations it
   has an overlap greater than or equal to this
2. `agreement_score_threshold`: After consensus has produced a merged annotation, it is assigned a score based on it's
   overlap with other annotations in the cluster, (add label score thing also). Merged annotations with this score
   lesser than `agreement_score_threshold` are discarded.
3. `quorum`: The minimum number of annotations in a consensus for the merging to occur. While deciding the final label
   of a merged annotation, the count of specific label shouldn't be less than this. Clusters having less than this
   number of annotations are discarded.
4. `oks_sigma`: This is the same as `oks_sigma` param in Quality Settings. Like `min_iou_threshold`, but for points.
   The percent of the bbox area, used as the radius of the circle around the GT point, where the checked point is
   expected to be.  [Read more.](https://cocodataset.org/#keypoints-eval)
5. `line_thickness`: This is the same as `line_thickness` param in Quality Settings. Thickness of polylines, relatively
   to the (image area) ^ 0.5. The distance to the boundary around the GT line, inside which the checked line points
   should be.


## Algorithm Description
1. Get matching annotations for every annotation:
   1. For annotations in consensus jobs, find matching annotations in other consensus jobs derived from the same regular
      job. Two annotations match if their overlap is less than min_iou_threshold
   2. If there's more than one annotation in a consensus job matching an annotation, we only pick the closest annotation
2. Group matching annotations into clusters:
   1. Start from an annotation and include the annotation in the next consensus job, which matches this annotation
   2. Now, while adding annotations from the remaining consensus jobs, we go through the matching annotations of the
      first annotation
   3. Here, we add the annotations that match all the annotations in the cluster, and no two annotations in a cluster
      belong to the same consensus job
   4. After this, we repeat this for the annotation added second, and so on, until we go through all the matching
      annotations of the annotations in cluster
   5. In this, we keep track of the annotations we have added to a cluster. To avoid going through the matching
      annotation multiple times, We are doing so as we can come across an annotation multiple times since an annotation
      can be a matching annotation to multiple annotations from other consensus jobs
3. Merging cluster into single annotation:
   1. A cluster having annotations less than quorum is discarded
   2. Create a bounding box corresponding to every annotation
   3. Calculate the mean bounding box for these bounding boxes
   4. Go through the bounding box representation of the annotations in the cluster, and choose the annotation which is
      closest to the mean bounding box as the merged annotation
   5. Steps 3 and 4 are done differently for skeleton-type annotation, where the merged annotation is the one which has
      the least mean distance with other annotations in cluster
   6. The consensus score of this merged annotation is the mean of the overlap between the merged annotation and the
      rest of the annotations in cluster
   7. The merged annotation with a consensus score less than the agreement score threshold is discarded.


## Finding Overlap between two annotations
1. Bounding Box, Polygon and Mask type:
   1. A polygon representation of the annotation is obtained, and then the Intersection over Union (IoU) is calculated
      between them.
   2. The annotator can draw a rotated bounding box. Thus, it’s converted into a polygon-type annotation
2. Points type: Object Keypoint Similarity (OKS)
3. PolyLine type:
   1. We first derive another polyline having the same number of points but placed such that a polyline close to the
      original polyline is obtained
   2. Gaussian (similar to OKS) is calculated between these approximated lines with the same number of points
4. Skeleton type:
   1. Convert the skeleton annotation into points
   2. Find the distance between these two sets of points. A set of points represents a skeleton.
   3. Here, while calculating Object Keypoint Similarity (OKS) between the points, the scale parameter is also passed,
      accounting for the spread of the skeleton. This scale is obtained from the bounding box formed around the skeleton


## Step-by-Step Guide
1. Create a new task ![new task](/images/new_task_page.jpeg)
2. Set a non zero value to `Consensus Jobs Per Regular Job` parameter under the `Advanced configuration`
   1. ![advanced config page](/images/adv_conf_page.jpeg)
   2. ![task_page_consensus](/images/task_page_consensus.jpeg)
3. Open this task, and assign workers to the consensus jobs
   1. ![consensus task](/images/consensus_task.jpeg)
   2. ![assigned workers](/images/assigned_workers.jpeg)
4. This is the annotations made by `worker 1`
   1. ![frame 1](/images/worker1_frame1.jpeg)
   2. ![frame 2](/images/worker1_frame2.jpeg)
5. This is the annotations made by `worker 2`
   1. ![frame 1](/images/worker2_frame1.jpeg)
   2. ![frame 2](/images/worker2_frame2.jpeg)
   3. 4. This is the annotations made by `worker 3`
   1. ![frame 1](/images/worker3_frame1.jpeg) Here there's an extra annotation where cat isn't there, also the bounding
      box marked as dog contains two dogs instead of a single dog
   2. ![frame 2](/images/worker3_frame2.jpeg) Here the shape is correct but the label is incorrect
6. Click on `Merge Consensus Jobs`, this will merge all the consensus jobs into their regular job.
   1. ![consensus merge button](/images/consensus_merge_button.jpeg)
   2. ![consensus merge confirmation](/images/consensus_merge_confirmation.jpeg)
   3. ![loading consensus merge](/images/loading_consensus_merge.jpeg) The button will be disabled until the previous
      merge action isn't completed.
   4. A similar merge option is available under each Regular Job, to perform merging of consensus job at job level instead of
      task level ![job wise consensus merge button](/images/job_level_consensus_merge.jpeg)
7. Below are the merged results
   1. ![frame 1](/images/merged_frame_1_2_50.jpeg)
   2. ![frame 2](/images/merged_frame_2_2_50.jpeg)
   3. Since value of `quorum` is set to `2` (default value is half of the `consensus jobs per regular job`). The
      extra annotation by `worker 3` were discarded as it didn't have any other annotation having overlap more
      than `iou threshold` (default value is `50%`). The large bounding box annotation by `worker 3` didn't come up it
      got discarded in the consensus merging process, but it had overlap more than `50%` we will see more on this with
      in further steps
8. On clicking on `View Consensus Analytics` ![view consensus analytics]
   1. ![consensus analytics job](/images/consensus_analytics_job_2_50.jpeg) Here the score corresponding to the job
      represents, the mean overlap (IoU) among the annotations in its consensus jobs and the merged job.
   2. ![consensus analytics assignee](/images/consensus_analytics_assignee_2_50.jpeg) Here the score corresponding to
      assignee represents, the fraction of annotation made by the assignee which are present in the merged job.
   3. ![consensus settings](/images/consensus_setting_2_50.jpeg)
9.  Now we will change the `quorum` from `2` to `1` and again merge the consensus jobs.
   ![consensus settings](/images/consensus_setting_1_50.jpeg)
10. Below are the merged results
   1. ![frame 1](/images/merged_frame_1_1_50.jpeg)
   2. ![frame 2](/images/merged_frame_2_1_50.jpeg)
   3. Now, `frame 1` has the extra annotation as it doesn't need overlapping annotation to pass `quorum` criteria. Same
      goes with annotation in `frame 2`
11. As the quality of annotations in the merged job is reduced the mean consensus score also has reduced
    1. ![consensus analytics jobs](/images/consensus_analytics_job_1_50.jpeg)
    2. ![consensus analytics assignee](/images/consensus_analytics_assignee_1_50.jpeg) since the number of annotations
       made by `worker 3` used for consensus has increased it's score has also increased.
12. Now we will change the `Min Overlap Threshold` from `50%` to `100%` and again merge the consensus jobs.
   ![consensus settings](/images/consensus_setting_1_100.jpeg)
13. Below are the merged results
   1. ![frame 1](/images/merged_frame_1_1_100.jpeg)
   2. ![frame 2](/images/merged_frame_2_1_100.jpeg)
   3. Now, the merged job contains all the annotations present in all the consensus jobs. Since, `min iou threshold` is
      `100%` annotations to be grouped together must have a `100%` overlap with each other, so no for consensus the
      group will be of single individual annotations only and as the `quorum` is `1` all these groups wouldn't be
      filtered out.
14. As the quality of annotations in the merged job is further reduced the value of mean consensus score also has
    reduced subsequently
    1. ![consensus analytics jobs](/images/consensus_analytics_job_1_100.jpeg)
    2. ![consensus analytics assignee](/images/consensus_analytics_assignee_1_100.jpeg) since now all the annotations
       by assignees is present in the merged job thus there score is also `100%`

- It can be noticed throughout above steps that the annotations made manually (by assignee) have a tag of `MANUAL` in
  them, whereas annotations obtained through consensus (in merged job) have `CONSENSUS` tag in them.
