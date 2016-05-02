'use strict';

var setup = require('./setup');

const util = require(setup.path('util'));
const Task = require(setup.path('aws', 'ecs', 'task-definitions', 
  'task-definitions'));

module.exports = Task.bindAws({
  ecs: util.makePromiseApi(setup.getEcs()),
  vpcId: setup.testVPC
});
