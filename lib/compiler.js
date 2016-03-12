'use strict';

/* eslint require-jsdoc:0 */

const parser = require('./parser');

const SPECIAL_CHARS = {
	s: ' ',
	n: '\n',
	r: '\r',
	lb: '{',
	rb: '}'
};

const compiler = {
	compile(source) {
		try {
			const parsedSource = parser.parse(source);
			const ast = filterAST(parsedSource);
			return compile(ast);
		} catch (e) {
			e.message += ` At line : ${e.line}, column : ${e.column}`;
			throw e;
		}
	},
	compileNode(context, node) {
		return compiler.nodes[node[0]](context, node);
	},
	filterNode(context, node) {
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
		body(context, node) {
			const id = context.index++;
			const name = `body_${id}`;
			context.bodies[id] = compileParts(context, node);
			return name;
		},

		buffer(context, node) {
			return `.write(${JSON.stringify(node[1])})`;
		},

		format(context, node) {
			return `.write(${JSON.stringify(node[1] + node[2])})`;
		},

		reference(context, node) {
			return `.reference(${compiler.compileNode(context, node[1])},ctx,${compiler.compileNode(context, node[2])})`;
		},

		'#'(context, node) {
			return compileSection(context, node, 'section');
		},

		'?'(context, node) {
			return compileSection(context, node, 'exists');
		},

		'^'(context, node) {
			return compileSection(context, node, 'notexists');
		},

		'<'(context, node) {
			const bodies = node[4];
			for (let i = 1, len = bodies.length; i < len; i++) {
				const param = bodies[i];
				const type = param[1][1];
				if (type === 'block') {
					context.blocks[node[1].text] =
						compiler.compileNode(context, param[2]);
					return '';
				}
			}
			return '';
		},

		'+'(context, node) {
			if (typeof (node[1].text) === 'undefined' &&
				typeof (node[4]) === 'undefined') {
				return `.block(ctx.getBlock(${compiler.compileNode(context, node[1])},chk, ctx),${compiler.compileNode(context, node[2])}, {},${compiler.compileNode(context, node[3])})`;
			}
			return `.block(ctx.getBlock(${JSON.stringify(node[1].text)}),${compiler.compileNode(context, node[2])},${compiler.compileNode(context, node[4])},${compiler.compileNode(context, node[3])})`;
		},

		'@'(context, node) {
			return `.helper(${JSON.stringify(node[1].text)},${compiler.compileNode(context, node[2])},${compiler.compileNode(context, node[4])},${compiler.compileNode(context, node[3])})`;
		},

		partial(context, node) {
			return `.partial(${compiler.compileNode(context, node[1])},${compiler.compileNode(context, node[2])},${compiler.compileNode(context, node[3])})`;
		},

		context(context, node) {
			if (node[1]) {
				return `ctx.rebase(${compiler.compileNode(context, node[1])})`;
			}
			return 'ctx';
		},

		param(context, node) {
			return `${compiler.compileNode(context, node[1])}:${compiler.compileNode(context, node[2])}`;
		},

		params(context, node) {
			const out = [];
			for (let i = 1, len = node.length; i < len; i++) {
				out.push(compiler.compileNode(context, node[i]));
			}
			if (out.length) {
				return `{${out.join(',')}}`;
			}
			return '{}';
		},

		bodies(context, node) {
			const out = [];
			for (let i = 1, len = node.length; i < len; i++) {
				out.push(compiler.compileNode(context, node[i]));
			}
			return `{${out.join(',')}}`;
		},

		filters(context, node) {
			const list = [];
			for (let i = 1, len = node.length; i < len; i++) {
				const filter = node[i];
				list.push(`"${filter}"`);
			}
			return `[${list.join(',')}]`;
		},

		key(context, node) {
			return `ctx.get(["${node[1]}"], false)`;
		},

		path(context, node) {
			const current = node[1];
			const keys = node[2];
			const list = [];

			for (let i = 0, len = keys.length; i < len; i++) {
				if (Array.isArray(keys[i])) {
					list.push(compiler.compileNode(context, keys[i]));
				} else {
					list.push(`"${keys[i]}"`);
				}
			}
			return `ctx.getPath(${current}, [${list.join(',')}])`;
		},

		literal(context, node) {
			return JSON.stringify(node[1]);
		},
		raw(context, node) {
			return `.write(${JSON.stringify(node[1])})`;
		}
	}
};

function filterAST(ast) {
	return compiler.filterNode({}, ast);
}

function visit(context, node) {
	const out = [node[0]];
	for (let i = 1; i < node.length; i++) {
		const res = compiler.filterNode(context, node[i]);
		if (res) {
			out.push(res);
		}
	}
	return out;
}

// Compacts consecutive buffer nodes into a single node
function compactBuffers(context, node) {
	const out = [node[0]];
	let memo;
	for (let i = 1; i < node.length; i++) {
		const res = compiler.filterNode(context, node[i]);
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
	const context = {
		bodies: [],
		blocks: {},
		index: 0
	};
	compiler.compileNode(context, ast);
	return `(function(){${compileBlocks(context)}${compileBodies(context)}return body_0;})();`;
}

function compileBlocks(context) {
	const out = [];
	const blocks = context.blocks;

	Object.keys(blocks).forEach(name => out.push(`"${name}":${blocks[name]}`));

	if (out.length) {
		context.blocks = 'ctx=ctx.shiftBlocks(blocks);';
		return `var blocks={${out.join(',')}};`;
	}
	context.blocks = '';
	return context.blocks;
}

function compileBodies(context) {
	const out = [];
	const bodies = context.bodies;
	const blx = context.blocks;

	for (let i = 0; i < bodies.length; i++) {
		out[i] = `function body_${i}(chk,ctx){${blx}return chk${bodies[i]};}`;
	}
	return out.join('');
}

function compileParts(context, body) {
	let parts = '';
	for (let i = 1; i < body.length; i++) {
		parts += compiler.compileNode(context, body[i]);
	}
	return parts;
}

function compileSection(context, node, cmd) {
	return `.${cmd}(${compiler.compileNode(context, node[1])},${compiler.compileNode(context, node[2])},${compiler.compileNode(context, node[4])},${compiler.compileNode(context, node[3])})`;
}

module.exports = compiler;
