'use strict';
/**
 *
 * @module 'aws/ecs/task-definitions/container-definition'
 */

const ContainerDefinition = 
  require('./container-definition').ContainerDefinition;

module.exports = {
  TaskDefinition,
  create: TaskDefinition,
  mapContainerDefinition,
  validateContainerDefinitions,
  validateDefinition,
};

/**
 * @param {Object|string} givenDef
 * @returns {TaskDefinition}
 * @constructor
 * @throws {TypeError}
 */
function TaskDefinition(givenDef) {
  if (!(this instanceof TaskDefinition)) {
    return new TaskDefinition(givenDef);
  }

  givenDef = validateDefinition(givenDef);

  Object.assign(this, givenDef);
  
  if (this.containerDefinitions.length === 0) {
    this.containerDefinitions.push(ContainerDefinition(this.family));
  }
}

/**
 * @param {TaskDefinition|Object|String} givenDef
 * @returns {{ family: string, containerDefinitions: Array.
 <ContainerDefinition> }}
 */
function validateDefinition(givenDef) {
  if (!givenDef) {
    throw new TypeError('TaskDefinition requires a data set or a name');
  }

  if (typeof givenDef === 'string') {
    givenDef = {
      family: givenDef,
      containerDefinitions: []
    };
  }

  if (!givenDef.family) {
    throw new TypeError('TaskDefinition requires a family name');
  }
  
  if (!Array.isArray(givenDef.containerDefinitions)) {
    givenDef.containerDefinitions = [];
  } else {
    givenDef.containerDefinitions = 
      validateContainerDefinitions(givenDef.containerDefinitions);
  }

  return givenDef;
}

/**
 * @param {string|Object|ContainerDefinition} def
 * @returns {ContainerDefinition}
 */
function mapContainerDefinition(def) {
  if (def instanceof ContainerDefinition) {
    return def;
  }
  
  return ContainerDefinition(def);
}

/**
 * @param {Array.<string|Object|ContainerDefinition>} defs
 * @returns {Array.<ContainerDefinition>}
 */
function validateContainerDefinitions(defs) {
  return defs.map(mapContainerDefinition); 
} 
