const express = require('express')
const authController = require('./controllers/auth')
const nlcController = require('./controllers/nlc')
// const visionController = require('./controllers/vision')
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

router.get('/nlc/classifiers', nlcController.getClassifiersList)
router.post('/nlc/classifier', nlcController.createClassifier)
router.get('/nlc/classifier', nlcController.getClassifierInformation)
router.delete('/nlc/classifier', nlcController.deleteClassifier)
router.get('/nlc/classify', nlcController.classifyText)


module.exports = router
