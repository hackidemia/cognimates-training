const express = require('express')
const textController = require('./controllers/text')
const visionController = require('./controllers/clarifai')
const router = express.Router()

router.get('/', function (req, res) {
    res.render('index', {
      title: 'Cognimates, Home'
    });
});

router.get('/text_home', (req, res) => {
  res.render('models/text/text_home', {
      title: 'Cognimates, Train a text model, Home'
    })
})

router.get('/text_train', (req, res) => {
  res.render('models/text/text_train', {
      title: 'Cognimates, Train a text model, Train'
    })
})

router.get('/text_examples', (req, res) => {
  res.render('models/text/text_examples', {
      title: 'Cognimates, Train a text model, Examples'
    })
})

router.get('/text', (req, res) => {
  res.render('models/text/text', {
      title: 'Cognimates, Train a text model, Result'
    })
})

////////////////////
router.post('/text/classifier', textController.createClassifier)
router.get('/text/classifier', textController.getClassifierInformation)
router.delete('/text/classifier', textController.deleteClassifier)
router.post('/text/createClass', textController.createClass)
router.delete('/text/removeClass', textController.removeClass)
router.post('/text/classify', textController.classifyText)
router.post('/text/addExamples', textController.addExamples)
router.post('/text/untrain', textController.untrain)

////////////////////
// router.get('/vision_home', (req, res) => {
//   res.render('models/vision/vision_home', {
//       title: 'Cognimates, Train a vision model, Home'
//     })
// })

router.get('/vision_home', (req, res) => {
  res.render('models/vision/vision_classifiers', {
      title: 'Cognimates, Train a vision model, Home',
      serviceName: 'Clarifai.com',
      serviceUrl: 'https://clarifai.com/signup'
    })
})

router.get('/vision_train', (req, res) => {
  res.render('models/vision/vision_train', {
      title: 'Cognimates, Train a vision model, Train'
    })
})

router.get('/vision_examples', (req, res) => {
  res.render('models/vision/vision_examples', {
      title: 'Cognimates, Train a vision model, Examples'
    })
})

router.get('/vision', (req, res) => {
  res.render('models/vision/vision', {
      title: 'Cognimates, Train a vision model, Result'
    })
})

////////////////////
router.get('/vision/classifiers', visionController.getClassifiersList)
router.post('/vision/classifier', visionController.createClassifier)
router.get('/vision/classifier', visionController.getClassifierInformation)
router.delete('/vision/classifier', visionController.deleteClassifier)
router.post('/vision/classify', visionController.classifyImages)

router.get('/doodle', (req, res) => {
  res.render('models/doodle/doodle', {
      title: 'Cognimates, Doodle Classifier'
    })
})

module.exports = router
