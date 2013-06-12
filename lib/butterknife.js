var travis = require('./travis')
  , async = require('async')
  , grunt = require('./grunt')
  ;

module.exports = function(options) {
  async.series([
    function(cb) {
      // check for proper travis setup in the repo
      travis(function(err) {
        if (err) {
          return cb(err, false);
        }

        cb(null, true);
      });
    },
    function(cb) {
      // check if grunt's ready to go
      grunt(function(err) {
        if (err) {
          return cb(err, false);
        }

        cb(null, true);
      });
    }
  ], function(err, res) {
    if (err) {
      console.log(err);
    } else {
      console.log('Succesfully spread sauce using butterknife.');
    }
  });
};
