const express = require('express')
const authController = require('./controllers/auth')
const nlcController = require('./controllers/text')
const visionController = require('./controllers/clarifai')
const router = express.Router()


router.get('/', (req, res) => {
  res.render('index.html')
})

router.get('/home', (req, res) => {
  res.render('home.html')
})

router.get('/nlc_home', (req, res) => {
  res.render('nlc_home.html')
})

router.get('/nlc_train', (req, res) => {
  res.render('nlc_train.html')
})

router.get('/nlc', (req, res) => {
  res.render('nlc.html')
})

router.get('/train', (req, res) => {
  res.render('train.html')
})

router.get('/nlc_examples', (req, res) => {
	res.render('nlc_examples.html')
})

router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)

router.post('/nlc/classifier', nlcController.createClassifier)
router.get('/nlc/classifier', nlcController.getClassifierInformation)
router.delete('/nlc/classifier', nlcController.deleteClassifier)
router.post('/nlc/createClass', nlcController.createClass)
router.delete('/nlc/removeClass', nlcController.removeClass)
router.post('/nlc/classify', nlcController.classifyText)
router.post('/nlc/addExamples', nlcController.addExamples)
router.post('/nlc/untrain', nlcController.untrain)

router.get('/vision_home', (req, res) => {
  res.render('vision_home.html')
})

router.get('/vision_train', (req, res) => {
  res.render('vision_train.html')
})

router.get('/vision-train', (req, res) => {
  res.render('vision-train.html')
})

router.get('/vision_examples', (req, res) => {
  res.render('vision_examples.html')
})

router.get('/vision', (req, res) => {
  res.render('vision.html')
})

router.get('/vision/classifiers', visionController.getClassifiersList)
router.post('/vision/classifier', visionController.createClassifier)
router.get('/vision/classifier', visionController.getClassifierInformation)
router.delete('/vision/classifier', visionController.deleteClassifier)
router.post('/vision/classify', visionController.classifyImages)

router.get('/doodle', (req, res) => {
  res.render('doodle/doodle.html')
})

module.exports = router
