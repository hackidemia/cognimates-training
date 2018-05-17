/**
 * Parse a base 64 image and return the extension and buffer
 * @param  {String} imageString The image data as base65 string
 * @return {Object}             { type: String, data: Buffer }
 */
function parseBase64Image(imageString) {
  var matches = imageString.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
  var resource = {};

  if (matches.length !== 3) {
    return null;
  }

  resource.type = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  resource.data = new Buffer(matches[2], 'base64');
  return resource;
}


function random (low, high) {
    return Math.random() * (high - low) + low;
}

function getImageType(data) {
  if(data.indexOf("jpg") !== -1) return 'jpg'
  else if (data.indexOf("jpeg") !== -1) return 'jpeg'
  else if(data.indexOf("png") !== -1) return 'png'
  return null
}

module.exports = {
  parseBase64Image,
  random,
  getImageType
}
