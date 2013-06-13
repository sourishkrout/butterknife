var travis = require('./travis')
  , async = require('async')
  , grunt = require('./grunt')
  ;

module.exports = function(options) {
  async.series([
    function(cb) {
      // get travis set up properly
      travis(cb);
    },
    function(cb) {
      // get grunt.js ready for prime time
      grunt(cb);
    }
  ], function(err, res) {
    if (err) {
      console.log(err);
    } else {
      console.log('Succesfully spread the sauce using butterknife.');
    }
  });
};
