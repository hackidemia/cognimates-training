const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const router = require('./router')
const config = require('./config')
const UserClassifier = require('./models/UserClassifier')


const app = express()
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false,
  limit: 50000
}))
app.use(express.static('static'))
app.use(router)


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
