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
 *
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

module.exports = Context;

var Stack = require('./Stack'),
	Chunk = require('./Chunk');

function Context(stack, global, blocks, templateName, dust) {
	this.stack = stack;
	this.global = global;
	this.blocks = blocks;
	this.templateName = templateName;
	this.dust = dust;
}

Context.wrap = function (context, name, dust) {
	if (context instanceof Context) {
		return context;
	}
	return new Context(new Stack(context), {}, null, name, dust);
};

Context.createBase = function (global, dust) {
	return new Context(new Stack(), global, null, null, dust);
};

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
 * @returns {string|object}
 */
Context.prototype.get = function (path, cur) {
	if (typeof path === 'string') {
		if (path[0] === '.') {
			cur = true;
			path = path.substr(1);
		}
		path = path.split('.');
	}
	return this._get(cur, path);
};

/**
 * Get a value from the context
 * @param {boolean} cur Get only from the current context
 * @param {Array} down An array of each step in the path
 * @private
 * @return {string | object}
 */
/*jshint maxcomplexity:false */
/*jshint maxdepth:false */
Context.prototype._get = function (cur, down) {
	var ctx = this.stack,
		i = 1,
		value, first, len, ctxThis;
	first = down[0];
	len = down.length;

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
				//context's head is empty, value we are searching for is not defined
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
		return function () {
			try {
				return ctx.apply(ctxThis, arguments);
			} catch (err) {
				self.dust.logger.error(err);
				throw err;
			}
		};
	} else {
		if (ctx === undefined) {
			this.dust.logger.warn(
					'Cannot find the value for reference "{' + down.join('.') +
					'}" in template "' + this.getTemplateName() + '"'
			);
		}
		return ctx;
	}
};

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
Context.prototype.tap = function (input, chunk) {
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
	}).render(input, this);

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
};

Context.prototype.getPath = function (cur, down) {
	return this._get(cur, down);
};

Context.prototype.push = function (head, idx, len) {
	return new Context(new Stack(head, this.stack, idx, len), this.global,
		this.blocks, this.getTemplateName(), this.dust);
};

Context.prototype.rebase = function (head) {
	return new Context(new Stack(head), this.global, this.blocks,
		this.getTemplateName(), this.dust);
};

Context.prototype.current = function () {
	return this.stack.head;
};

Context.prototype.getBlock = function (key, chk, ctx) {
	if (typeof key === 'function') {
		var tempChk = new Chunk(null, null, null, this.dust);
		key = key(tempChk, this).data.join('');
	}

	var blocks = this.blocks;

	if (!blocks) {
		return;
	}
	var len = blocks.length, fn;
	while (len--) {
		fn = blocks[len][key];
		if (fn) {
			return fn;
		}
	}
};

Context.prototype.shiftBlocks = function (locals) {
	var blocks = this.blocks,
		newBlocks;

	if (locals) {
		if (!blocks) {
			newBlocks = [locals];
		} else {
			newBlocks = blocks.concat([locals]);
		}
		return new Context(this.stack, this.global, newBlocks,
			this.getTemplateName(), this.dust);
	}
	return this;
};

Context.prototype.getTemplateName = function () {
	return this.templateName;
};