var yaml = require('js-yaml')
  , fs = require('fs');

var TRAVISYML = '.travis.yml';

module.exports = function(cb) {
  var loadYml = function(done) {
    fs.exists(TRAVISYML, function(exists) {
      if (!exists) {
        var out = yaml.dump({
          'language': 'node_js'
          , 'node_js': '0.10'
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
      done(null, travisJson);
    });
  };

  loadYml(function(err, yml) {
    if (yml.language !== 'node_js') {
      return cb('Unsupported target language. Please consider switching to node_js.');
    }
    cb(null, true)
  });
};
