## Serverless for Computer Vision Annotation Tool (CVAT)

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d
```

### Tutorial how to add your own DL model for automatic annotation

Let's try to integration [IOG algorithms for interactive segmentation](https://github.com/shiyinzhang/Inside-Outside-Guidance).

First of all let's run the model on your local machine. The repo doesn't have good instructions and look
like uses outdated versions of packages. The building process is going to be funny. For old version of
pytorch packages it is better to use conda. See below a possible instructions how to run the model on a
local machine.

```bash
git clone https://github.com/shiyinzhang/Inside-Outside-Guidance
cd Inside-Outside-Guidance/
conda create --name iog python=3.6
conda activate iog
conda install pytorch=0.4 torchvision=0.2  -c pytorch
conda install -c conda-forge pycocotools
conda install -c conda-forge opencv
conda install -c conda-forge scipy
```

Download weights from google drive: https://github.com/shiyinzhang/Inside-Outside-Guidance#pretrained-models
Also we will need VOCtrainval_11-May-2012.tar dataset for evaluation: http://host.robots.ox.ac.uk/pascal/VOC/voc2012/VOCtrainval_11-May-2012.tar

Modify `mypath.py` in accordance with instructions inside the repo. In my case `git diff` below:

```python
diff --git a/mypath.py b/mypath.py
index 0df1565..cd0fa3f 100644
--- a/mypath.py
+++ b/mypath.py
@@ -3,15 +3,15 @@ class Path(object):
     @staticmethod
     def db_root_dir(database):
         if database == 'pascal':
-            return '/path/to/PASCAL/VOC2012'  # folder that contains VOCdevkit/.
+            return '/Users/nmanovic/Workspace/datasets/VOCtrainval_11-May-2012/'  # folder that contains VOCdevkit/.

         elif database == 'sbd':
-            return '/path/to/SBD/'  # folder with img/, inst/, cls/, etc.
+            return '/Users/nmanovic/Workspace/datasets/SBD/dataset/'  # folder with img/, inst/, cls/, etc.
         else:
             print('Database {} not available.'.format(database))
             raise NotImplementedError

     @staticmethod
     def models_dir():
-        return '/path/to/models/resnet101-5d3b4d8f.pth'
+        return '/Users/nmanovic/Workspace/Inside-Outside-Guidance/IOG_PASCAL_SBD.pth'
         #'resnet101-5d3b4d8f.pth' #resnet50-19c8e357.pth'
```

It looks like need to update `test.py` to run it without `train.py` script.

```python
diff --git a/test.py b/test.py
index f85969a..8e481d0 100644
--- a/test.py
+++ b/test.py
@@ -51,9 +51,10 @@ net = Network(nInputChannels=nInputChannels,num_classes=1,
                 freeze_bn=False)

 # load pretrain_dict
-pretrain_dict = torch.load(os.path.join(save_dir, 'models', modelName + '_epoch-' + str(resume_epoch - 1) + '.pth'))
-print("Initializing weights from: {}".format(
-    os.path.join(save_dir, 'models', modelName + '_epoch-' + str(resume_epoch - 1) + '.pth')))
+#pretrain_dict = torch.load(os.path.join(save_dir, 'models', modelName + '_epoch-' + str(resume_epoch - 1) + '.pth'))
+#print("Initializing weights from: {}".format(
+#    os.path.join(save_dir, 'models', modelName + '_epoch-' + str(resume_epoch - 1) + '.pth')))
+pretrain_dict = torch.load('/Users/nmanovic/Workspace/Inside-Outside-Guidance/IOG_PASCAL_SBD.pth')
 net.load_state_dict(pretrain_dict)
 net.to(device)
 ```

Now it is possible to run `test.py` and it will generate results inside `./run_0/Results` directory.
It is already a great progress. We can run the pretrained model and get results. Next step is to
implement a simple script which will accept an image with a bounding box and generate a mask for the
object. Let's do that.

```bash
cp test.py model_handler.py
```

