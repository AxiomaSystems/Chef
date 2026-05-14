# Chef Vision Models Documentation

This document describes the available detection and classification models in the Chef vision system, what each model can detect/classify, and the requirements for using them.

## Overview

The Chef vision system uses two main types of models:

1. **Detection Models**: YOLO-based object detectors that find and localize objects in images
2. **Classification Models**: ResNet-based classifiers that identify specific ingredients from cropped object regions

All models are stored in `apps/vision-lab/checkpoints/` and are designed for kitchen/food inventory detection and classification.

## Detection Models

Detection models use YOLO11 architecture and are trained to detect food-relevant objects in kitchen environments. They output bounding boxes with confidence scores and class labels.

### Available Detection Models

#### 1. `yolo11n_ingredient_detector_chef-detector-v002`

- **Path**: `apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v002/weights/best.pt`
- **Training Strategy**: `canonical`
- **Classes**: 23 canonical ingredient/package labels
- **What it detects**:
  - Specific ingredients: tomato, onion, garlic, etc.
  - Package types: milk_carton, rice_bag, spice_bottle, etc.
- **Strengths**: Ingredient-aware boxes, precise labeling
- **Weaknesses**: Limited to 23 trained classes, misses out-of-range items
- **Use case**: When you need exact ingredient detection without classification fallback

#### 2. `yolo11n_ingredient_detector_chef-detector-v004-object-proposal`

- **Path**: `apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v004-object-proposal/weights/best.pt`
- **Training Strategy**: `object_proposal`
- **Classes**: Rudimentary visible-object labels
- **What it detects**:
  - produce_item, bottle, jar, can, box, bag, carton, packet
  - container, bowl, cup, plate, egg_carton
  - unknown_packaged_food, unknown_kitchen_item
- **Strengths**: Highest recall for visible objects, finds non-ingredients too
- **Weaknesses**: Very generic labels, requires policy filtering
- **Use case**: Maximum object discovery, then use classifier for identity

#### 3. `yolo11n_ingredient_detector_chef-detector-v005b-openimages-filtered` (MAIN DEFAULT)

- **Path**: `apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v005b-openimages-filtered/weights/best.pt`
- **Training Strategy**: `object_proposal`
- **Classes**: 8 filtered object proposal classes
- **Training Data**:
  - 6,614 images (4,630 train, 992 val, 992 test)
  - Sources: Open Images v7 kitchen objects + teen food ingredients
  - Max box area filter: 0.65
- **Internal Classes**:
  - bag, bottle, box, can, carton, egg_carton, produce_item, unknown_kitchen_item
- **Product-Facing Labels** (runtime collapsed):
  - `container` (for bag/bottle/box/can/carton/egg_carton)
  - `produce item` (for produce_item)
  - `unknown` (for unknown_kitchen_item)
- **What it detects**: Kitchen objects with food relevance
- **Strengths**: Good balance of recall and relevance, current main product model
- **Weaknesses**: Generic labels need classification for identity
- **Use case**: Primary product detector, review workflow

#### 4. `yolo11n_ingredient_detector_chef-detector-v006-foodinsseg-80plus`

- **Path**: `apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v006-foodinsseg-80plus/weights/best.pt`
- **Training Strategy**: Detector-only with 80+ classes
- **Classes**: 80+ exact food/ingredient classes + generic `container`
- **Training Data**:
  - Main source: FoodInsSeg (103 food categories)
  - Additional: teen-food-ingredient-v1, open-images-v7 for containers/produce
- **What it detects**:
  - Exact ingredients: apple, banana, carrot, chicken, rice, etc.
  - Generic containers for bottles/cans/boxes not obvious as ingredients
- **Strengths**: Direct ingredient identification, no classifier needed
- **Weaknesses**: May miss some packaged items as generic containers
- **Use case**: When you want detector to do most of the identification work

#### 5. `yolo11n.pt` (Base Model)

- **Path**: `apps/vision-lab/checkpoints/base/yolo11n.pt`
- **Source**: Ultralytics YOLO11 nano pretrained weights
- **Classes**: COCO dataset classes (80 classes)
- **What it detects**: General objects like person, car, bottle, cup, etc.
- **Strengths**: Broad object detection, always available
- **Weaknesses**: Not food-specific, low relevance for kitchen inventory
- **Use case**: Fallback when trained models unavailable, general object detection

### Detection Model Requirements

- **Input**: RGB images (PIL Image or numpy array)
- **Output**: List of Detection objects with bbox, label, confidence, class_id
- **Dependencies**: PyTorch, ultralytics, OpenCV
- **Hardware**: CPU or GPU (GPU recommended for speed)
- **Memory**: ~200-500MB depending on model size
- **Typical Latency**: 50-200ms per image on CPU

## Classification Models

Classification models use ResNet18 architecture and are trained to identify specific ingredients from cropped image regions. They take object crops from detectors and predict the most likely ingredient.

### Available Classification Models

#### 1. `resnet18_ingredient_crops_2500`

- **Path**: `apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_2500/best_model.pt`
- **Training Data**: 2,500 ingredient crop images
- **Classes**: ~100 ingredient classes
- **What it classifies**: Ingredient crops into specific food items
- **Use case**: Basic ingredient classification

#### 2. `resnet18_ingredient_crops_5000_modal`

- **Path**: `apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_5000_modal/best_model.pt`
- **Training Data**: 5,000 ingredient crop images
- **Classes**: ~100 ingredient classes
- **What it classifies**: Ingredient crops into specific food items
- **Use case**: Improved classification with more training data

#### 3. `resnet18_ingredient_crops_5000_modal_frozen` (LEGACY)

- **Path**: `apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_5000_modal_frozen/best_model.pt`
- **Training Data**: 5,000 ingredient crop images with frozen layers
- **Classes**: ~100 ingredient classes
- **What it classifies**: Ingredient crops into specific food items
- **Use case**: Legacy model with transfer learning approach

#### 4. `resnet18_ingredient_crops_5000_modal_frozen_v2` (MAIN DEFAULT)

- **Path**: `apps/vision-lab/checkpoints/classifiers/ingredient/resnet18_ingredient_crops_5000_modal_frozen_v2/best_model.pt`
- **Training Data**: 5,000 ingredient crop images
- **Dataset Details**:
  - 100 classes
  - 3,404 train crops, 796 validation crops, 796 test crops
  - Source: `apps/vision-lab/data/hf_food_ingredient_training_import_5000`
- **Classes**: 100 ingredient classes including packaged and fresh foods
- **Validation Accuracy**: 0.660804
- **What it classifies**:
  - Fresh produce: apple, banana, carrot, tomato, onion, etc.
  - Packaged foods: rice, pasta, cereal, canned goods, etc.
  - Dairy: milk, cheese, yogurt, etc.
  - Proteins: chicken, beef, fish, eggs, etc.
  - Pantry staples: flour, sugar, oil, spices, etc.
- **Strengths**: Good accuracy, current main product classifier
- **Weaknesses**: Requires good crop proposals from detector
- **Use case**: Primary product classifier for crop identification

#### 5. `smoke_progress_check`

- **Path**: `apps/vision-lab/data/ingredient_classifier_runs/smoke_progress_check/best_model.pt`
- **Training Data**: Small test dataset
- **Classes**: Limited ingredient classes
- **What it classifies**: Basic ingredient identification
- **Use case**: Development/testing model

#### 6. `smoke_resnet18_yolo_crops`

- **Path**: `apps/vision-lab/data/ingredient_classifier_runs/smoke_resnet18_yolo_crops/best_model.pt`
- **Training Data**: YOLO-detected crop regions
- **Classes**: Ingredient classes from YOLO crops
- **What it classifies**: Ingredients from detector crop proposals
- **Use case**: Testing classifier on detector outputs

### Classification Model Requirements

- **Input**: RGB image crops (PIL Image, typically 224x224)
- **Output**: List of ClassificationPrediction with label and probability
- **Dependencies**: PyTorch, torchvision, PIL
- **Hardware**: CPU or GPU
- **Memory**: ~100-200MB
- **Typical Latency**: 10-50ms per crop on CPU
- **Preprocessing**: ResNet normalization (ImageNet stats)

## Model Selection Guidelines

### For Product Use

- **Detector**: `chef-detector-v005b-openimages-filtered` (balanced recall and relevance)
- **Classifier**: `resnet18_ingredient_crops_5000_modal_frozen_v2` (good accuracy, current standard)

### For Maximum Recall

- **Detector**: `chef-detector-v004-object-proposal` (finds most objects)
- **Classifier**: `resnet18_ingredient_crops_5000_modal_frozen_v2` (identifies them)

### For Exact Ingredient Detection

- **Detector**: `chef-detector-v006-foodinsseg-80plus` (direct ingredient labels)
- **Classifier**: None needed (detector does the identification)

### For Development/Testing

- **Detector**: `yolo11n.pt` (always available, general objects)
- **Classifier**: Any of the trained models for crop testing

## Performance Characteristics

### Detection Models

- **mAP@0.5**: 0.6-0.8 depending on model and dataset
- **Inference Speed**: 50-200ms per image
- **Memory Usage**: 200-500MB
- **Box Recall**: Higher for object-proposal models, lower for canonical models

### Classification Models

- **Top-1 Accuracy**: 0.5-0.7 on validation sets
- **Top-5 Accuracy**: 0.8-0.9 on validation sets
- **Inference Speed**: 10-50ms per crop
- **Memory Usage**: 100-200MB

## Integration Notes

- Detection models run first to find object locations
- Classification models run on cropped regions from detections
- Results are combined in the pipeline with inventory resolution
- Live streaming uses detection only (no classification by default for speed)
- OCR can run on container detections for text extraction
- All models support batch processing for efficiency

## Training Information

- Detection models trained with YOLO11 on custom datasets
- Classification models trained with ResNet18 on cropped ingredient images
- Training data sourced from FoodInsSeg, Open Images, and custom collections
- Models optimized for kitchen/food detection scenarios
- Validation performed on held-out test sets

## Future Models

- Segmentation models for pixel-level food identification
- Multi-modal models combining vision with text/OCR
- Larger models (YOLO11m, YOLO11l) for higher accuracy
- Specialized models for different cuisines or dietary needs</content>
  <parameter name="filePath">c:\Users\webga\OneDrive\Documents\GitHub\Chef\docs\vision-models-guide.md
