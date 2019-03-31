const Clarifai = require('clarifai');

function init(api_key) {
  var app = new Clarifai.App({
   apiKey: api_key
  });
  return app;
}

function getClassifiersList(req, res) {
  const apiKey = req.headers.apikey;
  const app = init(apiKey);
  app.models.list().then(
  (response) => {
    var models = [];
    if (parseInt(response.length) > 19) {
      for (var index = 0; index < parseInt(response.length); index++) {
        var item = response[index];
        var model = {};
        model.name = item.name;
        model.classifier_id = item.id;
        model.version_id = item.versionId;
        models.push(model);
      }
    }
    res.json({ classifiers: models });
  },
  (err) => {
    res.json({ error: err.message });
  });
}

function getClassifierInformation(req, res) {
  const apiKey = req.headers.apikey;
  const model_id = req.query.classifier_id;
  const app = init(apiKey);
  app.models.get(model_id).then(
    (response) => {
      var model = {};
      model.name = response.name;
      model.classifier_id = response.id;
      model.version_id = response.versionId;
      model.created = response.createdAt;
      model.status = response.modelVersion.status.description;
      res.json(model);
    },
  (err) => {
    res.json({ error: err.message });
  });
}

function createClassifier(req, res) {
  const apiKey = req.headers.apikey;
  const modelName = req.body.name;
  var data = req.body.training_data;
  const app = init(apiKey);

  var inputs = []
  var labels = []
  var model_id = '';
  var version_id = '';

  function validateData() {
    var errorFound = false
    var errorMessage = ''
    for(var idx in data) {
      var label = data[idx].label;
      var concept = { id : label };
      labels.push(concept);
      if(data[idx].label_items.length < 10) {
        errorMessage = 'Label must have a minimum of 10 examples'
        errorFound = true
        console.log(data[idx].label);
        console.log(data[idx].label_items.length);
        break;
      }
      for(var subidx = 0; subidx < data[idx].label_items.length; subidx++) {
        var img = data[idx].label_items[subidx];
        var input = {};
        input.base64 = img;
        input.concepts = [];
        var concept = {
          id: data[idx].label,
          value: true
        }
        input.concepts.push(concept);
        inputs.push(input);
      }
      if(errorFound == true) {
        break;
      }
    }
    data = inputs
    inputs = undefined
    if(errorFound == true) {
      res.json({ error: errorMessage })
      return
    }
    saveImages()
  }

  function saveImages() {
    app.inputs.create(data).then(
      (response) => {
        createModel();
      },
      (err) => {
        console.log(err);
        res.json({ error: err.message });
      }
    )
  }

  function createModel() {
    app.models.create(modelName, labels).then(
      (response) => {
        var model = {};
        model_id = response.id;
        model.name = response.name;
        model.classifier_id = response.id;
        model.version_id = response.versionId;
        model.created = response.createdAt;
        model.status = response.modelVersion.status.description;
        res.json(model);
        train();
      },
      (err) => {
        console.log(err.data);
        res.json({ error: err.data.status.details });
      }
    )
  }

  function train() {
    app.models.train(model_id);
  }

  validateData();
}

function deleteClassifier(req, res) {
  const apiKey = req.headers.apikey;
  const model_id = req.query.classifier_id;
  const app = init(apiKey);
  app.models.delete(model_id).then(
  (response) => {
    if (response.status != null && response.status.code == 10000) {
      res.json({ success: true });
    } else {
      res.json({ error: response.status.description });
    }
    app.inputs.delete()
  },
  (err) => {
    res.json({ error: err.message });
  });
}

function classifyImage(req, res) {
  const apiKey = req.headers.apikey;
  var image_data = req.body.image_data;
  if (image_data != undefined) {
    if (image_data.length == 0) {
      res.json({ error: 'Send a valid image in base64 format'});
      return;
    }
    if (image_data.indexOf(',') != -1) {
      image_data = image_data.split(',').pop();
    }
  } else {
    res.json({ error: 'Send a valid image in base64 format'});
    return;
  }
  const model_id = req.body.classifier_id;
  const app = init(apiKey);
  if (model_id === 'general1234') {
    app.models.predict(Clarifai.GENERAL_MODEL, { base64: image_data }).then(
    (response) => {
      if (response.status.code == 10000) {
        var output = response.outputs[0].data.concepts;
        var results = [];
        for (var index = 0; index < output.length; index++) {
          var result = {};
          result.class = output[index].name;
          result.score = output[index].value;
          results.push(result);
        }
        res.json(results)
      } else {
        if (response.status.description != undefined) {
          res.json({error: response.status.description});
        } else {
          res.json({ error: 'Could not classify the image' });
        }
      }
    },
    (err) => {
      console.log(err)
      res.json({ error: err });
    });
  } else {
    app.models.predict(model_id, { base64: image_data }).then(
    (response) => {
      if (response.status.code == 10000) {
        var output = response.outputs[0].data.concepts;
        var results = [];
        for (var index = 0; index < output.length; index++) {
          var result = {};
          result.class = output[index].name;
          result.score = output[index].value;
          results.push(result);
        }
        res.json(results)
      } else {
        if (response.status.description != undefined) {
          res.json({error: response.status.description});
        } else {
          res.json({ error: 'Could not classify the image' });
        }
      }
    },
    (err) => {
      console.log(err.data);
      if (err.data.status.details != undefined) {
        res.json({ error: err.data.status.details });
      } else if (err.data.status.description) {
        res.json({ error: err.data.status.description });
      } else {
        res.json({ error: 'Could not classify the image' });
      }
    });
  }
}

function classifyURLImage(req, res){
  const apiKey = req.body.apikey;
  var image_link = req.body.image_url;
  const model_id = req.body.classifier_id;
  const app = init(apiKey);
  console.log('here');
  app.models.predict(model_id, { url: image_link }).then(
    (response) =>{
      if(parseInt(response.status.code) == 10000) {
        var output = response.outputs[0].data.concepts;
        var results = [];
        for(var index = 0; index < output.length; index++){
          var result = {};
          result.class = output[index].name;
          result.score = output[index].value;
          results.push(result);
        }
        res.json(results);
      } else {
        if (response.status.description != undefined) {
          res.json({error: response.status.description});
        } else {
          res.json({ error: 'Could not classify the image' });
        }
      }
    },
    (err) => {
      console.log(err.data);
      if (err.data.status.details != undefined) {
        res.json({ error: err.data.status.details });
      } else if (err.data.status.description) {
        res.json({ error: err.data.status.description });
      } else {
        res.json({ error: 'Could not classify the image' });
      }
    }
  )
}

function updateClassifier(req, res){
  //info needed for both
  const apiKey = req.headers.apikey;
  const app = init(apiKey);
  const model_id = req.body.classifier_id;
  const images = req.body.images;
  const concept = req.body.class;
  let type;
  //get type to know whether image is url or regular image
  if(images[0].substring(0,4) === 'data'){
    type = 'base64';
  } else{
    type = 'url';
  }
  //go through each image and turn it into an input
  for (var i = 0; i < images.length; i++) {
    image_data = images[i];
    if(type == 'base64'){
      if (image_data != undefined) {
        if (image_data.length == 0) {
          res.json({ error: 'Send a valid image in base64 format'});
          return;
        }
        if (image_data.indexOf(',') != -1) {
          image_data = image_data.split(',').pop();
        }
      } else {
        res.json({ error: 'Send a valid image in base64 format'});
        return;
      }
      //create image as an input
      app.inputs.create({base64: image_data, concepts: [{id: concept, value: true}]});
    } else {
      //create url image as input
      app.inputs.create({url: image_data, concepts: [{id: concept, value: true}]});
    }
  }

  //train the specified model
  app.models.train(model_id, true).then(
    (response) => {
      res.json("Training finished successfully..");
    },
    (err) => {
      console.log(err);
      res.json({error: err});
    }
  );
}

module.exports = {
  createClassifier : createClassifier,
  getClassifiersList : getClassifiersList,
  getClassifierInformation : getClassifierInformation,
  classifyImages : classifyImage,
  deleteClassifier : deleteClassifier,
  classifyURLImage: classifyURLImage,
  updateClassifier: updateClassifier
};
