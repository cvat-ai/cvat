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
|![basket_hound_ear_covered](/images/basket_hound_ear_covered.png)|![basket_hound_ear_not_covered](/images/basket_hound_ear_not_covered.png)|


See:

- [Use Cases](#use-cases)
- [Terminology:](#terminology)
- [Step by Step Guide](#step-by-step-guide)

## Use Cases

1. Instead of annotating the entire dataset with multiple annotators, you can use a smaller set of highly skilled annotators and rely on their consensus to create high-quality ground truth annotations. This reduces the overall cost compared to annotating every instance with multiple annotators.
2. In cases of points and poly-line / poly-shape annotations, annotators can add more annotations without a fixed structure, which can introduce significant variation. Similarly, for skeleton annotations, while there is a structure, annotators can move the points around. Due to the presence of numerous points, this can lead to significant variations in annotations for the same data. Using a consensus-based approach for such data types can help reduce these variations, which may arise from minor errors in placing the points.
   1. For example, in the figure, an annotator might place a point representing the foot anywhere across the pink region, leading to significant variation in the annotations. ![pink_shoes](/images/pink_shoes.png)


## Terminology:
1. `min_iou_threshold`: This is the same as `iou_threshold` param in Quality Settings. It's used for distinction between matched / unmatched annotations. A annotation is considered in the consensus only with the annotations it has an overlap greater than or equal to this
2. `agreement_score_threshold`: After consensus the merged annotation, is assigned a score based on it's overlap with other annotations in the cluster, (add label score thing also). Merged annotation with this score lesser than `agreement_score_threshold` are discarded.
3. `Quorum`: The minimum number of annotations in a consensus for the merging to occur. While deciding the final label of merged annotation, the count of specific label shouldn't be less than this.
4. `oks_sigma`: This is the same as `oks_sigma` param in Quality Settings. Like `min_iou_threshold`, but for points. The percent of the bbox area, used as the radius of the circle around the GT point, where the checked point is expected to be. Read more: [https://cocodataset.org/#keypoints-eval](https://cocodataset.org/#keypoints-eval)
5. `line_thickness`: This is the same as `line_thickness` param in Quality Settings. Thickness of polylines, relatively to the (image area) ^ 0.5. The distance to the boundary around the GT line, inside of which the checked line points should be.


## Step by Step Guide
1. Create a new task ![new task](/images/new_task_page.png)
2. Set a non zero value to `Consensus Jobs Per Regular Job` parameter under the `Advanced configuration`
   1. ![advanced config page](/images/adv_conf_page.png)
   2. ![task_page_consensus](/images/task_page_consensus.png)
3. Open this task, and assign workers to the consensus jobs
   1. ![consensus task](/images/consensus_task.png)
   2. ![assigned workers](/images/assigned_workers.png)
4. This are the annotations made by `worker 1`
   1. ![frame 1](/images/worker_1_1.png)
   2. ![frame 2](/images/worker_1_2.png)
   3. ![frame 3](/images/worker_1_3.png)
5. This are the annotations made by `worker 2`
   1. ![frame 1](/images/worker_2_1.png) In this frame the annotations are significantly off by our expectations.
   2. ![frame 2](/images/worker_2_2.png) In this frame worker 2 hasn't annotated one of the dogs.
   3. ![frame 3](/images/worker_2_3.png)
6. Click on `Merge Consensus Jobs`, this will merge all the consensus jobs into their regular job.
   1. ![consensus merge button](/images/consensus_merge_button.png)
   2. ![consensus merge confirmation](/images/consensus_merge_confirmation.png)
   3. ![loading consensus merge](/images/loading_consensus_merge.png) The button will be disabled until the previous merge action isn't completed.
7. Below are the merged results
   1. ![frame 1](/images/merged_1.png)
   2. ![frame 2](/images/merged_2.png) Through consensus it got the annotation from worker 1's annotation
   3. ![frame 3](/images/merged_3.png)
8. On clicking on `View Consensus Analytics` ![view consensus analytics](/images/view_consensus_analytics.png)
   1. ![consensus analytics](/images/consensus_analytics_1.png) Here the score corresponding to the job (merged job) represents, the mean overlap (IoU) among the annotations in it's consensus jobs and the merged job.
   2. ![consensus analytics conflicts](/images/consensus_analytics_1_conf.png) There was an annotation made by worker 1 but not by worker 2, that annotation didn't had any matching annotations so it raised `No matching annotation` conflict. Similarly, there were two annotations in the first frame which didn't matched as they didn't satisfied the `Min Overlap Threshold` condition. Thus, 3 `No matching annotation` conflicts are raised.
   3. ![consensus settings](/images/consensus_settings_1.png)
9. Now we will change the `Min Overlap Threshold` from `50%` to `20%` and again merge the consensus jobs. ![consensus settings](/images/consensus_settings_2.png)
10. We can see after this, in the first frame we have a single annotation instead of two annotations which weren't matched previously. ![updated frame 1](/images/consensus_label.png)
11. Thus now in the consensus analytics page the number of conflict is reduced to one.
    1. ![updated consensus analytics](/images/consensus_analytics_2.png)
    1. ![updated consensus analytics conflicts](/images/consensus_analytics_2_conf.png)
12. On clicking on `Assignees` assignee level analytics can also be viewed. ![consensus analytics assignee](/images/consensus_analytics_2_assignee.png)

- Annotations made manually have a tag of `MANUAL` in them, whereas annotations obtained through consensus have `CONSENSUS` tag in them.
  - ![manual label](/images/manual_label.png)
  - ![consensus label](/images/consensus_label.png)
- Similar merge option is available under each Regular Job, to perform merging of consensus job at job level instead of task level ![job wise consensus merge button](/images/job_wise_consensus.png)