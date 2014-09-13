all: lint

lint:
	./node_modules/.bin/jshint ./ && ./node_modules/.bin/jscs ./

parser:
	node ./parser/build.js

.PHONY: lint parser