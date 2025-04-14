const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // You can render a view if you have one set up, 
  // or just send a simple message.
  // res.render('index', { title: 'Cognimates Training API' }); 
  res.status(200).send('Welcome to the Cognimates Training API!');
});

module.exports = router;
