const express = require('express')
const textController = require('./controllers/text')
const visionController = require('./controllers/clarifai')
const router = express.Router()

router.get('/', function (req, res) {
    res.render('index', {
      title: 'Cognimates, Home'
    });
});

router.get('/home', function (req, res) {
    res.render('index', {
      title: 'Cognimates, Home'
    });
});

//begin text routes
router.get('/text_home', (req, res) => {
  res.render('models/text/text_classifiers', {
      title: 'Cognimates, Train a text model, Home'
    })
})

//routes for text api calls
router.post('/nlc/classifier', textController.createClassifier)
router.get('/nlc/classifier', textController.getClassifierInformation)
router.delete('/nlc/classifier', textController.deleteClassifier)
router.post('/nlc/createClass', textController.createClass)
router.delete('/nlc/removeClass', textController.removeClass)
router.post('/nlc/classify', textController.classifyText)
router.post('/nlc/addExamples', textController.addExamples)
router.post('/nlc/untrain', textController.untrain)
router.post('/nlc/trainAll', textController.trainAll)
router.get('/nlc/extension/:read/:write/:username/:model', (req, res) => {
    var read_api = req.params.read;
    var write_api = req.params.write;
    var username = req.params.username;
    var classifier_id = req.params.model;

    res.contentType('application/javascript');
    res.charset = 'UTF-8';
    res.render('models/text/extension', {
      read_api: read_api,
      write_api: write_api,
      username: username,
      classifier_id: classifier_id,
      layout: false
    });
});


//begin vision routes
router.get('/vision_home', (req, res) => {
  res.render('models/vision/vision_classifiers', {
      title: 'Cognimates, Train a vision model, Home'
    })
})

//vision api calls
router.get('/vision/classifiers', visionController.getClassifiersList)
router.post('/vision/classifier', visionController.createClassifier)
router.get('/vision/classifier', visionController.getClassifierInformation)
router.delete('/vision/classifier', visionController.deleteClassifier)
router.post('/vision/classify', visionController.classifyImages)
router.post('/vision/classifyURLImage', visionController.classifyURLImage)
router.post('/vision/updateClassifier', visionController.updateClassifier)
router.get("/vision/extension/:apikey/:modelid", (req, res) => {
    var apikey = req.params.apikey;
    var model_id = req.params.modelid;

    res.contentType('application/javascript');
    res.charset = 'UTF-8';
    res.render('models/vision/extension', {
      CLARIFAI_KEY: apikey,
      MODEL_ID: model_id,
      layout: false
    });
});

//begin doodle routes
router.get('/doodle', (req, res) => {
  res.render('models/doodle/doodle', {
      title: 'Cognimates, Doodle Model',
      layout: 'doodle'
    })
})

//begin visualizer routes
router.get('/visualizer', (req, res) => {
  res.render('three/test', {
    title: 'Cognimates, Neural Network Visualizer'
  });
})

module.exports = router
