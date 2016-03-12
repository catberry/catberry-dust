# Catberry Dust  

[![Build Status](https://secure.travis-ci.org/catberry/catberry-dust.svg)](http://travis-ci.org/catberry/catberry-dust) [![codecov.io](http://codecov.io/github/catberry/catberry-dust/coverage.svg?branch=master)](http://codecov.io/github/catberry/catberry-dust?branch=master)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/catberry/main?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)

It is Catberry fork of Linkedin fork of Dust template engine.

## Getting Started
A quick tutorial for how to use Dust [here](docs/tutorial.md).

## Difference from LinkedIn fork
* All codebase is re-writtern in ES2015/ES6 and optimized for
[Catberry Framework](https://github.com/catberry/catberry) and [browserify](http://browserify.org/)
* All components organized via [node modules](http://nodejs.org/api/modules.html#modules_modules)
* Dust is a constructor now. You should create an instance to use it.
No global variables anymore.
* It has TemplateProvider and Service Locator registration for [Catberry Framework](https://github.com/catberry/catberry)
* There are no ECMAScript 5 shims like indexOf and JSON
* There is no stream and compiler in a browser version
* Server-side stream is based on node.js [Readable](http://nodejs.org/api/stream.html#stream_class_stream_readable)
* Helpers are built-in
* Removed `tap` helper, use `context.tap` inside helpers instead
* You can add helpers via `dust.helperManager.add('helperName', helper)`
* You can add filters via `dust.filterManager.add('filterName', filter)`
* You can register and compile templates via
`dust.templateManager.compile(source)` and
`dust.templateManager.registerCompiled(name, compiled)`
* By default `h` filter is applied to value, if you specify any filter(s)
it will not apply `h` filter after your filters
* Improved logging, removed many redundant messages and all log messages go to Catberry's event bus if it is registered into Catberry.
* Compiled templates do not use global variable `dust`
* Removed redundant pragmas such as `{%esc:s}` from Dust grammar
* Method `dust.render` returns a `Promise`

## Usage
To use Dust you should register the template engine into the Catberry locator as following.

```javascript
const dust = require('catberry-dust');
const cat = catberry.create(config);
dust.register(cat.locator);
```

In fact, [Catberry CLI](https://github.com/catberry/catberry-cli) does it for you.

If you want to use it as a standalone package you need to do following:

Create Dust instance at server and in browser like this:

```javascript
const Dust = require('catberry-dust').Dust;
const dust = new Dust();
```

Compile, register and render at server:

```javascript
const compiled = dust.templateManager.compile('{#some}Source{/some}');
dust.templateManager.registerCompiled('someTemplateName', compiled);

const stream = dust.getStream('someTemplateName', {some: true});
stream.pipe(process.stdout);

dust.render('someTemplateName', {some: true})
	.then(content => console.log(content));
```

Register and render in browser (template should be compiled already):

```javascript
dust.templateManager.registerCompiled('someTemplateName', compiled);

dust.render('someTemplateName', {some: true})
	.then(content => console.log(content));
```

Also, you need [browserify](http://browserify.org/) to use it in browser.

## Contributing

There are a lot of ways to contribute:

* Give it a star
* Join the [Gitter](https://gitter.im/catberry/main) room and leave a feedback or help with answering users' questions
* [Submit a bug or a feature request](https://github.com/catberry/catberry-dust/issues)
* [Submit a PR](https://github.com/catberry/catberry-dust/blob/develop/CONTRIBUTING.md)

Denis Rechkunov <denis.rechkunov@gmail.com>
