b ?= master

all: install

build:
	@yarn --silent lerna run build --stream

changed:
	@yarn --silent lerna changed

clean: clean-lib clean-modules clean-coverage clean-buildinfo
clean-buildinfo:
	@find packages/ -name tsconfig.tsbuildinfo -exec rm -rf {} +
clean-coverage:
	@rm -rf coverage/
	@find packages/ -name coverage -type d -exec rm -rf {} +
clean-lib:
	@find packages/ -name lib -type d -exec rm -rf {} +
clean-modules:
	@rm -rf node_modules/
	@find packages/ -name node_modules -type d -exec rm -rf {} +

generate:
	@yarn --silent genjs

install: install-root install-packages build
install-packages:
	@yarn --silent lerna bootstrap
install-root:
	@yarn --silent install

new:
	@yarn --silent yo ./packages/generator-package 2>/dev/null

package-build:
	@cd packages/$(p) && yarn --silent build
package-clear-test:
	@cd packages/$(p) && yarn --silent jest --clearCache
package-install:
	@yarn --silent lerna bootstrap --scope @computo/$(p)
package-test: package-build
	@cd packages/$(p) && yarn --silent test --coverage --detectOpenHandles

pr:
	@hub pull-request -b $(b)

publish:
	@yarn --silent lerna publish

test: build test-only
test-local:
	@yarn --silent test --coverage --detectOpenHandles
test-only:
	@yarn --silent test --runInBand --coverage --detectOpenHandles

.PHONY: all \
		build \
		changed \
		clean clean-buildinfo clean-coverage clean-lib clean-modules \
		generate \
		install install-packages install-root \
		new \
		package-build package-clear-test package-install package-test \
		pr \
		publish \
		test test-local test-only