var yaml = require('js-yaml')
  , async = require('async')
  , travisenc = require('travis-encrypt')
  , process = require('process')
  , _ = require('underscore')
  , fs = require('fs');

var TRAVISYML = '.travis.yml';

module.exports = function(cb) {
  var loadYml = function(fin) {
    fs.exists(TRAVISYML, function(exists) {
      if (!exists) {
        // Let's move this into a template soon
        var out = yaml.dump({
          'language': 'node_js'
          , 'node_js': '0.10'
          , 'install': [
            'npm install grunt-cli -g'
            , 'npm install'
          ]
          , 'notifications': {
            'email': {
              'on_success': 'never'
            }
          }
        });

        fs.writeFileSync(TRAVISYML, out);
      }

      var travisYml = fs.readFileSync(TRAVISYML, { 'encoding': 'utf-8' });
      var travisJson = yaml.safeLoad(travisYml);
      fin(null, travisJson);
    });
  };

  loadYml(function(err, yml) {
    if (yml.language !== 'node_js') {
      return cb('Unsupported target language. Please consider switching to node_js.');
    }

    if (typeof process.env['SAUCE_USERNAME'] !== 'string'
      || typeof process.env['SAUCE_ACCESS_KEY'] !== 'string') {
      return cb('Please make sure to set up SAUCE_USERNAME and SAUCE_ACCESS_KEY in your environment.');
    } else {
      var username = process.env['SAUCE_USERNAME']
        , accesskey = process.env['SAUCE_ACCESS_KEY']
        // Make this a command line option
        , slug = 'sourishkrout/osb_dummy';

      async.series([
        function(done) {
          travisenc(slug, ['SAUCE_USERNAME', '=', username].join('')).then(function(sures) {
            done(null, sures);
          }, function(err) {
            cb('Travis secure env variables encryption failed. Make sure your repo is hooked up to Travis CI.');
          });
        },
        function(done) {
          travisenc(slug, ['SAUCE_ACCESS_KEY', '=', accesskey].join('')).then(function(sakres) {
            done(null, sakres);
          }, function(err) {
            cb('Travis secure env variables encryption failed.');
          });
        }
      ], function(err, res) {
        if (err) {
          cb(err);
        } else {
          var sec = 0;
          var ymls = '\nenv:\n';
          ymls += '  - [\n';

          _.forEach(res, function(v, i) {
            sec++;
            ymls += '      {secure: "' + v + '"}';
            if (res.length > sec) {
              ymls += ',';
            }
            ymls += '\n';
          });          

          ymls += '    ]\n';

          var out = yaml.dump(yml);
          if (res.length > 0 ) {
            out = out + ymls;
          }
          fs.writeFileSync(TRAVISYML, out);

          cb(null, true)
        }
      });
    }
  });
};
