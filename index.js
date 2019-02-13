const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const router = require('./router')
const config = require('./config')
const UserClassifier = require('./models/UserClassifier')
const bb = require('express-busboy')

const app = express()
app.use(cors())
app.engine('html', require('ejs').renderFile);
app.use(express.static('static'));
app.use(bodyParser.json({limit: '337mb'}))
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb'
}))
//app.use(express.static('static'))


app.use(router)

bb.extend(app, {
  upload: true
})



mongoose.connect(config.mongooseURL)


// var classifier = new UserClassifier({
//     "user": mongoose.Types.ObjectId("5aecb1b474de2064da4240d0"),
//     "classifier_id": "e9761fx361-nlc-1166",
//     "url": "https://gateway.watsonplatform.net/natural-language-classifier/api/v1/classifiers/e9761fx361-nlc-1166",
//     "created": "2018-05-06T10:07:55.058Z",
//     "name": "Text classifier"
// })
// classifier.save((err, doc) => {
//   console.log(err, doc);
// })


app.listen(config.SERVER_PORT, () => {
  console.log(`Server running on port ${config.SERVER_PORT}`);
})
