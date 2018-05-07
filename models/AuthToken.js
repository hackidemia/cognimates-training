const mongoose = require('mongoose')

let TokenSchema = mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  token: { type: String, unique: true },
  expiry: Number
})

module.exports = mongoose.model('AuthToken', TokenSchema)
