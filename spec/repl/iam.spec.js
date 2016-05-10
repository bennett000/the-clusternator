'use strict';

const R = require('ramda');

var setup = require('./setup');
var util = require(setup.path('util'));
var iam = require(setup.path('aws', 'iam', 'iam.js'));

const partialedIam = R.mapObjIndexed(iamAwsPartial, iam);

function iamAwsPartial(fn) {
  return util.partial(fn, { iam: util.makePromiseApi(setup.getIam()) });
}

module.exports = partialedIam;
