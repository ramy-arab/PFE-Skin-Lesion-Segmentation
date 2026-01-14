from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
from tensorflow import keras
from PIL import Image
import io
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import binary_crossentropy
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
from tensorflow.keras.models import load_model
import tensorflow as tf
from tensorflow.keras import backend as K
import tensorflow as tf

from keras.config import enable_unsafe_deserialization
enable_unsafe_deserialization()


app = Flask(__name__)
CORS(app)  # Enable CORS

########################

import tensorflow as tf
from tensorflow.keras import backend as K
from tensorflow.keras.models import load_model

# Dice Coefficient
def dice_coef(y_true, y_pred, smooth=1e-6):
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.cast(y_pred, tf.float32)
    y_true_f = K.flatten(y_true)
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth)

# Intersection over Union (IoU) Coefficient
def iou_coef(y_true, y_pred, smooth=1e-6):
    y_true_f = K.cast(K.flatten(y_true), dtype="float32")
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    union = K.sum(y_true_f) + K.sum(y_pred_f) - intersection
    return (intersection + smooth) / (union + smooth)

# Sensitivity (Recall)
def sensitivity(y_true, y_pred, smooth=1e-6):
    y_true_f = K.cast(K.flatten(y_true), dtype="float32")
    y_pred_f = K.cast(K.flatten(y_pred), dtype="float32")
    true_positives = K.sum(y_true_f * y_pred_f)
    false_negatives = K.sum(y_true_f * (1 - y_pred_f))
    return (true_positives + smooth) / (true_positives + false_negatives + smooth)

# Specificity
def specificity(y_true, y_pred, smooth=1e-6):
    y_true_f = K.cast(K.flatten(y_true), dtype="float32")
    y_pred_f = K.cast(K.flatten(y_pred), dtype="float32")
    true_negatives = K.sum((1 - y_true_f) * (1 - y_pred_f))
    false_positives = K.sum((1 - y_true_f) * y_pred_f)
    return (true_negatives + smooth) / (true_negatives + false_positives + smooth)

# Dice Loss
def dice_loss(y_true, y_pred):
    return 1 - dice_coef(y_true, y_pred)

# Binary Crossentropy + Dice Loss
def bce_dice_loss(y_true, y_pred):
    return tf.keras.losses.BinaryCrossentropy()(y_true, y_pred) + dice_loss(y_true, y_pred)





def contrast_enhancement(image):

    IMG_SIZE = (256, 256)
    CLIP_LIMIT = 2.0  # CLAHE clip limit
    GRID_SIZE = (8, 8)  # CLAHE tile grid size
    ALPHA = 1.2  # Contrast adjustment factor
    THETA = 10  # Brightness adjustment



    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Histogram Equalization
    l_eq = cv2.equalizeHist(l)

    # Adaptive Histogram Equalization
    clahe = cv2.createCLAHE(clipLimit=CLIP_LIMIT, tileGridSize=GRID_SIZE)
    l_ah = clahe.apply(l_eq)

    # Contrast Stretching
    l_cs = np.zeros_like(l_ah)
    cv2.normalize(l_ah, l_cs, 0, 230, cv2.NORM_MINMAX)

    # Merge and convert back to BGR
    enhanced_lab = cv2.merge((l_cs, a, b))
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    # Adjust contrast and brightness
    final_image = cv2.convertScaleAbs(enhanced_bgr, alpha=ALPHA, beta=THETA)

    return final_image




MODEL_PATH = "D:/pfeee/Code/application_demonstration/unet.keras"



model = load_model(MODEL_PATH, custom_objects={
    "dice_coef": dice_coef,
    "iou_coef": iou_coef,
    "sensitivity": sensitivity,
    "specificity": specificity,
    "dice_loss": dice_loss,
    "bce_dice_loss": bce_dice_loss
})



print("Model loaded successfully!")

IMG_SIZE = (256, 256)


# ###########################


@app.route("/segment", methods=["POST"])
def segment():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    # Save original size
    original_h, original_w = image.shape[:2]

    # ✅ Preprocess for model (resize to training size)
    input_img = cv2.resize(image, IMG_SIZE)
    input_img = contrast_enhancement(input_img)   # if used during training
    input_img = np.expand_dims(input_img, axis=0)

    # 🔹 Predict
    mask = model.predict(input_img)[0]

    # 🔹 Post-process mask
    mask = (mask > 0.5).astype(np.uint8)  # thresholding
    mask = np.squeeze(mask, axis=-1)      # remove channel dim
    mask = (mask * 255).astype(np.uint8)  # scale to 0-255

    # ✅ Resize mask back to original image size
    mask = cv2.resize(mask, (original_w, original_h), interpolation=cv2.INTER_NEAREST)

    # 🔹 Encode as base64 PNG
    _, buffer = cv2.imencode(".png", mask)
    mask_base64 = base64.b64encode(buffer).decode("utf-8")

    return jsonify({"mask": mask_base64})




if __name__ == "__main__":
    app.run(debug=True)