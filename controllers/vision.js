const User = require('../models/User');
const auth = require('../controllers/auth');
const VisionClassifier = require('../models/VisionClassifier');
const config = require('../config');
const path = require('path');
const fs = require('fs');
const paths = require('../paths')
const mkdirp = require('mkdirp')
const utils = require('../utils')
let archiver = require('archiver');
let VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

const watson = new VisualRecognitionV3({
    api_key: config.VISION_API,
    version: '2018-03-19'
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
      VisionClassifier.find({ "user": user._id }, (err, classifiers) => {
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
          VisionClassifier.remove({ classifier_id: { $in: deletedClassifiers }}, (err, res) => {
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
        VisionClassifier.findOne({ user: userId, classifier_id : classifier_id}, (err, classifier) => {
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
    var labels = [];

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
        validateData()
      }
    })

    function validateData() {
      var errorFound = false
      var errorMessage = ''
      preparedData = {}
      for(var idx in data) {
        var label = data[idx].label
        preparedData[label] = data[idx].label_items
        if(preparedData[label].length < 10) {
          errorMessage = 'Label must have a minimum of 10 examples'
          errorFound = true
          break;
        }
        for(var subidx = 0; subidx < preparedData[label].length; subidx++) {
          let imageType = utils.getImageType(preparedData[label][subidx].substring(0, 20))
          if(imageType == null) {
            errorFound = true
            errorMessage = 'Unsupported image type'
            break;
          }
        }
        if(errorFound == true) {
          break;
        }
        labels.push(label)
      }
      data = preparedData
      preparedData = undefined
      if(errorFound == true) {
        res.json({ error: errorMessage})
        return
      }
      saveImages()
    }

    var directory = `${paths.IMAGES_PATH}/${parseInt(utils.random(1000, 99999))}`

    function saveImages() {
      mkdirp.sync(directory)
      labels.forEach((label) => {
        console.log(label)
        data[label].forEach((imageData) => {
          let imageType = utils.getImageType(imageData.substring(0, 20))
          let base64Data = null
          if(imageType == 'jpeg') {
            base64Data = imageData.replace(/^data:image\/jpeg;base64,/,"")
          } else if (imageType == 'png'){
            base64Data = imageData.replace(/^data:image\/png;base64,/,"")
          } else {
            base64Data = imageData.replace(/^data:image\/jpg;base64,/,"")
          }
          let binaryData = new Buffer(base64Data, 'base64').toString('binary');
          if(imageType == 'jpeg') {
            imageType = 'jpg'
          }
          let fileName = `${label}_${parseInt(utils.random(10000, 99999))}.${imageType}`
          let filePath = path.join(directory, fileName)
          fs.writeFileSync(filePath, binaryData, "binary");
        })
      })
      onFilesWritten()
    }

    let zipFiles = undefined

    function onFilesWritten() {
      zipFiles = {}
      var promises = []
      labels.forEach((label) => {
        var promise = new Promise(function (resolve, reject) {
          var filePath = path.join(directory, `${label}.zip`)
          var output = fs.createWriteStream(filePath);
          var archive = archiver('zip', {
            zlib: { level: 1} // Sets the compression level.
          });

          // listen for all archive data to be written
          // 'close' event is fired only when a file descriptor is involved
          output.on('close', function() {
            zipFiles[label] = filePath
            resolve(filePath)
          });

          // This event is fired when the data source is drained no matter what was the data source.
          // It is not part of this library but rather from the NodeJS Stream API.
          // @see: https://nodejs.org/api/stream.html#stream_event_end
          output.on('end', function() {
            console.log(`Zipped files for label ${label}`);
            zipFiles[label] = filePath
            resolve(filePath)
          });

          // good practice to catch warnings (ie stat failures and other non-blocking errors)
          archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
              console.log(err);
            } else {
              reject(err)
            }
          });

          // good practice to catch this error explicitly
          archive.on('error', function(err) {
            reject(err)
          });

          // pipe archive data to the file
          archive.pipe(output);
          var basename = path.parse(filePath).base;
          archive.glob(`${label}_*`, { basename: name, cwd: directory })
          archive.finalize()
        })
        promises.push(promise)
      })
      Promise.all(promises).then(function (result) {
        console.log(result);
        onFilesZipped()
      }).catch(function (err) {
        console.log(err.message);
        res.json({ error: err.message })
        return
      });
    }


    function onFilesZipped() {
      var params = {
        'name': name
      }
      labels.forEach((label) => {
        params[`${label}_positive_examples`] = fs.createReadStream(zipFiles[label])
      })

      watson.createClassifier(params, onCreateClassifier)
    }

    function onCreateClassifier(err, response) {
      fs.unlink(directory)
      if(err) {
        res.json({ error: err.message })
        return
      }
      saveClassifier(response)
    }

    function saveClassifier(classifier_data) {
      var classifier = new VisionClassifier({
        user: userId,
        classifier_id: classifier_data.classifier_id,
        created: classifier_data.created,
        updated: classifier_data.updated,
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
      VisionClassifier.findOne({ user: userId, classifier_id : classifier_id}, (err, classifier) => {
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

    /**
     * Watson Visual Recognition method of deleting a classifier is the same, only requires
     * classifier_id.
     */
    function delClassifier(classifier_id) {
      watson.deleteClassifier({ classifier_id: classifier_id }, (err, response) => {
        if (err) {
          res.json({ error: err.message })
          return
        }

        deleteUserClassifier(classifier_id)
      })
    }

    function deleteUserClassifier(classifier_id) {
      VisionClassifier.remove({ classifier_id: classifier_id }, (err, doc) => {
        if(err) {
          res.json({ error: err.message })
          return
        }

        res.json(doc)
        return
      })
    }
  }

  /**
   * Modify this for Watson Visual Recognition. Instead of phrase, takes in a single image.
   * No threshold put in, so it is set to defaul of 0.5,
   */
  function classify(req, res) {
    let token = req.headers.token
    var classifier_id = req.query.classifier_id
    var image = req.query.image_file
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
        getClassification(classifier_id, phrase)
      }
    })

    function getClassification(classifier_id, phrase) {
      watson.classify({ classifier_id: classifier_id, images_file: images}, (err, response) => {
        if(err) {
          res.json({ error: err.message })
          return
        }

        res.json(response)
        return
      })
    }
  }

module.exports = {
    getClassifiersList: getClassifiersList,
    getClassifierInformation: getClassifierInformation,
    classifyImages: classify,
    deleteClassifier: deleteClassifier,
    createClassifier: createClassifier
  }
