'use strict';

/* eslint require-jsdoc: 0 */

function isSelect(context) {
	var value = context.current();
	return typeof value === 'object' && value.isSelect === true;
}

// Utility method : toString() equivalent for functions
function jsonFilter(key, value) {
	if (typeof value === 'function') {
		// to make sure all environments format functions the same way
		return value.toString()
			// remove all leading and trailing whitespace
			.replace(/(^\s+|\s+$)/mg, '')
			// remove new line characters
			.replace(/\n/mg, '')
			// replace , and 0 or more spaces with ", "
			.replace(/,\s*/mg, ', ')
			// insert space between ){
			.replace(/\)\{/mg, ') {');
	}
	return value;
}

// Utility method: to invoke the given filter operation such as eq/gt etc
/* eslint max-params:0 */
function filter(chunk, context, bodies, params, filterOp) {
	params = params || {};
	const body = bodies.block;
	const filterOpType = params.filterOpType || '';
	let actualKey;

	// when @eq, @lt etc are used as standalone helpers,
	// key is required and hence check for defined
	if (typeof params.key !== 'undefined') {
		actualKey = context.tap(params.key, chunk);
	} else if (isSelect(context)) {
		actualKey = context.current().selectKey;
		// supports only one of the blocks in the select to be selected
		if (context.current().isResolved) {
			filterOp = () => false;
		}
	} else {
		return chunk;
	}
	const expectedValue = context.tap(params.value, chunk);
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
		}
		return chunk;
	} else if (bodies.else) {
		return chunk.render(bodies.else, context);
	}
	return chunk;
}

function coerce(value, type, context) {
	if (value) {
		switch (type || typeof (value)) {
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

const helpers = {
	sep(chunk, context, bodies) {
		var body = bodies.block;
		if (context.stack.index === context.stack.of - 1) {
			return chunk;
		}
		return body ? bodies.block(chunk, context) : chunk;
	},

	idx(chunk, context, bodies) {
		var body = bodies.block;
		return body ?
			bodies.block(chunk, context.push(context.stack.index)) :
			chunk;
	},

	/**
	 * Context dump helper.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object.
	 * @param {string} params.key specifies how much to dump.
	 * "current" dumps current context. "full" dumps the full context stack.
	 * @param {string} params.to specifies where to write dump output.
	 * Values can be "console" or "output". Default is output.
	 */
	contextDump(chunk, context, bodies, params) {
		const p = params || {};
		let to = p.to || 'output';
		let key = p.key || 'current';
		let dump;
		to = context.tap(to, chunk);
		key = context.tap(key, chunk);
		if (key === 'full') {
			dump = JSON.stringify(context.stack, jsonFilter, 2);
		} else {
			dump = JSON.stringify(context.stack.head, jsonFilter, 2);
		}
		if (to === 'console') {

			/* eslint no-console: 0 */
			console.log(dump);
			return chunk;
		}
		return chunk.write(dump);
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
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object.
	 * @param {string} params.cond, either a string literal value
	 * or a dust reference a string literal value, is enclosed in double quotes,
	 * e.g. cond="2>3"
	 * a dust reference is also enclosed in double quotes,
	 * e.g. cond="'{val}'' > 3"
	 * cond argument should evaluate to a valid javascript expression
	 */
	if(chunk, context, bodies, params) {
		const body = bodies.block;
		const skip = bodies.else;
		if (!params || !params.cond) {
			throw new Error('No condition given in the if helper!');
		}
		var condition = context.tap(params.cond, chunk);
		// eval expressions with given dust references
		/* eslint no-eval: 0 */
		if (eval(condition)) {
			if (!body) {
				throw new Error('Missing body block in the if helper');
			}
			return chunk.render(bodies.block, context);
		}
		if (skip) {
			return chunk.render(bodies.else, context);
		}
		return chunk;
	},

	/**
	 * Math helper.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object.
	 * @param {*} params.key is the value to perform math against
	 * @param {string} params.method is the math method,  is a valid string
	 * supported by math helper like mod, add, subtract
	 * @param {*} params.operand is the second value needed for operations like
	 * mod, add, subtract, etc.
	 * @param {boolean} params.round is a flag to assure that an
	 * integer is returned
	 */
	/* eslint complexity: 0 */
	math(chunk, context, bodies, params) {
		// key and method are required for further processing
		if (!params || typeof (params.key) === 'undefined' || !params.method) {
			throw new Error(
					'"key" is a required parameter for math helper ' +
					'along with "method"/"operand"'
			);
		}
		let key = params.key;
		// operand can be null for "abs", ceil and floor
		let operand = params.operand;
		let mathOut = null;

		const method = params.method;
		const round = params.round;

		key = context.tap(key, chunk);
		operand = context.tap(operand, chunk);
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
						`Math method +"${method}" is not supported`
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
		return chunk.render(bodies.block, context.push({
			isSelect: true,
			isResolved: false,
			selectKey: mathOut
		}));
	},

	/**
	 * Select helper works with one of the eq/ne/gt/gte/lt/lte/default
	 * providing the functionality of branching conditions.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
	 * @param {*} params.key (required) either a string literal value or a
	 * dust reference. A string literal value, is enclosed in double quotes,
	 * e.g. key="foo". A dust reference may or may not be enclosed in double
	 * quotes, e.g. key="{val}" and key=val are both valid.
	 * @param {string} params.type (optional), supported types are
	 * number, boolean, string, date, context, defaults to string.
	 */
	select(chunk, context, bodies, params) {
		var body = bodies.block;
		// key is required for processing, hence check for defined
		if (!params || typeof (params.key) === 'undefined') {
			throw new Error('No key given in the select helper');
		}
		// returns given input as output, if the input is not a dust reference,
		// else does a context lookup
		var key = context.tap(params.key, chunk);
		// bodies['else'] is meaningless and is ignored
		if (!body) {
			throw new Error('Missing body block in the select helper');
		}

		return chunk.render(bodies.block, context.push({
			isSelect: true,
			isResolved: false,
			selectKey: key
		}));
	},

	/**
	 * eq helper compares the given key is same as the expected value.
	 * It can be used standalone or in conjunction with select for multiple
	 * branching.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	eq(chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'eq';
		}
		return filter(chunk, context, bodies, params, (expected, actual) => actual === expected);
	},

	/**
	 * ne helper compares the given key is not the same as the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	ne(chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'ne';
			return filter(chunk, context, bodies, params, (expected, actual) => actual !== expected);
		}
		return chunk;
	},

	/**
	 * lt helper compares the given key is less than the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	lt(chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'lt';
			return filter(chunk, context, bodies, params, (expected, actual) => actual < expected);
		}
		return chunk;
	},

	/**
	 * lte helper compares the given key is less or equal to the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	lte(chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'lte';
			return filter(chunk, context, bodies, params, (expected, actual) => actual <= expected);
		}
		return chunk;
	},

	/**
	 * gt helper compares the given key is greater than the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	gt(chunk, context, bodies, params) {
		// if no params do no go further
		if (params) {
			params.filterOpType = 'gt';
			return filter(chunk, context, bodies, params, (expected, actual) => actual > expected);
		}
		return chunk;
	},

	/**
	 * gte helper, compares the given key is greater than or equal
	 * to the expected value
	 * It can be used standalone or in conjunction with select
	 * for multiple branching.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
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
	gte(chunk, context, bodies, params) {
		if (params) {
			params.filterOpType = 'gte';
			return filter(chunk, context, bodies, params, (expected, actual) => actual >= expected);
		}
		return chunk;
	},

	// to be used in conjunction with the select helper
	// TODO: fix the helper to do nothing when used standalone
	default(chunk, context, bodies, params) {
		// does not require any params
		if (params) {
			params.filterOpType = 'default';
		}
		return filter(chunk, context, bodies, params, () => true);
	},

	/**
	 * Size helper prints the size of the given key
	 * Note : size helper is self closing and does not support bodies.
	 * @param {Chunk} chunk Current chunk.
	 * @param {Context} context Current context.
	 * @param {Object} bodies Current bodies.
	 * @param {Object} params Parameters object
	 * @param {*} params.key, the element whose size is returned
	 */
	size(chunk, context, bodies, params) {
		const key = params.key;
		let value = 0;
		let nr, k;
		params = params || {};
		if (!key || key === true) { // undefined, null, "", 0
			value = 0;
		} else if (Array.isArray(key)) { // array
			value = key.length;
		} else if (!isNaN(parseFloat(key)) && isFinite(key)) { // numeric values
			value = key;
		} else if (typeof (key) === 'object') { // object test
			value = Object.keys(key).length;
		} else {
			value = String(key).length; // any other value (strings etc.)
		}
		return chunk.write(value);
	}
};

module.exports = helpers;
