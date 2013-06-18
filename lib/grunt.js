var fs = require('fs')
  , walk = require('walk')
  , _ = require('underscore')
  , esprima = require('esprima')
  , escodegen = require('escodegen')
  , async = require('async')
  , npm = require('npm')
  ;

var GRUNTFILE = 'Gruntfile.js';
var FRAMEWORKS = ['qunit', 'jasmine', 'mocha'];

// naive implementation for js unit test cases discovery
var findTestCases = function(cb) {
  var grepFrameworks = function(file, cb) {
    var success = false
      , framework = null;
    fs.readFile(file, function(err, data) {
      var contents = data.toString().toLowerCase();
      _.forEach(FRAMEWORKS, function(v, i) {
        if (contents.indexOf(v) > -1) {
          success = true;
          framework = v;
        }
      });

      cb(success, framework);
    });
  };

  var tests = []
    , framework = null;
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
        grepFrameworks(file, function(success, fmk) {
          if (success) {
            tests.push(file);
            framework = fmk;
          }
        });
      }
    });
  });
  walker.on('end', function() {
    cb(null, tests, framework);
  });
};


var setupGrunt = function(tree, tests, framework, done) {
  // Courtesy of http://sevinf.github.io/blog/2012/09/29/esprima-tutorial/
  var traverse = function (node, func) {
    func(node);//1
    for (var key in node) { //2
      if (node.hasOwnProperty(key)) { //3
        var child = node[key];
        var pnt = node;
        if (typeof child === 'object' && child !== null && key !== 'parent') { //4

          if (Array.isArray(child)) {
            child.forEach(function(node) { //5
              node.parent = pnt;
              traverse(node, func);
            });
          } else {
            child.parent = pnt;
            traverse(child, func); //6
          }
        }
      }
    }
  };

  // find grunt.initConfig
  var setupGruntSaucelabs = function(tree, cb) {
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
            if (val.toString().indexOf('saucelabs-') > -1
              || val === 'connect') {
              available.push(val);
            }
          }
        });
      }
    });

    cb(gruntcfg, available);
  };

  var setupGruntDeps = function(tree, cb) {
    var done = false;
    traverse(tree, function(node) {
      if (node.type === 'CallExpression'
        && node.callee
        && node.callee.object
        && node.callee.object.name === 'grunt'
        && node.callee.property
        && node.callee.property.name === 'loadNpmTasks') {
        var loop = 0
          , insert = -1;
        var gruntDeps = require('../templates/ast/deps.json');
        gruntDeps.task = require('../templates/ast/task.json');
        gruntDeps.browsers = require('../templates/ast/browsers.json');
        if (!done) {
          // fun, fun, fun...
          _.forEach(node.parent.parent.body, function(v, i) {
            loop++;
            if (v.type === 'ExpressionStatement'
              && v.expression.type === 'CallExpression'
              && v.expression.callee
              && v.expression.callee.property.name === 'loadNpmTasks') {
              insert = loop;
            }

            if (v.type === "ExpressionStatement"
              && v.expression.arguments
              && v.expression.arguments.length > 0
              && v.expression.arguments[0].value === 'default') {
              v.expression.arguments[1].elements.push({
                "type": "Literal",
                "value": "sauce"
              });
            }
          });

          var num = 0;
          if (insert > -1) {
            _.forEach(gruntDeps.deps, function(v, i) {
              num++;
              node.parent.parent.body.splice(insert, 0, v);
            });
          }

          node.parent.parent.body.splice(insert+num, 0, gruntDeps.task);
          node.parent.parent.body.splice(1, 0, gruntDeps.browsers);
          done = true;
          cb(null);
        }
      }
    });
  };

  setupGruntSaucelabs(tree, function(gruntCfg, cfgs) {
    if (cfgs < 2) {
      var gslAst = require('../templates/ast/saucelabs.json');
      gslAst.key.value = gslAst.key.value + framework;

      _.forEach(tests, function(v, i) {
        // Weeeeeeeeeee
        gslAst.value.properties[0].value.properties[0].value.properties[0].value.elements.push({
          type: 'Literal',
          value: v.replace("./", "http://localhost:9999/")
        });
      });

      var conAst = require('../templates/ast/connect.json')

      gruntCfg.arguments[0].properties.push(gslAst);
      gruntCfg.arguments[0].properties.push(conAst);
      
      setupGruntDeps(tree, function(err) {
        done(null, src);

        var src = escodegen.generate(tree);
        fs.writeFileSync(GRUNTFILE, src);
      });
    }
  });
};

module.exports = function(cb) {
  fs.exists(GRUNTFILE, function(exists) {
    if (!exists) {
      fs.createReadStream('templates/' + GRUNTFILE).pipe(fs.createWriteStream(GRUNTFILE));
    }

    findTestCases(function(err, tests, framework) {
      var gf = fs.readFileSync(GRUNTFILE);
      var ast = esprima.parse(gf, { comment: true });
      setupGrunt(ast, tests, framework, function(err, src) {
        npm.load({ 'save-dev': true }, function() {
          npm.commands.install(['process', 'grunt-contrib-connect', 'grunt-saucelabs'], function(err, obj) {
            cb(null);
          });
        });
      });
    });
  });
};
