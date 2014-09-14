/* 
 * catberry-dust
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-dust's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry-dust that are not externally
 * maintained libraries.
 */

'use strict';

var util = require('util');

function isSelect(context) {
	var value = context.current();
	return typeof value === 'object' && value.isSelect === true;
}

// Utility method : toString() equivalent for functions
function jsonFilter(key, value) {
	if (typeof value === 'function') {
		//to make sure all environments format functions the same way
		return value.toString()
			//remove all leading and trailing whitespace
			.replace(/(^\s+|\s+$)/mg, '')
			//remove new line characters
			.replace(/\n/mg, '')
			//replace , and 0 or more spaces with ", "
			.replace(/,\s*/mg, ', ')
			//insert space between ){
			.replace(/\)\{/mg, ') {');
	}
	return value;
}

// Utility method: to invoke the given filter operation such as eq/gt etc
function filter(chunk, context, bodies, params, filterOp) {
	params = params || {};
	var body = bodies.block,
		actualKey,
		expectedValue,
		filterOpType = params.filterOpType || '';
	// when @eq, @lt etc are used as standalone helpers,
	// key is required and hence check for defined
	if (typeof params.key !== 'undefined') {
		actualKey = tap(params.key, chunk, context);
	} else if (isSelect(context)) {
		actualKey = context.current().selectKey;
		//  supports only one of the blocks in the select to be selected
		if (context.current().isResolved) {
			filterOp = function () { return false; };
		}
	} else {
		return chunk;
	}
	expectedValue = tap(params.value, chunk, context);
	// coerce both the actualKey and expectedValue to the same type
	// for equality and non-equality compares
	if (filterOp(coerce(expectedValue, params.type, context),
		coerce(actualKey, params.type, context))) {
		if (isSelect(context)) {
			context.current().isResolved = true;
		}
		// we want helpers without bodies to fail gracefully so check it first
		if (body) {
			return chunk.render(body, context);
		} else {
			return chunk;
		}
	} else if (bodies['else']) {
		return chunk.render(bodies['else'], context);
	}
	return chunk;
}

function coerce(value, type, context) {
	if (value) {
		switch (type || typeof(value)) {
			case 'number':
				return Number(value);
			case 'string':
				return String(value);
			case 'boolean':
				value = (value === 'false' ? false : value);
				return Boolean(value);
			case 'date':
				return new Date(value);
			case 'context':
				return context.get(value);
		}
	}

	return value;
}

/**
 * Utility helping to resolve dust references in the given chunk.
 * Uses the Chunk.render method to resolve value.
 *
 * Reference resolution rules:
 * if value exists in JSON:
 * "" or '' will evaluate to false, boolean false, null, or undefined
 * will evaluate to false,
 * numeric 0 evaluates to true, so does, string "0", string "null",
 * string "undefined" and string "false".
 * Also note that empty array -> [] is evaluated to false and
 * empty object -> {} and non-empty object are evaluated to true
 * The type of the return value is string ( since we concatenate
 * to support interpolated references
 *
 * if value does not exist in JSON and the input is a single reference: {x}
 * dust render emits empty string, and we then return false
 *
 * if values does not exist in JSON and the input is interpolated references :
 * {x} < {y}
 * dust render emits <  and we return the partial output
 */
function tap(input, chunk, context) {
	// return given input if there is no dust reference to resolve
	// dust compiles a string/reference such as {foo} to a function
	if (typeof input !== 'function') {
		return input;
	}

	var dustBodyOutput = '',
		returnValue;

	//use chunk render to evaluate output. For simple functions result
	// will be returned from render call,
	//for dust body functions result will be output via callback function
	returnValue = chunk.tap(function (data) {
		dustBodyOutput += data;
		return '';
	}).render(input, context);

	chunk.untap();

	//assume it's a simple function call if return result is not a chunk
	if (returnValue.constructor !== chunk.constructor) {
		//use returnValue as a result of tap
		return returnValue;
	} else if (dustBodyOutput === '') {
		return false;
	} else {
		return dustBodyOutput;
	}
}

var helpers = {
	sep: function (chunk, context, bodies) {
		var body = bodies.block;
		if (context.stack.index === context.stack.of - 1) {
			return chunk;
		}
		return body ? bodies.block(chunk, context) : chunk;
	},

	idx: function (chunk, context, bodies) {
		var body = bodies.block;
		return body ?
			bodies.block(chunk, context.push(context.stack.index)) :
			chunk;
	},

	/**
	 * Context dump helper.
	 * @param {string} params.key specifies how much to dump.
	 * "current" dumps current context. "full" dumps the full context stack.
	 * @param {string} params.to specifies where to write dump output.
	 * Values can be "console" or "output". Default is output.
	 */
	contextDump: function (chunk, context, bodies, params) {
		var p = params || {},
			to = p.to || 'output',
			key = p.key || 'current',
			dump;
		to = tap(to, chunk, context);
		key = tap(key, chunk, context);
		if (key === 'full') {
			dump = JSON.stringify(context.stack, jsonFilter, 2);
		} else {
			dump = JSON.stringify(context.stack.head, jsonFilter, 2);
		}
		if (to === 'console') {
			console.log(dump);
			return chunk;
		} else {
			return chunk.write(dump);
		}
	},

	/**
	 * If helper for complex evaluation complex logic expressions.
	 * Note :
	 * #1 if helper fails gracefully when there is no body block nor
	 * else block.
	 * #2 Undefined values and false values in the JSON need to be handled
	 * specially with .length check for
	 * e.g @if cond=" '{a}'.length && '{b}'.length"
	 * is advised when there are chances of the a and b been undefined or false
	 * in the context.
	 * #3 Use only when the default ? and ^ dust operators and the select fall
	 * short in addressing the given logic, since eval executes
	 * in the global scope.
	 * #4 All dust references are default escaped as they are resolved,
	 * hence eval will block malicious scripts in the context. Be mindful of
	 * evaluating a expression that is passed through the unescape filter -> |s
	 * @param {string} params.cond, either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. cond="2>3"
	 * a dust reference is also enclosed in double quotes,
	 * e.g. cond="'{val}'' > 3"
	 * cond argument should evaluate to a valid javascript expression
	 */
	if: function (chunk, context, bodies, params) {
		var body = bodies.block,
			skip = bodies['else'];
		if (!params || !params.cond) {
			throw new Error('No condition given in the if helper!');
		}
		var condition = tap(params.cond, chunk, context);
		// eval expressions with given dust references
		/*jshint evil:true*/
		if (eval(condition)) {
			if (!body) {
				throw new Error('Missing body block in the if helper');
			}
			return chunk.render(bodies.block, context);
		}
		if (skip) {
			return chunk.render(bodies['else'], context);
		}
		return chunk;
	},

	/**
	 * Math helper.
	 * @param {*} params.key is the value to perform math against
	 * @param {string} params.method is the math method,  is a valid string supported
	 * by math helper like mod, add, subtract
	 * @param {*} params.operand is the second value needed for operations like
	 * mod, add, subtract, etc.
	 * @param {boolean} params.round is a flag to assure that an integer is returned
	 */
	/*jshint maxcomplexity:false */
	math: function (chunk, context, bodies, params) {
		//key and method are required for further processing
		if (!params || typeof(params.key) === 'undefined' || !params.method) {
			throw new Error(
					'"key" is a required parameter for math helper ' +
					'along with "method"/"operand"'
			);
		}
		var key = params.key,
			method = params.method,
		// operand can be null for "abs", ceil and floor
			operand = params.operand,
			round = params.round,
			mathOut = null;

		key = tap(key, chunk, context);
		operand = tap(operand, chunk, context);
		switch (method) {
			case 'mod':
				mathOut = parseFloat(key) % parseFloat(operand);
				break;
			case 'add':
				mathOut = parseFloat(key) + parseFloat(operand);
				break;
			case 'subtract':
				mathOut = parseFloat(key) - parseFloat(operand);
				break;
			case 'multiply':
				mathOut = parseFloat(key) * parseFloat(operand);
				break;
			case 'divide':
				mathOut = parseFloat(key) / parseFloat(operand);
				break;
			case 'ceil':
				mathOut = Math.ceil(parseFloat(key));
				break;
			case 'floor':
				mathOut = Math.floor(parseFloat(key));
				break;
			case 'round':
				mathOut = Math.round(parseFloat(key));
				break;
			case 'abs':
				mathOut = Math.abs(parseFloat(key));
				break;
			default:
				throw new Error(
						'Math method +"' + method + '" is not supported'
				);
		}

		if (mathOut === null) {
			return chunk;
		}
		if (round) {
			mathOut = Math.round(mathOut);
		}
		if (!bodies || !bodies.block) {
			// self closing math helper will return the calculated output
			return chunk.write(mathOut);
		}
		// with bodies act like the select helper with mathOut
		// as the key
		// like the select helper bodies['else'] is meaningless
		// and is ignored
		context.push({
			isSelect: true,
			isResolved: false,
			selectKey: mathOut
		});
		return chunk.render(bodies.block, context);
	},

	/**
	 * Select helper works with one of the eq/ne/gt/gte/lt/lte/default
	 * providing the functionality of branching conditions
	 * @param {*} params.key (required) either a string literal value or a
	 * dust reference. A string literal value, is enclosed in double quotes,
	 * e.g. key="foo". A dust reference may or may not be enclosed in double
	 * quotes, e.g. key="{val}" and key=val are both valid.
	 * @param {string} params.type (optional), supported types are
	 * number, boolean, string, date, context, defaults to string.
	 */
	select: function (chunk, context, bodies, params) {
		var body = bodies.block;
		// key is required for processing, hence check for defined
		if (!params || typeof(params.key) === 'undefined') {
			throw new Error('No key given in the select helper');
		}
		// returns given input as output, if the input is not a dust reference,
		// else does a context lookup
		var key = tap(params.key, chunk, context);
		// bodies['else'] is meaningless and is ignored
		if (!body) {
			throw new Error('Missing body block in the select helper');
		}
		context.push({
			isSelect: true,
			isResolved: false,
			selectKey: key
		});
		return chunk.render(bodies.block, context);
	},

	/**
	 * eq helper compares the given key is same as the expected value.
	 * It can be used standalone or in conjunction with select for multiple
	 * branching
	 * @param {*} params.key The actual key to be compared
	 * (optional when helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value The expected value to compare to, when helper
	 * is used standalone or in conjunction with select
	 * @param {string} params.type (optional) supported types are
	 * number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	eq: function (chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'eq';
		}
		return filter(chunk, context, bodies, params,
			function (expected, actual) { return actual === expected; });
	},

	/**
	 * ne helper compares the given key is not the same as the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {*} params.key The actual key to be compared
	 * (optional when helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value The expected value to compare to, when helper
	 * is used standalone or in conjunction with select
	 * @param {string} params.type (optional), supported types are
	 * number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	ne: function (chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'ne';
			return filter(chunk, context, bodies, params,
				function (expected, actual) { return actual !== expected; });
		}
		return chunk;
	},

	/**
	 * lt helper compares the given key is less than the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {*} params.key The actual key to be compared
	 * (optional when helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value The expected value to compare to, when helper
	 * is used standalone  or in conjunction with select
	 * @param {string} params.type (optional), supported types are
	 * number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	lt: function (chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'lt';
			return filter(chunk, context, bodies, params,
				function (expected, actual) { return actual < expected; });
		}
	},

	/**
	 * lte helper compares the given key is less or equal to the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {*} params.key The actual key to be compared ( optional when
	 * helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value The expected value to compare to, when helper
	 * is used standalone or in conjunction with select
	 * @param {string} params.type (optional), supported types
	 * are number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	lte: function (chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'lte';
			return filter(chunk, context, bodies, params,
				function (expected, actual) { return actual <= expected; });
		}
		return chunk;
	},

	/**
	 * gt helper compares the given key is greater than the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {*} params.key,  The actual key to be compared ( optional when
	 * helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value, The expected value to compare to, when helper
	 * is used standalone  or in conjunction with select
	 * @param {string} params.type (optional), supported types are
	 * number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	gt: function (chunk, context, bodies, params) {
		// if no params do no go further
		if (params) {
			params.filterOpType = 'gt';
			return filter(chunk, context, bodies, params,
				function (expected, actual) { return actual > expected; });
		}
		return chunk;
	},

	/**
	 * gte helper, compares the given key is greater than or equal
	 * to the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {*} params.key  The actual key to be compared (optional
	 * when helper used in conjunction with select)
	 * either a string literal value or a dust reference
	 * a string literal value, is enclosed in double quotes, e.g. key="foo"
	 * a dust reference may or may not be enclosed in double quotes,
	 * e.g. key="{val}" and key=val are both valid
	 * @param {*} params.value The expected value to compare to, when helper
	 * is used standalone or in conjunction with select
	 * @param {string} params.type (optional) supported types are
	 * number, boolean, string, date, context, defaults to string
	 * Note : use type="number" when comparing numeric
	 */
	gte: function (chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'gte';
			return filter(chunk, context, bodies, params,
				function (expected, actual) { return actual >= expected; });
		}
		return chunk;
	},

	// to be used in conjunction with the select helper
	// TODO: fix the helper to do nothing when used standalone
	default: function (chunk, context, bodies, params) {
		// does not require any params
		if (params) {
			params.filterOpType = 'default';
		}
		return filter(chunk, context, bodies, params,
			function () { return true; });
	},

	/**
	 * Size helper prints the size of the given key
	 * Note : size helper is self closing and does not support bodies
	 * @param {*} params.key, the element whose size is returned
	 */
	size: function (chunk, context, bodies, params) {
		var key, value = 0, nr, k;
		params = params || {};
		key = params.key;
		if (!key || key === true) { //undefined, null, "", 0
			value = 0;
		} else if (util.isArray(key)) { //array
			value = key.length;
		} else if (!isNaN(parseFloat(key)) && isFinite(key)) { //numeric values
			value = key;
		} else if (typeof(key) === 'object') { //object test
			value = Object.keys(key).length;
		} else {
			value = String(key).length; //any other value (strings etc.)
		}
		return chunk.write(value);
	}
};

module.exports = helpers;