'use strict';

const coreTests = require('./coreTests');
const helperTests = require('./helperTests');
const ServiceLocator = require('catberry-locator');
const assert = require('assert');
const events = require('events');
const Dust = require('../../lib/Dust');
const engineClasses = require('../../lib/engineClasses');
const Stack = engineClasses.Stack;
const Context = engineClasses.Context;

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('Test the basic functionality of dust', function() {
	const locator = new ServiceLocator();
	const eventBus = new events.EventEmitter();
	eventBus.on('error', () => {});
	locator.registerInstance('eventBus', eventBus);
	global.Dust = Dust;
	global.dust = new Dust(locator);
	dust.helperManager.add('error', (chunk, context, bodies, params) => {
		throw new Error(params.errorMessage);
	});
	dust.helperManager.add('tapper', (chunk, context, bodies, params) => {
		return chunk.write(context ? context.tap(params.value, chunk) : params.value);
	});

	generateTestsForSuite(coreTests);
	generateTestsForSuite(helperTests);

	function generateTestsForSuite(suite) {
		for (var index = 0; index < suite.length; index++) {
			for (var i = 0; i < suite[index].tests.length; i++) {
				var test = suite[index].tests[i];
				it(`RENDER: ${test.message}`, render(test));
				it(`STREAM: ${test.message}`, stream(test));
			}
		}
	}

	function render(test) {
		return function(done) {
			Promise.resolve()
				.then(function() {
					const compiled = dust.templateManager.compile(test.source);
					let context;

					dust.templateManager.registerCompiled(test.name, compiled);
					context = test.context;
					if (test.base) {
						const renderingContext = new Context(
							new Stack(), test.base, null, null, dust
						);
						context = renderingContext.push(context);
					}
					return dust.render(test.name, context);
				})
				.then(output => {
					if (test.error) {
						assert.fail(null, test.error);
					}
					if (test.expected) {
						assert.strictEqual(output, test.expected);
					}
				})
				.catch(reason => {
					if (test.error) {
						assert.strictEqual(reason.message, test.error);
					} else {
						throw reason;
					}
				})
				.then(done)
				.catch(done);
		};
	}

	function stream(test) {
		return function(done) {
			new Promise((fulfill, reject) => {
				const compiled = dust.templateManager.compile(test.source);
				let context;

				dust.templateManager.registerCompiled(test.name, compiled);
				context = test.context;
				if (test.base) {
					const renderingContext = new Context(
						new Stack(), test.base, null, null, dust
					);
					context = renderingContext.push(context);
				}

				let output = '';
				dust.getStream(test.name, context)
					.on('data', data => {
						output += data;
					})
					.on('end', () => fulfill(output))
					.on('error', error => reject(error));
			})
				.then(output => {
					if (test.error) {
						assert.fail(null, test.error);
					}
					if (test.expected) {
						assert.strictEqual(output, test.expected);
					}
				})
				.catch(reason => {
					if (test.error) {
						assert.strictEqual(reason.message, test.error);
					} else {
						throw reason;
					}
				})
				.then(done)
				.catch(done);
		};
	}
});
