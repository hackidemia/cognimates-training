const axios = require('axios');
const base_url = "https://api.uclassify.com/v1/";
const async = require('async');

// Validate required environment variables
if (!process.env.UCLASSIFY_READ_API_KEY || !process.env.UCLASSIFY_WRITE_API_KEY) {
  console.error('UCLASSIFY_READ_API_KEY and UCLASSIFY_WRITE_API_KEY environment variables are required');
  process.exit(1);
}

const readToken = process.env.UCLASSIFY_READ_API_KEY;
const writeToken = process.env.UCLASSIFY_WRITE_API_KEY;

function health(req, res){
  res.json({message: 'healthy'});
  return;
}

function getClassifierInformation(req, res) {
    var classifier_id = req.body.classifier_id;
    let username = req.body.username;
    get_classifier_url = base_url + username + "/" + classifier_id;
    token_text = "Token " + readToken;
    axios.get(get_classifier_url, {
        headers: {'Content-Type': 'application/json', 'Authorization': token_text}
    })
    .then(response => {
        res.json(response.data);
    })
    .catch(err => {
        res.json({error: err.message});
    });
}

/**
 * This allows for adding examples + more training for a classifier.
 * This will be called after a classifier has already been created.
 */
function addExamples(req, res) {
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let training_data = req.body.texts;
  var create_url = base_url + "me/" + classifier_name + "/" + class_name + "/train";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {texts: training_data}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response.status);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

function createClass(req, res) {
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  var create_url = base_url + "me/" + classifier_name + "/addClass";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {className: class_name}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

/**
 * User first creates a classifier by choosing a name, create an empty classifier
 * so that we can use the above function
 * addExamples for both initializing + adding examples later.
 */
function createClassifier(req, res) {
  let classifier_name = req.body.classifier_name;
  console.log(classifier_name)
  var create_url = base_url + "me/";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {classifierName: classifier_name}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

function delClassifier(req, res) {
  let classifier_id = req.body.classifier_id;
  var del_url = base_url + "me/" + classifier_id;
  let token_text = 'Token ' + writeToken;
  axios.delete(del_url, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

function classify(req, res) {
  var classifier_id = req.body.classifier_id;
  var phrase = req.body.phrase;
  var classify_username = req.body.classify_username;
  if (classify_username == null) {
    classify_username = ""
  }

  let classifyURL = base_url+classify_username+'/'+classifier_id+'/classify';
  let token_text = 'Token ' + readToken;

  axios.post(classifyURL, {texts: [phrase]}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    res.json(response.data[0].classification);
  })
  .catch(err => {
    var error = errorHandler(err, response);
    res.json({error: error});
  });
}

function errorHandler(err, httpResponse){
  if(httpResponse.status === 413 || httpResponse.status === 200){
    return 'Request entity too large';
  } if(httpResponse.status === 530){
    return 'uClassify Service Unavailable';
  } if(httpResponse.status === 400){
    return 'Bad Request. Check your text again.';
  } if(httpResponse.status === 500){
    return 'uClassify has an internal server error.';
  } else {
   return 'Could not classify the text. uClassify service may be unavailable.';
  }
}

function removeClass(req, res){
  let classifier_id = req.body.classifier_name;
  let class_name = req.body.class_name;
  var del_url = base_url + "me/" + classifier_id + "/" + class_name;
  let token_text = 'Token ' + writeToken;
  axios.delete(del_url, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

function untrain(req, res){
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let training_data = req.body.training_data;
  var untrain_url = base_url + "me/" + classifier_name + "/" + class_name + "/untrain";
  let token_text = 'Token ' + writeToken;
  axios.post(untrain_url, {texts: training_data}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
}

function trainAll(req, res) {
  var classifierName = req.body.classifier_name;
  var training_data = req.body.training_data;
  var functionsToExecute = [];
  functionsToExecute.push(getCreateClassifierFunction(writeToken, classifierName));
  Object.keys(training_data).forEach((key) => {
    functionsToExecute.push(getTrainLabelFunction(writeToken, classifierName, key, training_data[key]));
  });

  async.series(functionsToExecute, (err, results) => {
    if (err) {
      var errorMessages = [];
      results.forEach((result) => {
        if (result != null) {
          errorMessages.push(result.message);
        }
      });
      res.json({ error: err.message, errorDetails: errorMessages });
      return;
    }
    if(results[0] == 400){
      res.json({error: 'Unable to train. Check your inputs or internet and try again.'});
      return;
    } else {
      res.json("Trained successfully");
    }
  });
}

function getCreateClassifierFunction(writeAPIKey, classifierName) {
  return function (callback) {
    var create_url = base_url + "me/";
    let token_text = 'Token ' + writeAPIKey;
    axios.post(create_url, {classifierName: classifierName}, {
      headers: {'Content-Type': 'application/json', 'Authorization': token_text}
    })
    .then(response => {
      callback(null, response.status);
    })
    .catch(err => {
      callback(err, err.response.status);
    });
  };
}

function getTrainLabelFunction(writeAPIKey, classifierName, label, labelData) {
  return function (callback) {
    let class_name = label;
    var create_url = base_url + "me/" + classifierName + "/addClass";
    let token_text = 'Token ' + writeAPIKey;
    let training_data = labelData;

    //first create the class
    axios.post(create_url, {className: class_name}, {
      headers: {'Content-Type': 'application/json', 'Authorization': token_text}
    })
    .then(response => {
      callback(null, response.status);
    })
    .catch(err => {
      callback(err, err.response.status);
    });

    train_url = base_url + "me/" + classifierName + "/" + class_name + "/train";
    //train the label by adding examples
    axios.post(train_url, {texts: training_data}, {
      headers: {'Content-Type': 'application/json', 'Authorization': token_text}
    })
    .then(response => {
      callback(null, response.status);
    })
    .catch(err => {
      callback(err, err.response.status);
    });
  }
}

module.exports = {
  getClassifierInformation: getClassifierInformation,
  classifyText: classify,
  deleteClassifier: delClassifier,
  createClassifier: createClassifier,
  addExamples: addExamples,
  createClass: createClass,
  removeClass: removeClass,
  untrain: untrain,
  trainAll: trainAll,
  health: health
}
