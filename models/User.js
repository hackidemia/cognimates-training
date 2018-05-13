const mongoose = require('mongoose')

let UserSchema = mongoose.Schema({
  name: String,
  username: { type: String, unique: true},
  password: String  
})

module.exports = mongoose.model('User', UserSchema)
