'use strict';
/**
 * Simplifies dealing with AWS's ECS task services
 *
 * @module aws/ecs/task-services
 */

const SERVICE_POLL_DELAY = 15 * 1000;

const Q = require('q');
const R = require('ramda');
const util = require('../../util');
const awsCommon = require('../common');

// let instead of const for testing purposes
let taskDefinitions = require('./task-definitions/task-definitions');

/**
 * In repl, the helper methods won't be bound properly
 * unsure how to handle createTasksAndServices wrt "findAndCreate"
 */

module.exports = {
  bindAws,
  create: findOrCreate,
  createTaskAndService, // NOTE: No find method used
  createTasksAndServices, // NOTE: No find method used
  describe,
  describeMany,
  destroy: findAndDestroy,
  list,
  resolveIfDrained,
  resolveIfReady,
  stop,
  stopAndDestroy, // NOTE: No find method used
  stopAndDestroyCluster, // NOTE: No find method used
  update,
  waitForDrained,
  waitForPredicate,
  waitForReady,
  helpers: {
    checkForInactive,
    create,
    destroy,
    getStatus,
    processDescription,
    processDescriptions,
    throwIfNotDrained,
    throwIfNotReady,
    waitForDrained,
    waitForReady, 
  }
};

/**
 * @param {AwsWrapper} aws
 * @returns {Object} this API bound to
 */
function bindAws(aws) {
  return awsCommon.bindAws(aws, module.exports);
}

/**
 * Creates a service
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} serviceName
 * @param {Object} taskDefinition 
 * @returns {function(): Promise.<Object>} service
 */
function create(aws, cluster, serviceName, taskDefinition) {
  if(!cluster) {
    throw new TypeError('create requires a cluster name or ARN');
  }
  if(!serviceName) {
    throw new TypeError('create requires a serviceName');
  }
  if(!taskDefinition) {
    throw new TypeError('create requires task definition' + 
      ' family:revision or ARN');
  }

  function promiseToCreate() {
    return aws.ecs
      .createService({
        cluster,
        desiredCount: 1, //TODO you should be able to change this
        serviceName,
        taskDefinition,
      })
      .then(R.prop('service'));
  }

  return promiseToCreate;
}

/**
 * Finds or creates a service
 *
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} serviceName
 * @param {string} taskDefinitionArn
 * @returns {function(): Promise.<Object>} service
 */
function findOrCreate(aws, cluster, serviceName, taskDefinitionArn) {
  
  function promiseToFindOrCreate() {
    return describeMany(aws, cluster, [serviceName])()
      .then((services) =>
        R.find(R.propEq('taskDefinition', taskDefinitionArn), services) ||
        create(aws, cluster, serviceName, taskDefinitionArn)()
      );
  }

  return promiseToFindOrCreate;
}

function checkForInactive(services) {
  if (!services || !services.length) {
    return false;
  }

  return services[0].status === 'INACTIVE';
}

/**
 * This is the cool part.
 * cluster isn't actually an ARN?
 *
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} serviceName
 * @param {Object} task
 * @returns {function(): Promise.<Object>} service
 */
function createTaskAndService(aws, cluster, serviceName, task) {
  if(!cluster || !serviceName || !task) {
    throw new TypeError('createTaskAndService requires a clusterName, ' +
      'serviceName, and task object');
  }

  function waitForReady_(service) {
    return waitForReady(aws, service.cluster, service.serviceArn)();
  }

  function promiseToCreateTaskAndService() {
    return taskDefinitions.create(aws, task)()
      .then((taskDef) => {
        util.info('Created task', taskDef.taskDefinitionArn);
        return create(aws, cluster, serviceName, taskDef.taskDefinitionArn)();
      })
      .then(waitForReady_);
  }

  return promiseToCreateTaskAndService;
}

// Renamed from`createTasksAndServicesOnCluster`
// Formerly exported as `create`

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} serviceName
 * @param {Object} appDef
 * @returns {function(): Promise.<Object[]>} service
 */
function createTasksAndServices(aws, cluster, serviceName, appDef) {
  if(!cluster) {
    throw new TypeError('createTasksAndServices requires ' + 
      'a cluster name or ARN');
  }
  if(!serviceName) {
    throw new TypeError('createTasksAndServices requires a serviceName');
  }
  if(!appDef || !appDef.tasks) {
    throw new TypeError('createTasksAndServices requires a appDef object');
  }
  
  function createTaskAndService_(task) {
    return createTaskAndService(aws, cluster, serviceName, task)();
  }

  function promiseToCreateTasksAndServices() {

    const taskDefPromises = R.map(createTaskAndService_, appDef.tasks);

    return Q.all(taskDefPromises);
  }

  return promiseToCreateTasksAndServices;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @returns {function(): Promise.<Object[]>} services
 */
function describe(aws, cluster) {
  if(!cluster) {
    throw new TypeError('describe requires a cluster name or ARN');
  }

  function promiseToDescribe() {
    return list(aws, cluster)()
      .then((serviceArns) => describeMany(aws, cluster, serviceArns)());
  }

  return promiseToDescribe;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string[]} services Names or ARNs
 * @returns {function(): Promise.<Object[]>} services
 */
function describeMany(aws, cluster, services) {
  if(!cluster) {
    throw new TypeError('describeMany requires a cluster name or ARN');
  }
  if(!services || !services.length) {
    throw new TypeError('describeMany requires array of service name or ARN');
  }

  function promiseToDescribeMany() {
    return aws.ecs
      .describeServices({
        cluster,
        services: [].concat(services)
      })
      .then(R.prop('services'))
      .then(processDescriptions);
  }

  return promiseToDescribeMany;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} service Name or ARN
 * @returns {function(): Promise.<string>}
 */
function destroy(aws, cluster, service) {
  if (!cluster) {
    throw new TypeError('destroy requires cluster name or ARN');
  }
  if (!service) {
    throw new TypeError('destroy requires service name or ARN');
  }

  function promiseToDestroy() {
    const params = {
      cluster,
      service
    };

    return aws.ecs.deleteService(params)
      .then(() => 'deleted');
  }

  return promiseToDestroy;
}

/**
 * Finds then destroys a service
 *
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} service Name or ARN
 * @returns {function(): Promise.<Object>} service
 */
function findAndDestroy(aws, cluster, service) {
  
  function promiseToFindAndDestroy() {
    return describeMany(aws, cluster, [service])()
      .then((services) =>
        services && services.length ? 
          destroy(aws, cluster, service)() : 
          'already deleted'
      );
  }

  return promiseToFindAndDestroy;
}

/**
 * Checks first service for steady state
 * @param {string[]} services
 * @return {number} -1 = no services; 0 = steady state; >0 = not steady state
 */
function getStatus(services) {
  if (!services || !services.length) {
    return -1;
  }

  const isSteady = services[0].events.every((event) => {
    util.debug(`Polling service for ready check: ${event.message}`);
    return event.message.indexOf('steady state') === -1;
  });

  return Number(isSteady);
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @returns {function(): Promise.<string[]>}
 */
function list(aws, cluster) {
  if (!cluster) {
    throw new TypeError('list requires cluster ARN');
  }

  function promiseTolist() {
    return aws.ecs
      .listServices({
        cluster: cluster
      })
      .then(R.prop('serviceArns'));
  }

  return promiseTolist;
}

/**
 * @param {AWSServiceDescription} service
 * @returns {ClusternatorServiceDescription}
 */
function processDescription(service) {
  if (!service) {
    return null;
  }

  const lastEvent = R.path(['events', 0, 'message'], service);
  const picked = R.pick([
    'serviceArn',
    'taskDefinition',
    'cluster',
    'desiredCount',
    'pendingCount',
    'status',
    'deployments',
  ], service);

  if (typeof lastEvent !== 'undefined') {
    picked.lastEvent = lastEvent;
  }

  return picked;
}

/**
 * @param {AWSServiceDescription[]} descriptions
 * @returns {ClusternatorServiceDescription[]}
 */
function processDescriptions(services) {
  const processed = services
    .map(processDescription)
    .filter(R.complement(R.isEmpty));

  return processed;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} service Name or ARN
 * @returns {function(): Promise.<Object>} service
 */
function stop(aws, cluster, service) {
  if(!cluster) {
    throw new TypeError('stop requires a cluster name or ARN');
  }
  if(!service) {
    throw new TypeError('stop requires a service name or ARN');
  }

  function promiseToStop() {
    return update(aws, cluster, service, {
      desiredCount: 0
    })();
  }
  
  return promiseToStop;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string[]} service Name or ARN
 * @returns {function(): Promise.<string>}
 */
function stopAndDestroy(aws, cluster, service) {
  if(!cluster || !service) {
    throw new TypeError('stopAndDestroy requires a cluster and service');
  }

  function promiseToStopAndDestroy() {
    return stop(aws, cluster, service)()
      // no need for findAndDestroy since this comes from a list already
      .then((s) => destroy(aws, cluster, s.service));
  }

  return promiseToStopAndDestroy;
}

/**
 * Stops and destroys all services on cluster
 *
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @returns {function(): Promise.<Object>} service
 */
function stopAndDestroyCluster(aws, cluster) {
  if (!cluster) {
    throw new TypeError('stopAndDestroyCluster requires a cluster name or ARN');
  }

  function promiseToStopAndDestroyCluster() {
    return list(aws, cluster)()
      .then((serviceArns) => {
        const stopAndDestroyPromises = serviceArns.map(
          (serviceArn) => stopAndDestroy(aws, cluster, serviceArn)()
        );

        return Q.all(stopAndDestroyPromises)
          .then(() => waitForDrained(aws, cluster, serviceArns)());
      });
  }

  return promiseToStopAndDestroyCluster;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string} service Name or ARN
 * @param {Object} updateObj
 * @returns {function(): Promise.<Object>} service
 */
function update(aws, cluster, service, updateObj) {
  if (!cluster) {
    throw new TypeError('update requires cluster name or ARN');
  }
  if (!service) {
    throw new TypeError('update requires service name or ARN');
  }
  if (!updateObj) {
    throw new TypeError('update requires update object');
  }

  function promiseToUpdate() {
    let params = {
      cluster,
      service,
    };

    params = R.merge(params, updateObj);

    return aws.ecs.updateService(params)
      .then(R.prop('service'));
  }

  return promiseToUpdate;
}

/**
 * @param {object} services
 * @throws {Error}
 */
function throwIfNotDrained(services) {
  const isInactive = checkForInactive(services);
  if (isInactive) {
    util.info('Service has drained');
  } else {
    throw new Error('Service is draining');
  }
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster
 * @param {Object} services
 * @returns {function(): Promise}
 * @throws {TypeError}
 */
function resolveIfDrained(aws, cluster, services) {
  if (!cluster || !services) {
    throw new TypeError('waitForDrained requires cluster name and services');
  }
  
  function promiseToResolveIfDrained() {
    return describeMany(aws, cluster, services)()
      .then(throwIfNotDrained);
  } 
  return promiseToResolveIfDrained;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster Name or ARN
 * @param {string[]} services Names or ARNs
 * @returns {function(): Promise} services
 * @throws {TypeError}
 */
function waitForDrained(aws, cluster, services) {
  if (!cluster || !services) {
    throw new TypeError('waitForDrained requires cluster name and services');
  }
  
  const predicate = resolveIfDrained(aws, cluster, services);

  return waitForPredicate(predicate);
}

/**
 * @param services
 * @returns {*}
 * @throws {Error}
 */
function throwIfNotReady(services) {
  const status = getStatus(services);
  // @todo we need to some how die if this happens
  if (status < 0) {
    throw new Error('Error polling new service');
  }
  // valid case
  if (status === 0) {
    util.info('Service has reached a steady state');
    return services;
  }
  // fail
  throw new Error('Service not ready yet');
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster
 * @param {Array} services
 * @returns {function(): Promise}
 * @throws {TypeError}
 */
function resolveIfReady(aws, cluster, services) {
  if (!cluster || !services) {
    throw new TypeError('resolveIfReady requires cluster name and service');
  }
  function promiseToResolveIfReady() {
    return describeMany(aws, cluster, services)()
      .then(throwIfNotReady);
  }
  return promiseToResolveIfReady;
}

/**
 * @param {AwsWrapper} aws
 * @param {string} cluster name or ARN
 * @param {Array} services Names or ARNs
 * @returns {function(): Promise.<Object[]>} services
 * @throws {TypeError}
 */
// alternative name: waitForReady
function waitForReady(aws, cluster, services) {
  if (!cluster || !services) {
    throw new TypeError('waitForReady requires cluster name and service');
  }
  const predicate = resolveIfReady(aws, cluster, services);
  
  return waitForPredicate(predicate);
}

/**
 * @param {function(): Promise} predicate
 * @returns {function(): Promise}
 * @throws {TypeError}
 */
function waitForPredicate(predicate) {
  if (typeof predicate !== 'function') {
    throw new TypeError('waitForPreducate requires a function');
  } 
  
  function promiseToWaitForPredicate() {
    // @todo use max parameter 
    // so this doesn't hang if the service fails to start or drain
    return util.waitFor(predicate, SERVICE_POLL_DELAY);   
  } 
  return promiseToWaitForPredicate;
}
