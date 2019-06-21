from keras.applications import resnet50
model = resnet50.ResNet50(include_top=True, weights='imagenet')
# model.save("resnet50.h5")

from webdnn.frontend.keras import KerasConverter
from webdnn.backend import generate_descriptor

graph = KerasConverter(batch_size=1).convert(model)
exec_info = generate_descriptor("webgpu", graph)  # also "webassembly", "webgl", "fallback" are available.
exec_info.save("./output")