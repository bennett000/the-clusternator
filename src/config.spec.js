'use strict';

const rewire = require('rewire');
const mockFs = require('mock-fs');

const config = rewire('./config');
require('./chai');

/*global describe, it, expect, beforeEach, afterEach */
describe('config provider', () => {
  beforeEach(() => {
    mockFs({
      '/.gitignore':  new Buffer([ 1, 2, 3])
    });
  });

  afterEach(() => mockFs.restore());

  it('should return an object', () =>  expect(config()).to.be.ok);

  it('should have an attribute (null or otherwise) called awsCredentials',
    () => expect(config().awsCredentials).to.not.equal(undefined));

  it('should have an attribute (null or otherwise) called ' +
    'user', () => expect(config().user).to.not.equal(undefined));
});
