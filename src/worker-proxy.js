const TestWorker = require('jest-runner/build/test_worker');
module.exports = {
  worker: function(options, cb) {
    return TestWorker.worker(options)
    .then(result => cb(null, result))
    .catch(err => cb(err));
  }
};
