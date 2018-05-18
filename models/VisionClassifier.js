const mongoose = require('mongoose')

let Schema = mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    classifier_id: String,
    name: String,
    created: Date,
    updated: Date
})

module.exports = mongoose.model('VisionClassifier', Schema)
