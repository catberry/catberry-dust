#Catberry Dust  [![Build Status](https://secure.travis-ci.org/catberry/catberry-dust.png)](http://travis-ci.org/catberry/catberry-dust)
It is Catberry fork of Linkedin fork of Dust template engine.

##Getting Started
A quick tutorial for how to use Dust <https://github.com/linkedin/dustjs/wiki/Dust-Tutorial>

##Difference from LinkedIn fork
* All code base is optimized for 
[Catberry Framework](https://github.com/catberry/catberry) and [browserify](http://browserify.org/)
* All components organized via [node modules](http://nodejs.org/api/modules.html#modules_modules)
* Dust is a constructor now. You should create an instance to use it. 
No global variables anymore. 
* It has TemplateProvider and Service Locator registration for [Catberry Framework](https://github.com/catberry/catberry)
* There are no ECMAScript 5 shims like indexOf and JSON
* There is no stream and compiler in browser
* Stream is based on node.js [Readable](http://nodejs.org/api/stream.html#stream_class_stream_readable)
* Helpers are built-in
* Removed `tap` helper, use `context.tap` in helpers instead
* You can add helpers via `dust.helperManager.add('helperName', helper)`
* You can add filters via `dust.filterManager.add('filterName', filter)`
* Improved logging, removed many redundant messages
* Compiled templates do not use global variable `dust`
* Removed redundant pragmas such as `{%esc}` from Dust grammar
* Method `dust.render` returns a `Promise`

##Usage
This Dust template engine is already included in
[Catberry Framework](https://github.com/catberry/catberry) and can be used via
framework API.

If you want to use it as a standalone package you need to do following:

Create Dust instance at server and in browser like this:
```javascript
var Dust = require('catberry-dust').Dust,
	logger = {
		warn: function(message){ console.log(message); }
		error: function(error){ console.error(error); }
	},
	dust = new Dust(logger); // logger is optional
```

Compile, register and render at server:
```javascript
var compiled = dust.compile('{#some}Source{/some}');
dust.registerCompiled('someTemplateName', compiled);

var stream = dust.getStream('someTemplateName', {some: true});
stream.pipe(process.stdout);

dust.render('someTemplateName', {some: true})
	.then(function (content){
		console.log(content);
	});
```

Register and render in browser (template should be compiled already):
```javascript
dust.registerCompiled('someTemplateName', compiled);

dust.render('someTemplateName', {some: true})
	.then(function (content){
		console.log(content);
	});
```

Also you need [browserify](http://browserify.org/) your code to use it in browser.

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/2.0.0-dev/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>