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

module.exports = Chunk;

var util = require('util'),
	Context = require('./Context'),
	Stub = require('./Stub'),
	Tap = require('./Tap');

function Chunk(root, next, taps, dust) {
	this.root = root;
	this.next = next;
	this.dust = dust;
	this.data = [];
	this.flushable = false;
	this.taps = taps;
}

Chunk.prototype.write = function (data) {
	var taps = this.taps;

	if (taps) {
		data = taps.go(data);
	}
	this.data.push(data);
	return this;
};

Chunk.prototype.end = function (data) {
	if (data) {
		this.write(data);
	}
	this.flushable = true;
	this.root.flush();
	return this;
};

Chunk.prototype.map = function (callback) {
	var cursor = new Chunk(this.root, this.next, this.taps, this.dust),
		branch = new Chunk(this.root, cursor, this.taps, this.dust);

	this.next = branch;
	this.flushable = true;
	try {
		callback(branch);
	} catch (e) {
		this.dust.logger.error(e);
		branch.setError(e);
	}
	return cursor;
};

Chunk.prototype.tap = function (tap) {
	var taps = this.taps;

	if (taps) {
		this.taps = taps.push(tap);
	} else {
		this.taps = new Tap(tap);
	}
	return this;
};

Chunk.prototype.untap = function () {
	this.taps = this.taps.tail;
	return this;
};

Chunk.prototype.render = function (body, context) {
	return body(this, context);
};

Chunk.prototype.reference = function (elem, context, auto, filters) {
	if (typeof elem === 'function') {
		// Changed the function calling to use apply with the current
		// context to make sure that "this" is wat we expect it to be inside
		// the function
		elem = elem.apply(context.current(),
			[this, context, null, {auto: auto, filters: filters}]);
		if (elem instanceof Chunk) {
			return elem;
		}
	}
	if (!isEmpty(elem)) {
		return this.write(
			this.dust.filterManager.filterValue(elem, auto, filters)
		);
	} else {
		return this;
	}
};

/*jshint maxcomplexity:false */
Chunk.prototype.section = function (elem, context, bodies, params) {
	// anonymous functions
	if (typeof elem === 'function') {
		try {
			elem = elem.apply(
				context.current(), [this, context, bodies, params]
			);
		} catch (e) {
			this.dust.logger.error(e);
			return this.setError(e);
		}
		// functions that return chunks are assumed to have handled the
		// body and/or have modified the chunk
		// use that return value as the current chunk and go
		// to the next method in the chain
		if (elem instanceof Chunk) {
			return elem;
		}
	}
	var body = bodies.block,
		skip = bodies['else'];

	// a.k.a Inline parameters in the Dust documentations
	if (params) {
		context = context.push(params);
	}

	// Dust's default behavior is to enumerate over the array elem, passing
	// each object in the array to the block.
	// When elem resolves to a value or object instead of an array,
	// Dust sets the current context to the value
	// and renders the block one time.
	// non empty array is truthy, empty array is falsy
	if (util.isArray(elem)) {
		if (!body) {
			return this;
		}
		var len = elem.length, chunk = this;
		if (len === 0) {
			return skip ? skip(this, context) : this;
		}
		// any custom helper can blow up the stack
		// and store a flattened context, guard defensively
		if (context.stack.head) {
			context.stack.head.$len = len;
		}
		for (var i = 0; i < len; i++) {
			if (context.stack.head) {
				context.stack.head.$idx = i;
			}
			chunk = body(chunk, context.push(elem[i], i, len));
		}
		if (context.stack.head) {
			context.stack.head.$idx = undefined;
			context.stack.head.$len = undefined;
		}
		return chunk;
	} else if (elem === true) {
		// true is truthy but does not change context
		if (body) {
			return body(this, context);
		}
	} else if (elem || elem === 0) {
		// everything that evaluates to true are truthy
		// (e.g. Non-empty strings and Empty objects are truthy.)
		// zero is truthy
		// for anonymous functions that did not returns a chunk,
		// truthiness is evaluated based on the return value
		if (body) {
			return body(this, context.push(elem));
		}
		// nonexistent, scalar false value, scalar empty string, null,
		// undefined are all falsy
	} else if (skip) {
		return skip(this, context);
	}
	return this;
};

Chunk.prototype.exists = function (elem, context, bodies) {
	var body = bodies.block,
		skip = bodies['else'];

	if (!isEmpty(elem)) {
		if (body) {
			return body(this, context);
		}
	} else if (skip) {
		return skip(this, context);
	}
	return this;
};

Chunk.prototype.notexists = function (elem, context, bodies) {
	var body = bodies.block,
		skip = bodies['else'];

	if (isEmpty(elem)) {
		if (body) {
			return body(this, context);
		}
	} else if (skip) {
		return skip(this, context);
	}
	return this;
};

Chunk.prototype.block = function (elem, context, bodies) {
	var body = bodies.block;

	if (elem) {
		body = elem;
	}

	if (body) {
		return body(this, context);
	}
	return this;
};

Chunk.prototype.partial = function (elem, context, params) {
	var partialContext;
	// put the params context second to match what section does.
	// {.} matches the current context without parameters
	// start with an empty context
	partialContext = Context.createBase(context.global, this.dust);
	partialContext.blocks = context.blocks;
	if (context.stack && context.stack.tail) {
		// grab the stack(tail) off of the previous context if we have it
		partialContext.stack = context.stack.tail;
	}
	if (params) {
		//put params on
		partialContext = partialContext.push(params);
	}

	if (typeof elem === 'string') {
		partialContext.templateName = elem;
	}

	//reattach the head
	partialContext = partialContext.push(context.stack.head);

	var partialChunk;
	if (typeof elem === 'function') {
		partialChunk =
			this.capture(elem, partialContext, function (name, chunk) {
				partialContext.templateName =
					partialContext.templateName || name;
				this.dust.templateManager
					.invoke(name, chunk, partialContext)
					.end();
			});
	} else {
		partialChunk = this.dust.templateManager
			.invoke(elem, this, partialContext);
	}
	return partialChunk;
};

Chunk.prototype.helper = function (name, context, bodies, params) {
	// handle invalid helpers, similar to invalid filters
	try {
		return this.dust.helperManager.invoke(
			name, this, context, bodies, params
		);
	} catch (e) {
		e.message = 'Error calling ' + name + ' helper: ' + e.message;
		this.dust.logger.error(e);
		return this.setError(e);
	}
};

Chunk.prototype.capture = function (body, context, callback) {
	return this.map(function (chunk) {
		var stub = new Stub(function (err, out) {
			if (err) {
				chunk.setError(err);
			} else {
				callback(out, chunk);
			}
		});
		body(stub.head, context).end();
	});
};

Chunk.prototype.setError = function (err) {
	this.error = err;
	this.root.flush();
	return this;
};

function isEmpty(value) {
	if (util.isArray(value) && !value.length) {
		return true;
	}
	if (value === 0) {
		return false;
	}
	return (!value);
}