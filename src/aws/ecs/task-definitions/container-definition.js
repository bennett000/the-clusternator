'use strict';
/**
 * 
 * @module 'aws/ecs/task-definitions/container-definition'
 */

const awsConstants = require('../../aws-constants');

module.exports = {
  ContainerDefinition,
  create: ContainerDefinition,
  validateDefinition,
  validateMemory
};

/**
 * @param {Object|string} givenDef
 * @returns {ContainerDefinition}
 * @constructor
 * @throws {TypeError}
 */
function ContainerDefinition(givenDef) {
  if (!(this instanceof ContainerDefinition)) {
    return new ContainerDefinition(givenDef);
  }
  
  givenDef = validateDefinition(givenDef);
  
  Object.assign(this, givenDef);
}

/**
 * @param {{ name: string }|string} givenDef
 * @returns {{ name: string, image: string, memory: number }}
 */
function validateDefinition(givenDef) {
  if (!givenDef) {
    throw new TypeError('ContainerDefinition requires a name');
  }

  if (typeof givenDef === 'string') {
    givenDef = {
      name: givenDef,
      image: givenDef
    };
  }
  
  if (!givenDef.name) {
    throw new TypeError('ContainerDefinition requires a name property');
  }
  
  if (!givenDef.image) {
    givenDef.image = givenDef.name;
  }
  
  givenDef.memory = validateMemory(givenDef.memory);

  return givenDef; 
}

/**
 * @param {number=} value
 * @returns {number}
 */
function validateMemory(value) {
  value = parseInt(value, 10);
  
  if (!value) {
    value = parseInt(awsConstants.ECS_TASK_DEFAULT_MEMORY, 10);
  }
  
  if (value < awsConstants.ECS_TASK_MIN_MEMORY)  {
    value = awsConstants.ECS_TASK_MIN_MEMORY;
  }  
  
  return value;
}
