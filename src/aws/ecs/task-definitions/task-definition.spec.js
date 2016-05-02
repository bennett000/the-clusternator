'use strict';

const rewire = require('rewire');

const ContainerDefinition = 
  require('./container-definition').ContainerDefinition;
const td = rewire('./task-definition');
const C = require('../../../chai');

function initData() {
}


/*global describe, it, expect, beforeEach, afterEach */
describe('AWS: ECS: Task Definition', () => {
  describe('create function', () => {
    it('should throw if not given a family name', () => {
      expect(() => td.create()).to.throw(TypeError);
    });

    it('should throw if not given a family name as a property', () => {
      expect(() => td.create({})).to.throw(TypeError);
    });

    it('should not throw if given a family name as a string', () => {
      expect(() => td.create('family name!')).to.not.throw(TypeError);
    });

    it('should not throw if given a family name as a property', () => {
      expect(() => td.create({
        family: 'some family name',
      })).to.not.throw(TypeError);
    });

    it('should return a new TaskDefinition', () => {
      expect(td.create('name') instanceof td.TaskDefinition).to.be.ok;
    });

    it('should inherit properties from a given object', () => {
      expect(td.create({
        family: 'family name here',
        testProp: 'test!'
      }).testProp).to.equal('test!');
    });
    
    it('should have a containerDefinitions array', () => {
      const aTd = td.create({ family: 'test' });
      expect(Array.isArray(aTd.containerDefinitions)).to.be.ok;
    });
    
    it('should have a containerDefinitions array with length', () => {
      const aTd = td.create({ family: 'test' });
      expect(aTd.containerDefinitions.length >= 1).to.be.ok;
    });
    
    it('should preserve given containerDefinitions', () => {
      const cd = ContainerDefinition({ name: 'thing', test: 'value' });
      const aTd = td.create({ family: 'test', containerDefinitions: [
        cd 
      ]});
      expect(aTd.containerDefinitions[0].test).to.equal('value');
    });
  });
  
  describe('validateContainerDefinitions function', () => {
    it('should map an array of things to ContainerDefinitions', () => {
      expect(td.validateContainerDefinitions([
          { name: 'test', image: 'test-image' }
        ])[0] instanceof ContainerDefinition).to.be.ok;
    });
  });

  describe('mapContainerDefinition function', () => {
    it('should return a given ContainerDefinition', () => {
      const cd = new ContainerDefinition('test');
      expect(td.mapContainerDefinition(cd)).to.equal(cd);
    });

    it('should convert objects to CoontainerDefinitions', () => {
      expect(td.mapContainerDefinition('test') instanceof ContainerDefinition)
        .to.be.ok;
    });
  });
});
