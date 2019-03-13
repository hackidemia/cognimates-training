const express = require('express')
// const authController = require('./controllers/auth')
// const nlcController = require('./controllers/nlc')
const textController = require('./controllers/text')
const visionController = require('./controllers/clarifai')
const router = express.Router()

router.get('/', function (req, res) {
    res.render('index', {
      title: 'Home - Cognimates Studio'
    });
});

// router.get('/login', (req, res) => {
//   res.render('login')
// })

// router.post('/auth/register', authController.register)
// router.post('/auth/login', authController.login)

router.get('/text_home', (req, res) => {
  res.render('models/text/text_home', {
      title: 'Train a text model, Home - Cognimates Studio'
    })
})

router.get('/text_train', (req, res) => {
  res.render('models/text/text_train', {
      title: 'Train a text model, Train - Cognimates Studio'
    })
})

router.get('/text', (req, res) => {
  res.render('models/text/text', {
      title: 'Train a text model - Cognimates Studio'
    })
})

router.get('/text_examples', (req, res) => {
	res.render('models/text/text_examples', {
      title: 'Train a text model, Add examples - Cognimates Studio'
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
router.get('/vision_home', (req, res) => {
  res.render('models/vision/vision_home', {
      title: 'Home - Cognimates Studio'
    })
})

router.get('/vision_train', (req, res) => {
  res.render('models/vision/vision_train', {
      title: 'Home - Cognimates Studio'
    })
})

router.get('/vision_examples', (req, res) => {
  res.render('models/vision/vision_examples', {
      title: 'Home - Cognimates Studio'
    })
})

router.get('/vision', (req, res) => {
  res.render('models/vision/vision', {
      title: 'Home - Cognimates Studio'
    })
})

////////////////////
router.get('/vision/classifiers', visionController.getClassifiersList)
router.post('/vision/classifier', visionController.createClassifier)
router.get('/vision/classifier', visionController.getClassifierInformation)
router.delete('/vision/classifier', visionController.deleteClassifier)
router.post('/vision/classify', visionController.classifyImages)

router.get('/doodle', (req, res) => {
  res.render('models/doodle/doodle')
})

module.exports = router
