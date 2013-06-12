var fs = require('fs')
  , walk = require('walk')
  , _ = require('underscore')
  ;

var GRUNTFILE = 'Gruntfile.js';
var FRAMEWORKS = ['qunit', 'jasmine', 'mocha'];

// naive implementation for js unit test cases discovery
var findTestCases = function(cb) {
  var grepFrameworks = function(file, cb) {
    var success = false;
    fs.readFile(file, function(err, data) {
      var contents = data.toString().toLowerCase();
      _.forEach(FRAMEWORKS, function(v, i) {
        if (contents.indexOf(v) > -1) {
          success = true;
        }
      });

      cb(success);
    });
  };

  var tests = [];
  walker = walk.walk('.');
  walker.on('names', function(baseDir, namesArr) {
    if (baseDir.indexOf('node_modules') > -1) {
      return;
    } 

    _.forEach(namesArr, function(v, i) {
      var lcName = v.toLowerCase();
      if (lcName.indexOf('.htm') > -1) {
        var file = baseDir + '/' + v;
        grepFrameworks(file, function(success) {
          if (success) {
            tests.push(file);
          }
        });
      }
    });
  });
  walker.on('end', function() {
    cb(null, tests);
  });
};

module.exports = function(cb) {
  fs.exists(GRUNTFILE, function(exists) {
    if (!exists) {
      fs.createReadStream('templates/' + GRUNTFILE).pipe(fs.createWriteStream(GRUNTFILE));
    }

    findTestCases(function(err, tests) {
      console.log(tests);
      cb(null);
    });
  });
};
