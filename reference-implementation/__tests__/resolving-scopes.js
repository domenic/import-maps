'use strict';
const { URL } = require('url');
const { parseFromString } = require('../lib/parser.js');
const { resolve } = require('../lib/resolver.js');

const mapBaseURL = new URL('https://example.com/app/index.html');

function makeResolveUnderTest(mapString) {
  const map = parseFromString(mapString, mapBaseURL);
  return (specifier, baseURL) => resolve(specifier, map, baseURL);
}

describe('Mapped using scope instead of "imports"', () => {
  const inTwoScopesURL = new URL('https://example.com/js/app.mjs');
  const inOneScopeURL = new URL('https://example.com/app.mjs');

  it('should fail when the mapping is to an empty array', () => {
    const resolveUnderTest = makeResolveUnderTest(`{
      "scopes": {
        "/js": {
          "moment": null,
          "lodash": []
        }
      }
    }`);

    expect(() => resolveUnderTest('moment')).toThrow(TypeError);
    expect(() => resolveUnderTest('lodash')).toThrow(TypeError);
  });

  describe('Package-like scenarios', () => {
    const resolveUnderTest = makeResolveUnderTest(`{
      "imports": {
        "moment": "/node_modules/moment/src/moment.js",
        "moment/": "/node_modules/moment/src/",
        "lodash-dot": "./node_modules/lodash-es/lodash.js",
        "lodash-dot/": "./node_modules/lodash-es/",
        "lodash-dotdot": "../node_modules/lodash-es/lodash.js",
        "lodash-dotdot/": "../node_modules/lodash-es/"
      },
      "scopes": {
        "/": {
          "moment": "/node_modules_3/moment/src/moment.js"
        },
        "/js": {
          "lodash-dot": "./node_modules_2/lodash-es/lodash.js",
          "lodash-dot/": "./node_modules_2/lodash-es/",
          "lodash-dotdot": "../node_modules_2/lodash-es/lodash.js",
          "lodash-dotdot/": "../node_modules_2/lodash-es/"
        }
      }
    }`);

    it('should resolve scoped and not cascade', () => {
      expect(resolveUnderTest('lodash-dot', inTwoScopesURL)).toMatchURL('https://example.com/app/node_modules_2/lodash-es/lodash.js');
      expect(resolveUnderTest('lodash-dotdot', inTwoScopesURL)).toMatchURL('https://example.com/node_modules_2/lodash-es/lodash.js');
      expect(resolveUnderTest('lodash-dot/foo', inTwoScopesURL)).toMatchURL('https://example.com/app/node_modules_2/lodash-es/foo');
      expect(resolveUnderTest('lodash-dotdot/foo', inTwoScopesURL)).toMatchURL('https://example.com/node_modules_2/lodash-es/foo');
    });

    it('should apply best scope match', () => {
      expect(resolveUnderTest('moment', inOneScopeURL)).toMatchURL('https://example.com/node_modules_3/moment/src/moment.js');
    });

    it('should fallback to imports', () => {
      expect(resolveUnderTest('moment/foo', inOneScopeURL)).toMatchURL('https://example.com/node_modules/moment/src/foo');
      expect(resolveUnderTest('lodash-dot', inOneScopeURL)).toMatchURL('https://example.com/app/node_modules/lodash-es/lodash.js');
      expect(resolveUnderTest('lodash-dotdot', inOneScopeURL)).toMatchURL('https://example.com/node_modules/lodash-es/lodash.js');
      expect(resolveUnderTest('lodash-dot/foo', inOneScopeURL)).toMatchURL('https://example.com/app/node_modules/lodash-es/foo');
      expect(resolveUnderTest('lodash-dotdot/foo', inOneScopeURL)).toMatchURL('https://example.com/node_modules/lodash-es/foo');
    });

    it('should still fail for package-like specifiers that are not declared', () => {
      expect(() => resolveUnderTest('underscore/', inTwoScopesURL)).toThrow(TypeError);
      expect(() => resolveUnderTest('underscore/foo', inTwoScopesURL)).toThrow(TypeError);
    });
  });
});

