'use strict';

class Tap {
	constructor(head, tail) {
		this.head = head;
		this.tail = tail;
	}

	push(tap) {
		return new Tap(tap, this);
	}

	go(value) {

		/* eslint consistent-this: 0 */
		var tap = this;

		while (tap) {
			value = tap.head(value);
			tap = tap.tail;
		}
		return value;
	}
}

class Chunk {
	constructor(root, next, taps, dust) {
		this.root = root;
		this.next = next;
		this.dust = dust;
		this.data = [];
		this.flushable = false;
		this.taps = taps;
	}

	write(data) {
		const taps = this.taps;

		if (taps) {
			data = taps.go(data);
		}
		this.data.push(data);
		return this;
	}

	end(data) {
		if (data) {
			this.write(data);
		}
		this.flushable = true;
		this.root.flush();
		return this;
	}

	map(callback) {
		const cursor = new Chunk(this.root, this.next, this.taps, this.dust);
		const branch = new Chunk(this.root, cursor, this.taps, this.dust);

		this.next = branch;
		this.flushable = true;
		try {
			callback(branch);
		} catch (e) {
			this.dust.logger.error(e);
			branch.setError(e);
		}
		return cursor;
	}

	tap(tap) {
		const taps = this.taps;

		if (taps) {
			this.taps = taps.push(tap);
		} else {
			this.taps = new Tap(tap);
		}
		return this;
	}

	untap() {
		this.taps = this.taps.tail;
		return this;
	}

	render(body, context) {
		return body(this, context);
	}

	reference(elem, context, filters) {
		if (typeof elem === 'function') {
			// Changed the function calling to use apply with the current
			// context to make sure that "this" is wat we expect it to be inside
			// the function
			elem = elem.apply(context.current(),
					[this, context, null, {
						filters
					}]
				);
			if (elem instanceof Chunk) {
				return elem;
			}
		}
		if (!isEmpty(elem)) {
			return this.write(
				this.dust.filterManager.filterValue(elem, filters)
			);
		}

		return this;
	}

	/* eslint complexity: 0 */
	section(elem, context, bodies, params) {
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
		const body = bodies.block;
		const skip = bodies.else;

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
		if (Array.isArray(elem)) {
			if (!body) {
				return this;
			}
			// jscs:disable safeContextKeyword
			const len = elem.length;

			/* eslint consistent-this: 0 */
			let chunk = this;
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
	}

	exists(elem, context, bodies) {
		const body = bodies.block;
		const skip = bodies.else;

		if (!isEmpty(elem)) {
			if (body) {
				return body(this, context);
			}
		} else if (skip) {
			return skip(this, context);
		}
		return this;
	}

	notexists(elem, context, bodies) {
		const body = bodies.block;
		const skip = bodies.else;

		if (isEmpty(elem)) {
			if (body) {
				return body(this, context);
			}
		} else if (skip) {
			return skip(this, context);
		}
		return this;
	}

	block(elem, context, bodies) {
		var body = bodies.block;

		if (elem) {
			body = elem;
		}

		if (body) {
			return body(this, context);
		}
		return this;
	}

	partial(elem, context, params) {
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
			// put params on
			partialContext = partialContext.push(params);
		}

		if (typeof elem === 'string') {
			partialContext.templateName = elem;
		}

		// reattach the head
		partialContext = partialContext.push(context.stack.head);

		let partialChunk;
		if (typeof elem === 'function') {
			partialChunk =
				this.capture(elem, partialContext, (name, chunk) => {
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
	}

	helper(name, context, bodies, params) {
		// handle invalid helpers, similar to invalid filters
		try {
			return this.dust.helperManager.invoke(
				name, this, context, bodies, params
			);
		} catch (e) {
			e.message = `Error calling "${name}" helper: ${e.message}`;
			this.dust.logger.error(e);
			return this.setError(e);
		}
	}

	capture(body, context, callback) {
		return this.map(chunk => {
			const stub = new Stub(this.dust, (err, out) => {
				if (err) {
					chunk.setError(err);
				} else {
					callback(out, chunk);
				}
			});
			body(stub.head, context).end();
		});
	}

	setError(err) {
		this.error = err;
		this.root.flush();
		return this;
	}
}

/**
 * Checks if value is empty.
 * @param  {*}  value The value.
 * @return {Boolean} true if value is empty.
 */
function isEmpty(value) {
	if (Array.isArray(value) && !value.length) {
		return true;
	}
	if (value === 0) {
		return false;
	}
	return (!value);
}

class Stub {
	constructor(dust, callback) {
		this.head = new Chunk(this, null, null, dust);
		this.dust = dust;
		this.out = '';
		this.callback = callback;
	}

	/**
	 * Flushes all data from chunks to consumer.
	 */
	flush() {
		while (this.head) {
			if (this.head.error) {
				throw this.head.error;
			}

			if (!this.head.flushable) {
				return;
			}
			this.out += this.head.data.join('');
			this.head = this.head.next;
		}
		this.callback(null, this.out);
	}
}

class Context {

	/* eslint max-params: 0 */
	constructor(stack, global, blocks, templateName, dust) {
		this.stack = stack || new Stack();
		this.global = global;
		this.blocks = blocks;
		this.templateName = templateName;
		this.dust = dust;
	}

	static wrap(context, name, dust) {
		if (context instanceof Context) {
			return context;
		}
		return new Context(new Stack(context), {}, null, name, dust);
	}

	static createBase(global, dust) {
		return new Context(new Stack(), global, null, null, dust);
	}

	/**
	 * Public API for getting a value from the context.
	 * @param {string|Array} path The path to the value. Supported formats are:
	 * 'key'
	 * 'path.to.key'
	 * '.path.to.key'
	 * ['path', 'to', 'key']
	 * ['key']
	 * @param {boolean} [cur=false] Boolean which determines if the search
	 * should be limited to the
	 * current context (true), or if get should search in parent
	 * contexts as well (false).
	 * @public
	 * @returns {string|Object} Value from template context.
	 */
	get(path, cur) {
		if (typeof path === 'string') {
			if (path[0] === '.') {
				cur = true;
				path = path.substr(1);
			}
			path = path.split('.');
		}
		return this._get(cur, path);
	}

	/**
	 * Get a value from the context
	 * @param {boolean} cur Get only from the current context
	 * @param {Array} down An array of each step in the path
	 * @private
	 * @return {string|Object}
	 */
	/* eslint complexity: 0 */
	/* eslint max-depth: 0 */
	_get(cur, down) {
		let ctx = this.stack;
		let i = 1;
		let value, ctxThis;
		const first = down[0];
		const len = down.length;

		if (cur && len === 0) {
			ctxThis = ctx;
			ctx = ctx.head;
		} else {
			if (!cur) {
				// Search up the stack for the first value
				while (ctx) {
					if (ctx.isObject) {
						ctxThis = ctx.head;
						value = ctx.head[first];
						if (value !== undefined) {
							break;
						}
					}
					ctx = ctx.tail;
				}

				if (value !== undefined) {
					ctx = value;
				} else {
					ctx = this.global ? this.global[first] : undefined;
				}
			} else if (ctx) {
				// if scope is limited by a leading dot, don't search up the tree
				if (ctx.head) {
					ctx = ctx.head[first];
				} else {
					// context's head is empty, value we are searching for is not defined
					ctx = undefined;
				}
			}

			while (ctx && i < len) {
				ctxThis = ctx;
				ctx = ctx[down[i]];
				i++;
			}
		}

		// Return the ctx or a function wrapping the application of the context.
		if (typeof ctx === 'function') {
			var self = this;
			return function() {
				try {
					return ctx.apply(ctxThis, arguments);
				} catch (err) {
					self.dust.logger.error(err);
					throw err;
				}
			};
		}
		if (ctx === undefined) {
			this.dust.logger.warn(
					`Cannot find the value for reference "{${down.join('.')}}" in template "${this.getTemplateName()}"`
			);
		}
		return ctx;
	}

	/*
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
	tap(input, chunk) {
		// return given input if there is no dust reference to resolve
		// dust compiles a string/reference such as {foo} to a function
		if (typeof input !== 'function') {
			return input;
		}

		let dustBodyOutput = '';

		// use chunk render to evaluate output. For simple functions result
		// will be returned from render call,
		// for dust body functions result will be output via callback function
		const returnValue = chunk.tap(data => {
			dustBodyOutput += data;
			return '';
		}).render(input, this);

		chunk.untap();

		// assume it's a simple function call if return result is not a chunk
		if (returnValue.constructor !== chunk.constructor) {
			// use returnValue as a result of tap
			return returnValue;
		} else if (dustBodyOutput === '') {
			return false;
		}

		return dustBodyOutput;
	}

	getPath(cur, down) {
		return this._get(cur, down);
	}

	push(head, idx, len) {
		return new Context(new Stack(head, this.stack, idx, len), this.global,
			this.blocks, this.getTemplateName(), this.dust);
	}

	rebase(head) {
		return new Context(new Stack(head), this.global, this.blocks,
			this.getTemplateName(), this.dust);
	}

	current() {
		return this.stack.head;
	}

	getBlock(key) {
		if (typeof key === 'function') {
			const tempChk = new Chunk(null, null, null, this.dust);
			key = key(tempChk, this).data.join('');
		}

		const blocks = this.blocks;

		if (!blocks) {
			return null;
		}
		let len = blocks.length;
		while (len--) {
			const fn = blocks[len][key];
			if (fn) {
				return fn;
			}
		}
		return null;
	}

	shiftBlocks(locals) {
		const blocks = this.blocks;

		if (locals) {
			let newBlocks;
			if (!blocks) {
				newBlocks = [locals];
			} else {
				newBlocks = blocks.concat([locals]);
			}
			return new Context(this.stack, this.global, newBlocks,
				this.getTemplateName(), this.dust);
		}
		return this;
	}

	getTemplateName() {
		return this.templateName;
	}
}

class Stack {
	constructor(head, tail, idx, len) {
		this.tail = tail;
		this.isObject = head && typeof head === 'object';
		this.head = head;
		this.index = idx;
		this.of = len;
	}
}

module.exports = {
	Tap,
	Chunk,
	Stub,
	Context,
	Stack
};
