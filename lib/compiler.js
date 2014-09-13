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

var util = require('util'),
	parser = require('./parser');

var SPECIAL_CHARS = {
	's': ' ',
	'n': '\n',
	'r': '\r',
	'lb': '{',
	'rb': '}'
};

var compiler = {
	compile: function (source) {
		var parsedSource = parser.parse(source),
			ast = filterAST(parsedSource);
		return compile(ast);
	},
	compileNode: function (context, node) {
		return compiler.nodes[node[0]](context, node);
	},
	filterNode: function (context, node) {
		return compiler.optimizers[node[0]](context, node);
	},
	optimizers: {
		body: compactBuffers,
		buffer: noop,
		special: convertSpecial,
		format: nullify,
		reference: visit,
		'#': visit,
		'?': visit,
		'^': visit,
		'<': visit,
		'+': visit,
		'@': visit,
		partial: visit,
		context: visit,
		params: visit,
		bodies: visit,
		param: visit,
		filters: noop,
		key: noop,
		path: noop,
		literal: noop,
		raw: noop,
		comment: nullify,
		line: nullify,
		col: nullify
	},
	nodes: {
		body: function (context, node) {
			var id = context.index++,
				name = 'body_' + id;
			context.bodies[id] = compileParts(context, node);
			return name;
		},

		buffer: function (context, node) {
			return '.write(' + JSON.stringify(node[1]) + ')';
		},

		format: function (context, node) {
			return '.write(' + JSON.stringify(node[1] + node[2]) + ')';
		},

		reference: function (context, node) {
			return '.reference(' + compiler.compileNode(context, node[1]) +
				',ctx,' + compiler.compileNode(context, node[2]) + ')';
		},

		'#': function (context, node) {
			return compileSection(context, node, 'section');
		},

		'?': function (context, node) {
			return compileSection(context, node, 'exists');
		},

		'^': function (context, node) {
			return compileSection(context, node, 'notexists');
		},

		'<': function (context, node) {
			var bodies = node[4];
			for (var i = 1, len = bodies.length; i < len; i++) {
				var param = bodies[i],
					type = param[1][1];
				if (type === 'block') {
					context.blocks[node[1].text] =
						compiler.compileNode(context, param[2]);
					return '';
				}
			}
			return '';
		},

		'+': function (context, node) {
			if (typeof(node[1].text) === 'undefined' &&
				typeof(node[4]) === 'undefined') {
				return '.block(ctx.getBlock(' +
					compiler.compileNode(context, node[1]) +
					',chk, ctx),' + compiler.compileNode(context, node[2]) +
					', {},' +
					compiler.compileNode(context, node[3]) +
					')';
			} else {
				return '.block(ctx.getBlock(' +
					JSON.stringify(node[1].text) +
					'),' + compiler.compileNode(context, node[2]) + ',' +
					compiler.compileNode(context, node[4]) + ',' +
					compiler.compileNode(context, node[3]) +
					')';
			}
		},

		'@': function (context, node) {
			return '.helper(' +
				JSON.stringify(node[1].text) +
				',' + compiler.compileNode(context, node[2]) + ',' +
				compiler.compileNode(context, node[4]) + ',' +
				compiler.compileNode(context, node[3]) +
				')';
		},

		partial: function (context, node) {
			return '.partial(' +
				compiler.compileNode(context, node[1]) +
				',' + compiler.compileNode(context, node[2]) +
				',' + compiler.compileNode(context, node[3]) + ')';
		},

		context: function (context, node) {
			if (node[1]) {
				return 'ctx.rebase(' + compiler.compileNode(context, node[1]) +
					')';
			}
			return 'ctx';
		},

		params: function (context, node) {
			var out = [];
			for (var i = 1, len = node.length; i < len; i++) {
				out.push(compiler.compileNode(context, node[i]));
			}
			if (out.length) {
				return '{' + out.join(',') + '}';
			}
			return '{}';
		},

		bodies: function (context, node) {
			var out = [];
			for (var i = 1, len = node.length; i < len; i++) {
				out.push(compiler.compileNode(context, node[i]));
			}
			return '{' + out.join(',') + '}';
		},

		param: function (context, node) {
			return compiler.compileNode(context, node[1]) + ':' +
				compiler.compileNode(context, node[2]);
		},

		filters: function (context, node) {
			var list = [];
			for (var i = 1, len = node.length; i < len; i++) {
				var filter = node[i];
				list.push('"' + filter + '"');
			}
			return '"' + context.auto + '"' +
				(list.length ? ',[' + list.join(',') + ']' : '');
		},

		key: function (context, node) {
			return 'ctx.get(["' + node[1] + '"], false)';
		},

		path: function (context, node) {
			var current = node[1],
				keys = node[2],
				list = [];

			for (var i = 0, len = keys.length; i < len; i++) {
				if (util.isArray(keys[i])) {
					list.push(compiler.compileNode(context, keys[i]));
				} else {
					list.push('"' + keys[i] + '"');
				}
			}
			return 'ctx.getPath(' + current + ', [' + list.join(',') + '])';
		},

		literal: function (context, node) {
			return JSON.stringify(node[1]);
		},
		raw: function (context, node) {
			return '.write(' + JSON.stringify(node[1]) + ')';
		}
	}
};

function filterAST(ast) {
	var context = {};
	return compiler.filterNode(context, ast);
}

function visit(context, node) {
	var out = [node[0]],
		i, len, res;
	for (i = 1, len = node.length; i < len; i++) {
		res = compiler.filterNode(context, node[i]);
		if (res) {
			out.push(res);
		}
	}
	return out;
}

// Compacts consecutive buffer nodes into a single node
function compactBuffers(context, node) {
	var out = [node[0]],
		memo, i, len, res;
	for (i = 1, len = node.length; i < len; i++) {
		res = compiler.filterNode(context, node[i]);
		if (!res) {
			continue;
		}
		if (res[0] === 'buffer') {
			if (memo) {
				memo[1] += res[1];
			} else {
				memo = res;
				out.push(res);
			}
		} else {
			memo = null;
			out.push(res);
		}
	}
	return out;
}

function convertSpecial(context, node) {
	return ['buffer', SPECIAL_CHARS[node[1]]];
}

function noop(context, node) {
	return node;
}

function nullify() {}

function compile(ast) {
	var context = {
		bodies: [],
		blocks: {},
		index: 0,
		auto: 'h'
	};

	return '(function(){' +
		compiler.compileNode(context, ast) +
		');' +
		compileBlocks(context) +
		compileBodies(context) +
		'return body_0;' +
		'})();';
}

function compileBlocks(context) {
	var out = [],
		blocks = context.blocks,
		name;

	for (name in blocks) {
		out.push('"' + name + '":' + blocks[name]);
	}
	if (out.length) {
		context.blocks = 'ctx=ctx.shiftBlocks(blocks);';
		return 'var blocks={' + out.join(',') + '};';
	}
	context.blocks = '';
	return context.blocks;
}

function compileBodies(context) {
	var out = [],
		bodies = context.bodies,
		blx = context.blocks,
		i, len;

	for (i = 0, len = bodies.length; i < len; i++) {
		out[i] = 'function body_' + i + '(chk,ctx){' +
			blx + 'return chk' + bodies[i] + ';}';
	}
	return out.join('');
}

function compileParts(context, body) {
	var parts = '',
		i, len;
	for (i = 1, len = body.length; i < len; i++) {
		parts += compiler.compileNode(context, body[i]);
	}
	return parts;
}

function compileSection(context, node, cmd) {
	return '.' + cmd + '(' +
		compiler.compileNode(context, node[1]) +
		',' + compiler.compileNode(context, node[2]) + ',' +
		compiler.compileNode(context, node[4]) + ',' +
		compiler.compileNode(context, node[3]) +
		')';
}

module.exports = compiler;