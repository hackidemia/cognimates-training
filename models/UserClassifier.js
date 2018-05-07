const mongoose = require('mongoose')

let Schema = mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    classifier_id: String,
    url: String,
    name: String,
    created: Date
})

module.exports = mongoose.model('UserClassifier', Schema)
