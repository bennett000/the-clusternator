'use strict';
/**
 * Simplifies dealing with AWS task definitions
 *
 * @module aws/task-definitions/task-definitions
 *
 * @typedef {{ family: string } | string | TaskDefinition} TDParam
 */
const R = require('ramda');
const common = require('../../common');
const util = require('../../../util');
const TaskDefinition = 
  require('./task-definition').TaskDefinition;
const ContainerDefinition =
  require('./container-definition').ContainerDefinition;

module.exports = {
  bindAws,
  // NOTE: `describe` and `create` don't take some params.
  // Can't implement findOrCreate
  create,
  describeOne,
  destroy: findAndDestroy,
  list,
  listProject,
  listPr,
  listDeployment,
  listFamilies,
  helpers: {
    destroy,
  }
};

/**
 * @param {AwsWrapper} aws
 * @returns {Object} this API bound to
 */
function bindAws(aws) {
  return common.bindAws(aws, module.exports);
}

/**
 * Registers task definition
 * @params {AwsWrapper} aws
 * @param {TDParam} taskDef
 * @return {function(): Promise.<Object>}
 */
function create(aws, taskDef) {
  taskDef = TaskDefinition(taskDef);

  function promiseToCreate() {
    return aws.ecs.registerTaskDefinition(taskDef)
      .then(R.prop('taskDefinition'));
  }

  return promiseToCreate;
}

/**
 * Finds or registers task definition
 * @params {AwsWrapper} aws
 * @params {string} taskFamily
 * @return {function(): Promise.<Object>}
 */
// function findOrCreate(aws, taskDef) {}

/**
 * Describes one task definition
 * @params {AwsWrapper} aws
 * @params {string} taskDefinition family:revision or ARN
 * @return {function(): Promise.<string[]>}
 */
function describeOne(aws, taskFamily) {
  if(!taskFamily) {
    throw new TypeError('describeOne requires a configuration object');
  }
    
  function promiseToDescribeOne() {
    return aws.ecs.describeTaskDefinition({
      taskDefinition: taskFamily
      })
      .then(R.prop('taskDefinition'))
      .fail(() => []);
  }

  return promiseToDescribeOne;
}

/**
 * Deregisters task definition
 * @params {AwsWrapper} aws
 * @params {string} familyName
 * @return {Promise.<string>}
 */
function destroy(aws, familyName) {
  if(!familyName) {
    throw new TypeError('destroy requires a configuration object');
  }

  function promiseToDestroy() {
    return aws.ecs.deregisterTaskDefinition({
      taskDefinition: familyName
    })
    .then(() => 'deleted');
  }

  return promiseToDestroy;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} taskFamily
 * @returns {promiseToFindAndDestroy}
 */
function findAndDestroy(aws, taskFamily) {

  function promiseToFindAndDestroy() {
    return describeOne(aws, taskFamily)()
      .then((taskDefObj) => taskDefObj ? 
        destroy(aws, taskFamily)() : 
        'already deleted'
      );
  }

  return promiseToFindAndDestroy;
}

/**
 * List all task definitions
 * @params {AwsWrapper} aws
 * @return {Promise.<string[]>}
 */
function list(aws) {
  function promiseToList() {
    return aws.ecs.listTaskDefinitions({})
      .then(R.compose(
        R.filter(common.filterValidArns),
        R.prop('taskDefinitionArns')
      ));
  }
  
  return promiseToList;
}

/**
 * @params {AwsWrapper} aws
 * @returns {function(): Promise.<string[]>}
 */
function listFamilies(aws) {
  function promiseToListFamilies() {
    return aws.ecs.listTaskDefinitionFamilies({})
      .then(R.prop('families'));
  }

  return promiseToListFamilies;
}

/**
 * @params {AwsWrapper} aws
 * @param {string} projectId
 * @returns {Promise.<T>}
 */
function listProject(aws, projectId) {
  if(!projectId) {
    throw new TypeError('listProject requires a projectId');
  }

  function promiseToListProject() {
    return list(aws)()
      .then(R.filter(common.getProjectIdFilter(projectId)));
  }

  return promiseToListProject;
}

/**
 * @params {AwsWrapper} aws
 * @param {string} projectId
 * @param {string} pr
 * @returns {function(): Promise.<string[]>}
   */
function listPr(aws, projectId, pr) {
  if(!projectId) {
    throw new TypeError('listPr requires a projectId');
  }
  if(!pr) {
    throw new TypeError('listPr requires a pr');
  }

  function promiseToListPr() {
    return list(aws)()
      .then(R.filter(common.getPrFilter(projectId, pr)));
  }

  return promiseToListPr;
}

/**
 * @params {AwsWrapper} aws
 * @param {string} projectId
 * @param {string} deployment
 * @returns {function(): Promise.<string[]>}
 */
function listDeployment(aws, projectId, deployment) {
  if(!projectId) {
    throw new TypeError('listDeployment requires a projectId');
  }
  if(!deployment) {
    throw new TypeError('listDeployment requires a deployment');
  }

  function promiseToListDeployment() {
    return list(aws)()
      .then(R.filter(common.getDeploymentFilter(projectId, deployment)));
  }

  return promiseToListDeployment;
}
