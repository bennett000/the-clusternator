'use strict';

var q = require('q');
var R = require('ramda');
var log = require('winston');
var koa = require('koa');
var route = require('koa-route');
var bodyParser = require('koa-bodyparser');
var MongoClient = require('mongodb').MongoClient;
var wrap = require('mongodb-next').collection;

var clusternator = require('../../clusternator');

var DATABASE = 'clusternator';
var MONGO_URL = 'mongodb://localhost:27017/' + DATABASE;

//var UNIT_TYPE_PR = 'PR';
//var UNIT_TYPE_SHA = 'SHA';
//var UNIT_TYPE_TAG = 'TAG';
//var UNIT_TYPE_BRANCH = 'BRANCH';
//

//var EC2_STATUS_INIT = 'INITIALIZING'; // Still not created on aws
//var EC2_STATUS_BUILDING = 'BUILDING'; // Created on AWS
//var EC2_STATUS_RUNNING = 'RUNNING'; // Running on AWS

function getUnitDB(url) {
  var d = q.defer();

  MongoClient.connect(url, function (err, db) {
    if (err) {
      d.reject(err);
    } else {
      d.resolve(db);
    }
  });

  return d.promise;
}

// Every application exists as a "unit"
// Units contain everything needed to track down the git commit that generated
// an image, and the image itself
function getUnitController(db) {
  var marked1$0 = [addUnitHandler].map(regeneratorRuntime.mark);

  var unitColl = wrap(db.collection('units'));

  function addUnit(unit) {
    var unitID = unit.startTime.valueOf().toString() + '-' + unit.sha.substr(0, 8);

    unit = R.merge(unit, { unitID: unitID });

    return unitColl.insert(unit);
  }

  function newApp(unit) {
    var clusterName = unit.unitID;

    var EC2APIConfig = {
      ClientToken: new Date().valueOf().toString()
    };

    EC2APIConfig.KeyName = unit.keypair;

    var ec2Config = {
      clusterName: clusterName,
      apiConfig: EC2APIConfig
    };

    return clusternator.newApp(clusterName, unit.appDefinition, ec2Config);
  }

  function addUnitHandler() {
    var _this, reqBody, newUnit;

    return regeneratorRuntime.wrap(function addUnitHandler$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          _this = this;
          reqBody = _this.request.body;

          /*
           * We should expect the request body to look like the following:
           *
           * {
           *   ref: 51 | 'tag-name' | 'branch-name',
           *   srcBranch: 'branch-name',
           *   type: 'PR' | 'SHA' | 'TAG' | 'BRANCH', // What does the ref mean?
           *   sha: '03d5895ec17f0f0bc38c1e76ee49ab7e6b0937e1f2193e6ac8f016e73f7e1cf5' // it says 'rangle.io'
           *   task: {}
           * }
           */

          console.log(reqBody);

          if (!(!reqBody.ref || !reqBody.type || !reqBody.sha || !reqBody.user || !reqBody.keypair || !reqBody.srcBranch || !reqBody.appDefinition)) {
            context$2$0.next = 5;
            break;
          }

          throw 'Missing unit arguments';

        case 5:
          newUnit = R.clone(reqBody);

          newUnit.startTime = new Date();

          newUnit.appDefinition = JSON.parse(decodeURIComponent(newUnit.appDefinition));

          //this.state.responseData = newUnit;

          addUnit(newUnit).then(newApp).then(function (x) {
            log.info('new app', x);
          }, function (err) {
            log.error('Error creating app', err.stack);
          });

        case 9:
        case 'end':
          return context$2$0.stop();
      }
    }, marked1$0[0], this);
  }

  return {
    pushUnit: addUnitHandler
  };
}

function createApp(unitController) {
  var app = koa();
  app.use(bodyParser());

  app.on('error', function (err) {
    log.error('server error', err.stack);
  });

  app.use(route.post('/unit', unitController.pushUnit));

  return app;
}

function getServer() {
  return getUnitDB(MONGO_URL).then(getUnitController, q.reject).then(createApp, q.reject);
}

function startServer(config) {
  var port = config.port;

  if (!port) {
    throw 'Server requires port';
  }

  getServer(config).then(function (app) {
    //TODO port var
    app.listen(port);
    log.info('Listening on ' + port);
  }).then(null, function (err) {
    log.error('Error starting server');
    log.error(err);
  });
}

module.exports = {
  startServer: startServer,
  getServer: getServer
};

// TODO standard error messages

// TODO REMOVE EXTRA ARGS