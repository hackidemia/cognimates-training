const User = require('../models/User')
const auth = require('../controllers/auth')
const UserClassifier = require('../models/UserClassifier')
const config = require('../config')
const path = require('path')
var csv = require('csv')
const fs = require('fs')
const request = require('request');
const base_url = "https://api.uclassify.com/v1/";


String.prototype.toObjectId = function() {
  var ObjectId = (require('mongoose').Types.ObjectId);
  return new ObjectId(this.toString());
};

function getClassifiersList(req, res) {
    let token = req.headers.token
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
        getClassifiers(classifiers)
      })
    }
  }

    function getClassifiers(userClassifiers, read_token, username) {
      remainingClassifiers = []
      deletedClassifiers = []

      userClassifiers.forEach((classifier) => {
        var found = false
        get_classifier_url = base_url + username + "/" + classifier.classifier_id;
        token_text = "Token " + read_token;
        request.get({
          url:get_classifier_url, 
          headers: {'Content-Type': 'application/json', 'Authorization': token_text}},
          function(err,httpResponse){
            if(err){
              console.log("this classifier no longer exists");
            } else {
              remainingClassifiers.push(classifier)
              return;
            } 
          });
        if(found == false) {
          deletedClassifiers.push(classifier.classifier_id)
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

function getClassifierInformation(req, res) {
    let token = req.headers.token
    var classifier_id = req.query.classifier_id
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

    //https://www.uclassify.com/docs/restapi#readcalls-getinformation
    function getInformation(classifier_id, read_token, username) {
      get_classifier_url = base_url + username + "/" + classifier_id;
      token_text = "Token " + read_token;
      request.get({
        url:get_classifier_url, 
        headers: {'Content-Type': 'application/json', 'Authorization': token_text}},
        function(err,httpResponse){
          if(err){
            res.json({error: err.message});
            return;
          } else {
            res.json(httpResponse);
            return;
          } 
        });
    }
}

function createClassifier(req, res) {
  let token = req.headers.token
  var name = req.body.name
  var data = req.body.training_data

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


function random (low, high) {
    return Math.random() * (high - low) + low;
}



function deleteClassifier(req, res) {
  let token = req.headers.token
  var classifier_id = req.body.classifier_id
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
        delClassifier(classifier_id)
        return
      } else {
        res.json({ error: 'This classifier does not belong to this account'})
        return
      }
    })
  }

  function delClassifier(classifier_id, username, write_token) {
    var del_url = base_url + "/" + username + "/" + classifier_id;
    let token_text = 'Token ' + write_token;
    request.delete({
      url:del_url, 
      headers: {'Content-Type': 'application/json', 'Authorization': token_text}},
      function(err,httpResponse){
        if(err){
          console.log("error here!!");
          res.json({error: err.message});
          return;
        } else {
          deleteUserClassifier(classifier_id)
          return;
        } 
      });

  }

  function deleteUserClassifier(classifier_id) {
    UserClassifier.remove({ classifier_id: classifier_id }, (err, doc) => {
      if(err) {
        res.json({ error: err.message })
        return
      }

      res.json(doc)
      return
    })
  }
}

function classify(req, res) {
  let token = req.body.token;
  var classifier_id = req.body.classifier_id;
  var phrase = req.body.phrase;
  var classify_username = req.body.classify_username;

  let classifyURL = base_url+classify_username+'/'+classifier_id+'/classify';
  let token_text = 'Token ' + token;

  request.post({
    url:classifyURL, 
    headers: {'Content-Type': 'application/json', 'Authorization': token_text},
    body: {texts: [phrase]}, json: true}, 
    function(err,httpResponse, body){
       if(err){
         console.log("error here!!");
         res.json({error: err.message});
         return;
       } 
       if(httpResponse.statusCode === 200){
         res.json(body[0].classification);
         return;
       } else {
        res.json({ error: 'Could not classify the image' });
       }
      });
  }




module.exports = {
  getClassifiersList: getClassifiersList,
  getClassifierInformation: getClassifierInformation,
  classifyText: classify,
  deleteClassifier: deleteClassifier,
  createClassifier: createClassifier
}
