/* Whirlpool / make.js
 * echo 'make script for Whirlpool' && node make
 * (c) 2013 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var bitfactory = require('bitfactory'),
    UglifyJS = require("uglify-js"),
    stoptime = require('stoptime'),
    bor = require('bor'),
    fs = require('fs');

var watch = stoptime(),
    header = '',
    build = '';

bitfactory.make({ //routes
    "": function(err, results) {
        console.log('built Whirlpool in ' + watch.elapsed() + 'ms.');
    }
}, { //dependencies
    "*": { //wildcard
        "header": function(cb) {
            fs.readFile('whirlpool.h', 'utf8', function(err, data) {
                header = data;
                cb(err);
            });
        },
        "whirlpool.src.js": function(cb) {
            bor.robot("whirlpool.src.js", function(data) {
                build = data;
                cb();
                fs.writeFileSync('whirlpool.js', build);
            });
        },
        "whirlpool.min.js": ["header", "whirlpool.src.js", function(cb) {
            fs.writeFileSync('whirlpool.min.js', header + UglifyJS.minify(build, {fromString: true}).code);
            cb();
        }]
    }
});