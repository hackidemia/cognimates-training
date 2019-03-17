const request = require('request');
const base_url = "https://api.uclassify.com/v1/";

function getClassifierInformation(req, res) {
    let read_token = req.body.read_token
    var classifier_id = req.body.classifier_id
    let username = req.body.username;
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
          res.json(JSON.parse(httpResponse.body));
          return;
        }
    });
}

/**
 * This allows for adding examples + more training for a classifier.
 * This will be called after a classifier has already been created.
 */
function addExamples(req, res) {
  let write_token = req.body.write_token;
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let training_data = req.body.texts;
  var create_url = base_url + "me/" + classifier_name + "/" + class_name + "/text_train";
  let token_text = 'Token ' + write_token;
  request.post({
    url:create_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text},
    body: {texts: training_data}, json: true},
    function(err, httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        console.log(httpResponse);
        res.json();
        return;
      }
  });
}

function createClass(req, res) {
  let write_token = req.body.write_token;
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  var create_url = base_url + "me/" + classifier_name + "/addClass";
  let token_text = 'Token ' + write_token;
  request.post({
    url:create_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text},
    body: {className: class_name}, json: true},
    function(err, httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        console.log(httpResponse);
        res.json();
        return;
      }
  });
}

/**
 * User first creates a classifier by choosing a name, create an empty classifier
 * so that we can use the above function
 * addExamples for both initializing + adding examples later.
 */
function createClassifier(req, res) {
  let write_token = req.body.write_token;
  let classifier_name = req.body.classifier_name;
  console.log(classifier_name)
  var create_url = base_url + "me/";
  let token_text = 'Token ' + write_token;
  request.post({
    url:create_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text},
    body: {classifierName: classifier_name}, json: true},
    function(err, httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        console.log(httpResponse);
        res.json();
        return;
      }
  });
}

function delClassifier(req, res) {
  let classifier_id = req.body.classifier_id;
  let write_token = req.body.write_token;
  var del_url = base_url + "me/" + classifier_id;
  let token_text = 'Token ' + write_token;
  request.delete({
    url:del_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}},
    function(err,httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        // console.log(httpResponse);
        res.json();
        return;
      }
    });
}

function classify(req, res) {
  let token = req.body.token;
  var classifier_id = req.body.classifier_id;
  var phrase = req.body.phrase;
  var classify_username = req.body.classify_username;
  if (classify_username == null) {
    classify_username = ""
  }

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
        res.json({ error: 'Could not classify the text' });
        console.log(httpResponse);
       }
    });
  }

function removeClass(req, res){
  let classifier_id = req.body.classifier_name;
  let class_name = req.body.class_name;
  let write_token = req.body.write_token;
  var del_url = base_url + "me/" + classifier_id + "/" + class_name;
  let token_text = 'Token ' + write_token;
  request.delete({
    url: del_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}},
    function(err,httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        res.json();
        return;
      }
    });
}

function untrain(req, res){
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let write_token = req.body.write_token;
  let training_data = req.body.training_data;
  var untrain_url = base_url + "me/" + classifier_name + "/" + class_name + "/untrain";
  let token_text = 'Token ' + write_token;
  request.post({
    url: untrain_url,
    headers: {'Content-Type': 'application/json', 'Authorization': token_text},
    body: {texts: training_data}, json: true},
    function(err, httpResponse){
      if(err){
        res.json({error: err.message});
        return;
      } else {
        console.log(httpResponse);
        res.json();
        return;
      }
  });
}


module.exports = {
  getClassifierInformation: getClassifierInformation,
  classifyText: classify,
  deleteClassifier: delClassifier,
  createClassifier: createClassifier,
  addExamples: addExamples,
  createClass: createClass,
  removeClass: removeClass,
  untrain: untrain
}
