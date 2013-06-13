var fs = require('fs')
  , walk = require('walk')
  , _ = require('underscore')
  , esprima = require('esprima')
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
      // should also cover cases of .html
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


var mutate = function(tree) {
  // Courtesy of http://sevinf.github.io/blog/2012/09/29/esprima-tutorial/
  var traverse = function (node, func) {
    func(node);//1
    for (var key in node) { //2
      if (node.hasOwnProperty(key)) { //3
        var child = node[key];
        if (typeof child === 'object' && child !== null) { //4

          if (Array.isArray(child)) {
            child.forEach(function(node) { //5
              traverse(node, func);
            });
          } else {
            traverse(child, func); //6
          }
        }
      }
    }
  };

  // find grunt.initConfig
  var checkGrunt = function(tree, cb) {
    var available = []
      , gruntcfg = null
      ;

    traverse(tree, function(node) {
      if (node.type === 'CallExpression'
        && node.callee
        && node.callee.object
        && node.callee.object.name === 'grunt'
        && node.callee.property
        && node.callee.property.name === 'initConfig') {
        gruntcfg = node;
        traverse(node, function(sub) {
          if (sub.type === 'Literal' || sub.type === 'Identifier') {
            var val = sub.name || sub.value;
            console.log("sub: " + val);
            if (val.toString().indexOf('saucelabs-') > -1
              || val === 'connect') {
              available.push(val);
            }
          }
        });
      }
    });

    cb(gruntcfg, available.length >= 2);
  };

  checkGrunt(tree, function(gruntCfg, ready) {
    // Mutate grunt.js cfg here
  });
};

module.exports = function(cb) {
  fs.exists(GRUNTFILE, function(exists) {
    if (!exists) {
      fs.createReadStream('templates/' + GRUNTFILE).pipe(fs.createWriteStream(GRUNTFILE));
    }

    findTestCases(function(err, tests) {
      var gf = fs.readFileSync(GRUNTFILE);
      var ast = esprima.parse(gf);
      mutate(ast);

      cb(null);
    });
  });
};
