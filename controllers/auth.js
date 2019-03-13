/*

const User = require('../models/User')
const AuthToken = require('../models/AuthToken')
const Whirlpool = require('whirlpool')

/**
* 1 - Check if all parameters exist
* 2 - Delete token if expired


function register(req, res) {
  var username = req.body.username
  var password = Whirlpool(req.body.password)
  var name = req.body.name

  function onSave(err, user) {
    if(err != null ) {
      res.json({ error: err.message })
      return
    }

    if(user == null) {
      res.json({error: 'User couldn\'t be registered'})
      return
    }

    res.json(user)
    return
  }

  User.findOne({ 'username' : username, 'password' : password }, 'id name username',(err, user) => {

    if(err != null ) {
      res.json({ error: err.message })
      return
    }

    if(user != null) {
      res.json({ error: 'User already exists'})
      return
    }

    const newUser = new User({ 'name': name, 'username': username, 'password' : password })
    newUser.save(onSave)
  })
}

function login(req, res) {
  const username = req.body.username
  const password = Whirlpool(req.body.password)

  User.findOne({ username: username, password: password}, 'id name username', (err, user) => {
    if (err) {
      callback(err, null)
    }
    if(user != null) {
      replaceToken(user)
      return
    } else {
      err = new Error("Invalid username/password")
      res.json({ error: err.message })
      return
    }
  })

  function replaceToken(user) {
    const token = new AuthToken({
      user: user.id,
      token: generateUUID(),
      expiry: new Date().getTime() + 3 * 86000000
    })

    AuthToken.findOneAndRemove({ user: user.id })
    token.save((err, savedToken) => {
      if(err) {
        res.json({ error: err.message })
        return
      }
      res.json(savedToken)
    })
  }
}

function validateToken(authToken, callback) {

  function getUser(userId) {
    User.findOne({ _id: userId}, 'id name username', (err, user) => {
      if (err) {
        callback(err, null)
        return
      }

      if(user != null) {
        callback(null, user)
        return
      }
    })
  }

  AuthToken.findOne({ 'token' : authToken }, (err, doc) => {
    if(err != null || doc == null) {
      callback(err, null)
      return
    }

    if(doc.user != null) {
      if(doc.expiry < new Date().getTime()) {
        callback(new Error("Token expired"), null)
        return
      }
      getUser(doc.user)
      return
    }
  })
}

function generateUUID () { // Public Domain/MIT
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
      d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  })
};

module.exports = {
  register: register,
  login: login,
  validateToken: validateToken
}
*/