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

function getClassifierInformation(req, res) {
    let read_token = req.headers.read_token
    var classifier_id = req.query.classifier_id
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

function addExamples(req, res){
  let write_token = req.write_token;
  let classifier_name = req.classifier_name;
  let data = req.data;
}

function createClassifier(req, res) {
  let token = req.headers.tokenl
  let classifier_name = req.classifier_name;
  var data = req.body.training_data;
  
}

function delClassifier(req, res) {
  let classifier_id = req.classifier_id;
  let username = req.username; 
  let write_token = req.write_token;
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
        return;
      } 
    });
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
  getClassifierInformation: getClassifierInformation,
  classifyText: classify,
  deleteClassifier: delClassifier,
  createClassifier: createClassifier,
  addExamples: addExamples
}
