<div align="center">
  <a href="https://facebook.github.io/jest/">
    <img width="150" height="150" vspace="" hspace="25" src="https://cdn.worldvectorlogo.com/logos/jest.svg">
  </a>
  <h1>jest-runner-concurrent</h1>
  <p>A concurrent, drop-in replacement for Jest's default test runner</p>
  <p><a href="https://badge.fury.io/js/jest-runner-concurrent"><img src="https://badge.fury.io/js/jest-runner-concurrent.svg" alt="npm version" height="18"></a></p>
</div>

## What

Jest's default runner uses a new `child_process` (also known as a worker) for each test file. Although the max number of workers is configurable, running a lot of them is slow and consumes tons of memory and CPU. `jest-runner-concurrent` runs your tests concurrently instead of in parallel, so you can run hundreds of tests quickly with only a few workers.

## Caveats

To take advantage of the performance gains, your tests:

1. Must be asynchronous
0. Share no state with another test

## Install

```bash
npm install --save-dev jest-runner-concurrent
```

## Enable

There are a couple ways to enable the runner

### package.json

```json
{
  "jest": {
    "runner": "jest-runner-concurrent"
  }
}
```

### jest.config.js

```js
// <project_root>/jest.config.js

module.exports = {
  runner: 'jest-runner-concurrent'
}
```

## Configure

There are also a few ways to configure the runner

Defaults:

* **maxConcurrentTests** - No max. `0` is the same as no max

### package.json

```json
{
  "jest-runner-concurrent": {
    "maxConcurrentTests": 100
  }
}
```

### jest-runner-concurrent.config.js

```js
module.exports = {
  maxConcurrentTests: 100
};
```

## License

MIT
