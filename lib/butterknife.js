var travis = require('./travis')
  , async = require('async')
  , grunt = require('./grunt')
  ;

module.exports = function(options) {
  async.series([
    function(cb) {
      // check for proper travis setup in the repo
      travis(cb);
    },
    function(cb) {
      // check if grunt's ready to go
      grunt(cb);
    }
  ], function(err, res) {
    if (err) {
      console.log(err);
    } else {
      console.log('Succesfully spread sauce using butterknife.');
    }
  });
};
