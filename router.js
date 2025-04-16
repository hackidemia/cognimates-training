const express = require('express')
const authController = require('./controllers/auth')
const nlcController = require('./controllers/nlc')
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

router.get('/nlc/classifiers', (req, res) => res.redirect('/api/text/classifiers'))
router.post('/nlc/classifier', (req, res) => {
  req.url = '/api/text/classifier';
  req.app.handle(req, res);
})
router.get('/nlc/classifier', (req, res) => {
  req.url = '/api/text/classifier';
  req.app.handle(req, res);
})
router.delete('/nlc/classifier', (req, res) => {
  req.url = '/api/text/classifier';
  req.app.handle(req, res);
})
router.get('/nlc/classify', (req, res) => {
  req.url = '/api/text/classify';
  req.app.handle(req, res);
})

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

router.get('/vision/classifiers', (req, res) => res.redirect('/api/image/classifiers'))
router.post('/vision/classifier', (req, res) => {
  req.url = '/api/image/classifier';
  req.app.handle(req, res);
})
router.get('/vision/classifier', (req, res) => {
  req.url = '/api/image/classifier';
  req.app.handle(req, res);
})
router.delete('/vision/classifier', (req, res) => {
  req.url = '/api/image/classifier';
  req.app.handle(req, res);
})
router.post('/vision/classify', (req, res) => {
  req.url = '/api/image/classify';
  req.app.handle(req, res);
})


module.exports = router
