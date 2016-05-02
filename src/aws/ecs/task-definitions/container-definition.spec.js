'use strict';

const rewire = require('rewire');

const cd = rewire('./container-definition');
const C = require('../../../chai');

function initData() {
}


/*global describe, it, expect, beforeEach, afterEach */
describe('AWS: ECS: Container Definition', () => {
  describe('create function', () => {
    it('should throw without a name', () => {
      expect(() => cd.create()).to.throw(TypeError);
    });
    
    it('should throw without a name property', () => {
      expect(() => cd.create({ })).to.throw(TypeError);   
    });
    
    it('should return a new container definition', () => {
      expect(cd.create('test') instanceof cd.ContainerDefinition).to.be.ok;
    });

    it('should have properties that are given to it', () => {
      expect(cd.create({ cpu: 256, name: 'test' }).cpu).to.equal(256);
    });
    
    it('should use name as default image', () => {
      expect(cd.create({ cpu: 256, name: 'test' }).image).to.equal('test');
    });
  });

  describe('validateMemory function', () => {
    it('should have a minimum memory', () => {
      expect(cd.validateMemory(1) > 1).to.be.ok;
    });
    
    it('should have a default', () => {
      expect(cd.validateMemory()).to.be.ok;
    });
    
    it('should set a valid valdue', () => {
      expect(cd.validateMemory(796)).to.equal(796);
    });
  });
});
