'use strict';

global.Promise = require('promise');
var coreTests = require('./coreTests'),
	helperTests = require('./helperTests'),
	assert = require('assert'),
	Dust = require('../../lib/Dust'),
	Stack = require('../../lib/Stack'),
	Context = require('../../lib/Context');

describe('Test the basic functionality of dust', function () {
	generateTestsForSuite(coreTests);
	generateTestsForSuite(helperTests);
});

function generateTestsForSuite(suite) {
	for (var index = 0; index < suite.length; index++) {
		for (var i = 0; i < suite[index].tests.length; i++) {
			var test = suite[index].tests[i];
			it('RENDER: ' + test.message, render(test));
			it('STREAM: ' + test.message, stream(test));
		}
	}
}

function render(test) {
	return function (done) {
		Promise.resolve()
			.then(function () {
				var dust = new Dust(),
					compiled = dust.templateManager.compile(test.source),
					context;

				dust.templateManager.registerCompiled(test.name, compiled);
				context = test.context;
				if (test.base) {
					var renderingContext = new Context(
						new Stack(), test.base, null, null, dust
					);
					context = renderingContext.push(context);
				}
				return dust.render(test.name, context);
			})
			.then(function (output) {
				if (test.error) {
					assert.fail(null, test.error);
				}
				assert.strictEqual(output, test.expected);
			})
			.then(function (reason) {
				if (test.error) {
					assert.strictEqual(reason.message, test.error);
					done();
				} else {
					done(reason);
				}
			}, function () {
				done();
			});
	};
}

function stream(test) {
	return function (done) {
		new Promise(function (fulfill, reject) {
			var dust = new Dust(),
				compiled = dust.templateManager.compile(test.source),
				context;

			dust.templateManager.registerCompiled(test.name, compiled);
			context = test.context;
			if (test.base) {
				var renderingContext = new Context(
					new Stack(), test.base, null, null, dust
				);
				context = renderingContext.push(context);
			}

			var output = '';
			dust.getStream(test.name, context)
				.on('data', function (data) {
					output += data;
				})
				.on('end', function () {
					fulfill(output);
				})
				.on('error', function (error) {
					reject(error);
				});
		})
			.then(function (output) {
				if (test.error) {
					assert.fail(null, test.error);
				}
				assert.strictEqual(output, test.expected);
			})
			.then(function (reason) {
				if (test.error) {
					assert.strictEqual(reason.message, test.error);
					done();
				} else {
					done(reason);
				}
			}, function () {
				done();
			});
	};
}