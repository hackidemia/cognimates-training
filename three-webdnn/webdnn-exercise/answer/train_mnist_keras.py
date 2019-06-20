"""
This example is based on keras's mnist_mlp.py and mnist_cnn.py

Trains a simple deep NN on the MNIST dataset.
"""

import argparse
import json
import os

import keras
from keras import backend as K
from keras.layers import Dense, Dropout, Flatten, Conv2D, AtrousConv2D, MaxPooling2D, Input, add, \
    GlobalAveragePooling2D, Activation
from keras.models import Sequential, Model

from keras.datasets import mnist
from keras.optimizers import RMSprop

batch_size = 128
num_classes = 10
epochs = 2
img_rows, img_cols = 28, 28


# noinspection PyPackageRequirements
def _setup_model():
    input_shape = (img_rows, img_cols, 1)

    model = Sequential()
    model.add(Conv2D(8, kernel_size=(3, 3), activation="relu", input_shape=input_shape))
    model.add(Conv2D(16, (3, 3), activation="relu"))
    model.add(MaxPooling2D(pool_size=(2, 2)))
    model.add(Dropout(0.25))
    model.add(Flatten())
    model.add(Dense(32, activation="relu"))
    model.add(Dropout(0.5))
    model.add(Dense(num_classes, activation="softmax"))

    print(f"input shape: {input_shape}, data_format: {K.image_data_format()}")
    return model


# noinspection PyPackageRequirements
def train_and_save(model_path):
    (x_train, y_train), (x_test, y_test) = mnist.load_data()

    if K.image_data_format() == "channels_first":
        raise NotImplementedError("Currently, WebDNN converter does not data_format==channels_first")
    x_train = x_train.reshape(x_train.shape[0], img_rows, img_cols, 1)
    x_test = x_test.reshape(x_test.shape[0], img_rows, img_cols, 1)

    x_train = x_train.astype("float32")
    x_test = x_test.astype("float32")
    x_train /= 255
    x_test /= 255

    # convert class vectors to binary class matrices
    y_train = keras.utils.to_categorical(y_train, num_classes)
    y_test = keras.utils.to_categorical(y_test, num_classes)

    model = _setup_model()
    model.summary()
    model.compile(loss="categorical_crossentropy", optimizer=RMSprop(), metrics=["accuracy"])
    model.fit(x_train, y_train, batch_size=batch_size, epochs=epochs, verbose=1, validation_data=(x_test, y_test))

    score = model.evaluate(x_test, y_test, verbose=0)
    print("Test loss:", score[0])
    print("Test accuracy:", score[1])

    print("Saving trained model")
    model.save(model_path)
    print("model saved to " + model_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="keras_model.h5")
    args = parser.parse_args()

    train_and_save(args.out)


if __name__ == "__main__":
    main()
