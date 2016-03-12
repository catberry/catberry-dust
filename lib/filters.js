'use strict';

module.exports = {
	h(value) {
		if (typeof value === 'string') {
			return value
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/\"/g, '&quot;')
				.replace(/\'/g, '&#39;');
		}
		return value;
	},
	j(value) {
		if (typeof value === 'string') {
			return value
				.replace(/\\/g, '\\\\')
				.replace(/\//g, '\\/')
				.replace(/"/g, '\\"')
				.replace(/'/g, '\\\'')
				.replace(/\r/g, '\\r')
				.replace(/\u2028/g, '\\u2028')
				.replace(/\u2029/g, '\\u2029')
				.replace(/\n/g, '\\n')
				.replace(/\f/g, '\\f')
				.replace(/\t/g, '\\t');
		}
		return value;
	},
	u: encodeURI,
	uc: encodeURIComponent,
	js(value) {
		return JSON.stringify(value);
	},
	jp(value) {
		return JSON.parse(value);
	},
	// just turns off h filter by default and returns unescaped value
	s(value) {
		return value;
	}
};
