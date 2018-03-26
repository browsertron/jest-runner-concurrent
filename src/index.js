const JestRunner = require('jest-runner');
const throat = require('throat');
const exit = require('exit');
const workerFarm = require('worker-farm');
const path = require('path');
const cosmiconfig = require('cosmiconfig');

// worker-farm assumes each exported function accepts a
// callback as the last arg. Jest's test_worker returns
// a Promise, so a proxy is necessary. 
// https://github.com/rvagg/node-worker-farm#exportedmethods
const TEST_WORKER_PATH = path.join(__dirname, 'worker-proxy.js');

class CancelRun extends Error {
  constructor(message) {
    super(message);
    this.name = 'CancelRun';
  }
}

class JestRunnerConcurrent extends JestRunner {
  constructor(globalConfig) {
    super(globalConfig);
    this._globalConfig = globalConfig;
    const result = cosmiconfig('jest-runner-concurrent', {
      sync: true,
      rc: false
    }).load();
    this._runnerConfig = Object.assign({
      maxConcurrentTests: Math.ceil(Number.MAX_SAFE_INTEGER/2)
    }, result.config);
  }

  // Overrides _createParallelTestRun from JestRunner
  // https://github.com/facebook/jest/blob/03cce3d/packages/jest-runner/src/index.js#L89-L156
  // Modified from the original:
  //   * works without transpilation in Node 6
  //   * uses worker-farm instead of jest-worker
  _createParallelTestRun(
    tests,
    watcher,
    onStart,
    onResult,
    onFailure
  ) {
    const globalConfig = this._globalConfig;
    const runnerConfig = this._runnerConfig;

    const farm = workerFarm(
      {
        autoStart: true,
        maxConcurrentCallsPerWorker: runnerConfig.maxConcurrentTests,
        maxConcurrentWorkers: globalConfig.maxWorkers,
        maxRetries: 3
      },
      TEST_WORKER_PATH,
      ['worker']
    );

    const mutex = throat(runnerConfig.maxConcurrentTests);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = test =>
      mutex(() => new Promise((resolve, reject) => {
        if (watcher.isInterrupted()) {
          return reject();
        }

        return onStart(test)
        .then(() => {
          return farm.worker({
            config: test.context.config,
            globalConfig,
            path: test.path,
            rawModuleMap: watcher.isWatchMode()
              ? test.context.moduleMap.getRawModuleMap()
              : null,
          }, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
        })
        .catch(reject);
      }));

    const onError = (err, test) =>
      onFailure(test, err)
      .then(() => {
        if (err.type === 'ProcessTerminatedError') {
          console.error(
            'A worker process has quit unexpectedly! ' +
              'Most likely this is an initialization error.',
          );
          exit(1);
        }
      });

    const onInterrupt = new Promise((_, reject) => {
      watcher.on('change', state => {
        if (state.interrupted) {
          reject(new CancelRun());
        }
      });
    });

    const runAllTests = Promise.all(
      tests.map(test =>
        runTestInWorker(test)
          .then(testResult => onResult(test, testResult))
          .catch(error => onError(error, test)),
      ),
    );

    const cleanup = () => workerFarm.end(farm);
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }
}

module.exports = JestRunnerConcurrent;
