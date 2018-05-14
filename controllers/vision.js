const User = require('../models/User');
const auth = require('../controllers/auth');
const UserClassifier = require('../models/UserClassifier');
const config = require('../config');
const path = require('path');
var csv = require('csv');
const fs = require('fs');
let nodeJsZip = require("nodeJs-zip");
let archiver = require('archiver');
let watson = require('watson-developer-cloud/visual-recognition/v3');

const watson = new VisualRecognitionV3({
    api_key: config.VISION_API,
    url: config.VISION_URL
});

String.prototype.toObjectId = function() {
    var ObjectId = (require('mongoose').Types.ObjectId);
    return new ObjectId(this.toString());
};

function getClassifiersList(req, res) {
    let token = req.headers.token;
    if(token == null) {
      res.json({ error: 'Unauthorized'})
      return
    }
    auth.validateToken(token, (err, _user) => {
      if(err != null) {
        res.json({ error: err.message })
        return
      }

      if(_user == null) {
        res.json({ error: 'User not found'})
        return
      } else {
        getUserClassifiers(_user)
      }
    })

    function getUserClassifiers(user) {
      UserClassifier.find({ "user": user._id }, (err, classifiers) => {
        if(err != null) {
          res.json({ error: err.message})
          return
        }
        getWatsonClassifiers(classifiers)
      })
    }

    function getWatsonClassifiers(userClassifiers) {
      watson.listClassifiers({}, (err, response) => {
        if(err) {
          res.json({ error: err.message})
          return
        }
        if (response != null) {
          remainingClassifiers = [];
          deletedClassifiers = [];
          userClassifiers.forEach((classifier) => {
            var found = false;
            for (var idx = 0; idx < response.classifiers.length; idx++) {
              if (classifier.classifier_id == response.classifiers[idx].classifier_id) {
                found = true;
                remainingClassifiers.push(classifier);
              }
            }
            if(found == false) {
              deletedClassifiers.push(classifier.classifier_id);
            }
          })
          UserClassifier.remove({ classifier_id: { $in: deletedClassifiers }}, (err, res) => {
            if(err) {
              console.log(err.message);
            }
          });
          res.json({classifiers: remainingClassifiers})
          return
        }
      });
    }
}

function getClassifierInformation(req, res) {
    let token = req.headers.token;
    var classifier_id = req.query.classifier_id;
    if(token == null) {
      res.json({ error: 'Unauthorized'})
      return
    }
    auth.validateToken(token, (err, _user) => {
      if(err != null) {
        res.json({ error: err.message })
        return
      }

      if(_user == null) {
        res.json({ error: 'User not found'})
        return
      } else {
        checkUserClassifier(_user.id, classifier_id)
      }
    })

    function checkUserClassifier(userId, classifier_id) {
        UserClassifier.findOne({ user: userId, classifier_id : classifier_id}, (err, classifier) => {
        if (err) {
            res.json({ error: err.message })
            return
        }
        if(classifier != null) {
            getInformation(classifier_id)
            return
        } else {
            res.json({ error: 'This classifier does not belong to this account'})
            return
        }
        })
    }

    function getInformation(classifier_id) {
        watson.getClassifier({ classifier_id: classifier_id }, (err, response) => {
        if(err) {
            res.json({ error: err.message })
            return
        }
        res.json(response)
        })
    }
}

function createClassifier(req, res) {
    let token = req.headers.token;
    var name = req.body.name;
    var data = req.body.training_data;
  
    var userId = null
    var filepath = null
    auth.validateToken(token, (err, _user) => {
      if(err != null) {
        res.json({ error: err.message })
        return
      }
  
      if(_user == null) {
        res.json({ error: 'User not found'})
        return
      } else {
        userId = _user.id
        prepareData()
      }
    })
  
    function prepareData() {
      var preparedData = []
      data.forEach((element) => {
        var row = []
        row.push(`${element.phrase}`)
        row.push(`${element.label}`)
        preparedData.push(row)
      })
      data = preparedData
      createCSV()
    }
  
    function createCSV() {
        let randomNumber = random(10000,99999)
        filepath = path.join(__dirname, `${randomNumber}.csv`)
        csv.stringify(data, (err, output) => {
          if(err) {
            res.json({ error: err.message })
            return
          }
  
          fs.writeFile(filepath, output, onCSVWritten)
        })
    }
  
    function onCSVWritten(err) {
      if(err) {
        res.json({ error: err.message })
        return
      }
  
      var params = {
        metadata: JSON.stringify({
          name: name,
          language: 'en'
        }),
        training_data: fs.createReadStream(filepath)
      }
      watson.createClassifier(params, onCreateClassifier)
    }
  
    function onCreateClassifier(err, response) {
      fs.unlink(filepath)
      if(err) {
        res.json({ error: err.message })
        return
      }
      saveClassifier(response)
    }
  
    function saveClassifier(classifier_data) {
      var classifier = new UserClassifier({
        user: userId,
        classifier_id: classifier_data.classifier_id,
        url: classifier_data.url,
        created: classifier_data.created,
        name: classifier_data.name
      })
      classifier.save((err, doc) => {
        if(err) {
          res.json({ error: err.message })
          return
        }
  
        res.json(doc)
      })
    }
}
