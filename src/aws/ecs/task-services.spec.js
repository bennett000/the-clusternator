'use strict';

const Q = require('q');
const rewire = require('rewire');

const ts = rewire('./task-services');
const C = require('../../chai');
const checkAsync = C.checkAsync;

const aws = {};

let oldWaitFor;

const CALLED = {
  createService: 'createService',
  deleteService: 'deleted',
};

function initData() {
  oldWaitFor = ts.__get__('util.waitFor');
  ts.__set__('util.waitFor', () => Q.resolve('waitFor'));
  aws.ecs = {
    createService: () => Q.resolve({service: CALLED.createService}),
    describeServices: () => Q.resolve(
      {services: [{taskDefinition: 'mytaskdef'}]}),
    deleteService: () => Q.resolve(true),
    listServices: () => Q.resolve({serviceArns: ['myservice']}),
    updateService: (updateObj) => Q.resolve({service: updateObj}),

    registerTaskDefinition: () => Q.resolve(
      {taskDefinition: {taskDefinitionArn: true}})
  };
}

function resetData() {
  ts.__set__('util.waitFor', oldWaitFor); 
}

/*global describe, it, expect, beforeEach, afterEach */
describe('AWS: ECS: Task Services', () => {
  
  beforeEach(initData);
  afterEach(resetData);

  describe('create function', () => {
    it('should call ecs.createService', checkAsync(
      ts.helpers.create(aws, 'mycluster', 'myservice', 'mytaskdef'),
      (r) => expect(r).to.equal(CALLED.createService)
    ));

    it('should throw without clusterArn', () => {
      expect(
        () => ts.helpers.create(aws, null, 'myservice', {taskDefinition: {}})
      ).to.throw(TypeError);
    });

    it('should throw without serviceArn', () => {
      expect(
        () => ts.helpers.create(aws, 'mycluster', null, {taskDefinition: {}})
      ).to.throw(TypeError);
    });

    it('should throw without taskDef', () => {
      expect(() => ts.helpers.create(aws, 'mycluster', 'myservice', null))
        .to.throw(TypeError);
    });
  });

  describe('findOrCreate function', () => {
    it('should return found service', checkAsync(
      ts.create(aws, 'mycluster', 'myservice', 'mytaskdef'),
      (r) => expect(r).to.deep.equal({taskDefinition: 'mytaskdef'})
    ));

    it('should create new service when none exist', checkAsync(
      () => {
        aws.ecs.describeServices = () => Q.resolve({services: []});
        return ts.create(aws, 'mycluster', 'myservice', 'mytaskdef')();
      },
      (r) => expect(r).to.equal(CALLED.createService)
    ));
  });

  describe('checkForInactive', () => {
    it('should return true if service is inactive', () => {
      const isInactive = ts.helpers
        .checkForInactive([{status: 'INACTIVE'}]);
      expect(isInactive).to.be.true;
    });
    
    it('should return false if given no input', () => {
      const isInactive = ts.helpers
        .checkForInactive();
      expect(isInactive).to.be.false;
    }); 

    it('should return false if service is active', () => {
      const isInactive = ts.helpers
        .checkForInactive([{status: 'SOMETHING_ELSE'}]);
      expect(isInactive).to.be.false;
    }); 
  });

  describe('createTaskAndService function', () => {
    let oldWaitForReady;
    let oldCreate;
    let oldTaskDefinitions;
    
    beforeEach(() => {
      oldCreate = ts.__get__('create');
      oldTaskDefinitions = ts.__get__('taskDefinitions');
      oldWaitForReady = ts.__get__('waitForReady');
      ts.__set__('create', () => () => Q.resolve({ 
        cluster: 'cluster',
        serviceArn: 'serviceArn'
      }));
      ts.__set__('taskDefinitions', { create: () => () => Q.resolve({
        taskDefinitionArn: 'arn'
      }) });
      ts.__set__('waitForReady', () => () => Q.resolve('ready'));
    });
    
    afterEach(() => {
      ts.__set__('create', oldCreate);   
      ts.__set__('taskDefinitions', oldTaskDefinitions);
      ts.__set__('waitForReady', oldWaitForReady);
    });
    
    it('should throw without clusterArn', () => {
      expect(() => ts.createTaskAndService(aws, null, 'myservice', {}))
        .to.throw(TypeError);
    });

    it('should throw without serviceName', () => {
      expect(() => ts.createTaskAndService(aws, 'mycluster', null, {}))
        .to.throw(TypeError);
    });

    it('should throw without task', () => {
      expect(() => ts
        .createTaskAndService(aws, 'mycluster', 'myservice', null))
        .to.throw(TypeError);
    });
    
    it('should return a function', () => {
      expect(typeof ts.createTaskAndService(aws, 'myCluster', 'myService', {}))
        .to.equal('function'); 
    });
    
    it('should resolve waitForReady', checkAsync(
      ts.createTaskAndService(aws, 'cluster', 'service', {}),
      (r) => expect(r).to.equal('ready')
    ));
  });

  describe('createTasksAndServices function', () => {
    let oldCreateTasksAndService;

    beforeEach(() => {
      oldCreateTasksAndService = ts.__get__('createTaskAndService');
      ts.__set__('createTaskAndService', () => () => Q.resolve('created'));
    });

    afterEach(() => {
      ts.__set__('createTaskAndService', oldCreateTasksAndService);
    });
    
    it('should throw without clusterArn', () => {
      expect(() => ts
          .createTasksAndServices(aws, null, 'myservice', {tasks: []}))
        .to.throw(TypeError);
    });

    it('should throw without serviceName', () => {
      expect(() => ts
          .createTasksAndServices(aws, 'mycluster', null, {tasks: []}))
        .to.throw(TypeError);
    });

    it('should throw without appDef', () => {
      expect(() => ts
          .createTasksAndServices(aws, 'mycluster', 'myservice', null))
        .to.throw(TypeError);
    });
    
    it('should throw without appDef tasks property', () => {
      expect(() => ts
        .createTasksAndServices(aws, 'mycluster', 'myservice', {}))
        .to.throw(TypeError);
    });
    
    it('should resolve createTasksAndService', checkAsync(
      ts.createTasksAndServices(aws, 'cluster', 'service', { tasks: [] }),
      (r) => expect(r).to.deep.equal([])
    ));
    
    it('should resolve createTasksAndService with values', checkAsync(
      ts.createTasksAndServices(aws, 'cluster', 'service', { tasks: [
        'sampleTask'
      ]}),
      (r) => expect(r).to.deep.equal(['created'])
    ));
  });

  describe('findAndDestroy function', () => {
    let oldDescribeMany;
    let oldDestroy;
    const results = [];
    
    beforeEach(() => {
      while (results.length) { results.pop(); }
      oldDescribeMany = ts.__get__('describeMany');
      oldDestroy = ts.__get__('destroy');
      ts.__set__('describeMany', () => () => Q.resolve(results));
      ts.__set__('destroy', () => () => Q.resolve('destroy'));
    });
    
    afterEach(() => {
      ts.__set__('describeMany', oldDescribeMany);
      ts.__set__('destroy', oldDestroy); 
    });
    
    it('should resolve "already deleted" if the service does not exist', 
      checkAsync(
        ts.destroy(aws, 'cluster', 'service'),
        (r) => expect(r).to.equal('already deleted')
      ));
    
    it('should resolve if it actually has to delete', (done) => {
      results.push('service');
      ts.destroy(aws, 'cluster', 'service')()
        .then((r) => C.check(done, () => expect(r).to.equal('destroy')))
        .fail(C.getFail(done));
    });
  });

  describe('describe function', () => {
    it('should call ecs.listServices, followed by ecs.describeServices',
      checkAsync(
        ts.describe(aws, 'mycluster'),
        (r) => expect(r).to.deep.equal([{taskDefinition: 'mytaskdef'}])
      )
    );

    it('should throw without clusterArn', () => {
      expect(() => ts.describe(aws, null))
        .to.throw(TypeError);
    });
  });

  describe('describeMany function', () => {
    it('should call ecs.describeServices', checkAsync(
      ts.describeMany(aws, 'mycluster', ['myservice']),
      (r) => expect(r).to.deep.equal([{taskDefinition: 'mytaskdef'}])
    ));

    it('should throw without clusterArn', () => {
      expect(() => ts.describeMany(aws, null, ['myservice']))
        .to.throw(TypeError);
    });

    it('should throw without serviceArns', () => {
      expect(() => ts.describeMany(aws, 'mycluster', []))
        .to.throw(TypeError);
    });
  });

  describe('destroy function', () => {
    it('should call ecs.deleteService', checkAsync(
      ts.helpers.destroy(aws, 'mycluster', 'myservice'),
      (r) => expect(r).to.equal(CALLED.deleteService)
    ));

    it('should throw without clusterArn', () => {
      expect(() => ts.helpers.destroy(aws, null, 'myservice'))
        .to.throw(TypeError);
    });

    it('should throw without serviceArn', () => {
      expect(() => ts.helpers.destroy(aws, 'mycluster', null))
        .to.throw(TypeError);
    });
  });

  describe('getStatus function', () => {
    it('should return -1 without arguments', () => {
      const status = ts.helpers.getStatus();
      expect(status).to.equal(-1);
    });

    it('should return 0 when service has steady state event ', () => {
      const service = {
        events: [{message: 'steady state'}]
      };

      const status = ts.helpers.getStatus([service]);
      expect(status).to.equal(0);
    });

    it('should return 1 when service has no steady state event', () => {
      const service = {
        events: [{message: ''}]
      };

      const status = ts.helpers.getStatus([service]);
      expect(status).to.equal(1);
    });
  });

  describe('list function', () => {
    it('should call ecs.listServices', checkAsync(
      ts.list(aws, 'mycluster'),
      (r) => expect(r).to.be.ok
    ));

    it('should throw without clusterArn', () => {
      expect(() => ts.list(aws, null))
        .to.throw(TypeError);
    });
  });

  describe('processDescription function', () => {
    it('should return null if given invalid input', () => {
      expect(ts.helpers.processDescription()).to.equal(null);
    });
    
    it('should process a service object', () => {
      const service = {
        serviceArn: 'myservice',
        clusterArn: 'mycluster',
        youshouldnt: 'see this',
        events: [{message: ''}]
      };
      const processed = {
        serviceArn: 'myservice',
        lastEvent: ''
      };
      expect(ts.helpers.processDescription(service))
        .to.deep.equal(processed);
    });
  });

  describe('processDescriptions function', () => {
    it('should process array of service objects', () => {
      const service = {
        serviceArn: 'myservice',
        clusterArn: 'mycluster',
        youshouldnt: 'see this',
        events: [{message: ''}]
      };
      const processed = {
        serviceArn: 'myservice',
        lastEvent: ''
      };
      expect(ts.helpers.processDescriptions([service]))
        .to.deep.equal([processed]);
    });
  });

  describe('stop function', () => {
    it('should update service with desiredCount = 0', checkAsync(
      ts.stop(aws, 'mycluster', 'myservice'),
      (r) => expect(r).to.have.property('desiredCount', 0)
    ));

    it('should throw without clusterArn', () => {
      expect(() => ts.stop(aws, null, 'myservice'))
        .to.throw(TypeError);
    });

    it('should throw without serviceArn', () => {
      expect(() => ts.stop(aws, 'mycluster', null))
        .to.throw(TypeError);
    });
  });

  describe('stopAndDestroy function', () => {
    let oldDestroy;
    
    beforeEach(() => {
      oldDestroy = ts.__get__('destroy');
      ts.__set__('destroy', () => Q.resolve('destroy'));
    });
    
    afterEach(() => ts.__set__('destroy', oldDestroy));
    
    it('should throw without a cluster', () => {
      expect(() => ts.stopAndDestroy(aws)).to.throw(TypeError);
    });

    it('should throw without a service', () => {
      expect(() => ts.stopAndDestroy(aws, 'cluster')).to.throw(TypeError);
    });
    
    it('should return a function', () => {
      expect(typeof ts.stopAndDestroy(aws, 'cluster', [])).to.equal('function');
    });
    
    it('should resolve destroy', checkAsync(
      ts.stopAndDestroy(aws, 'cluster', []),
      (r) => expect(r).to.equal('destroy')
    ));
  });

  describe('stopAndDestroyCluster function', () => {
    let oldStopAndDestroy;
    let oldWaitForDrained;

    beforeEach(() => {
      oldWaitForDrained = ts.__get__('waitForDrained');
      oldStopAndDestroy = ts.__get__('stopAndDestroy');
      ts.__set__('stopAndDestroy', () => () => Q.resolve());
      ts.__set__('waitForDrained', () => () => Q.resolve('drained'));
    });

    afterEach(() => {
      ts.__set__('stopAndDestroy', oldStopAndDestroy); 
      ts.__set__('waitForDrained', oldWaitForDrained);
    });

    it('should throw without a cluster', () => {
      expect(() => ts.stopAndDestroyCluster()).to.throw(TypeError);
    });
    
    it('should resolve if its dependent promises resolve', checkAsync(
      ts.stopAndDestroyCluster(aws, 'cluster'),
      (r) => expect(r).to.equal('drained')
    ));
  });
  
  describe('waitForPredicate function', () => {
    it('should throw without a predicate function', () => {
      expect(() => ts.waitForPredicate('non function')).to.throw(TypeError);
    });
    
    it('should resolve with util.waitFor', checkAsync(
      ts.waitForPredicate(() => {}),
      (r) => expect(r).to.equal('waitFor')
    ));
  });

  describe('waitForDrained function', () => {
    it('should throw without a services object', () => {
      expect(() => ts.waitForDrained(aws, 'cluster')).to.throw(TypeError);
    });

    it('should throw without a cluster name', () => {
      expect(() => ts.waitForDrained(aws, undefined, {})).to.throw(TypeError);
    });
    
    it('should return a function', () => {
      const fn = ts.waitForDrained(aws, 'cluster', {});
      expect(typeof fn).to.equal('function');
    });
  });
  
  describe('waitForReady function', () => {
    it('should throw without a services object', () => {
      expect(() => ts.waitForReady(aws, 'cluster')).to.throw(TypeError);
    });

    it('should throw without a cluster name', () => {
      expect(() => ts.waitForReady(aws, undefined, {})).to.throw(TypeError);
    });
    
    it('should return a function', () => {
      const fn = ts.waitForReady(aws, 'cluster', {});
      expect(typeof fn).to.equal('function');
    });
  });
  

  describe('resolveIfDrained function', () => {
    const services = [{ status: 'INACTIVE' }];

    let oldDescribeMany;

    beforeEach(() => {
      oldDescribeMany = ts.__get__('describeMany');
      ts.__set__('describeMany', (a, b, c) => () => Q.resolve(c));
    });

    afterEach(() => ts.__set__('describeMany', oldDescribeMany));

    it('should throw without a services object', () => {
      expect(() => ts.resolveIfDrained(aws, 'cluster')).to.throw(TypeError);
    });

    it('should throw without a cluster name', () => {
      expect(() => ts.resolveIfDrained(aws, undefined, {})).to.throw(TypeError);
    });
    
    it('should return a function', () => {
      const fn = ts.resolveIfDrained(aws, 'cluster', {});
      expect(typeof fn).to.equal('function');
    });
    
    it('should resolve if service is drained', checkAsync(
      ts.resolveIfDrained(aws, 'cluster', services),
      (r) => expect(r).to.equal(undefined)
    ));
  });
  
  describe('resolveIfReady function', () => {
    const services = [{ events: [{
      message: 'has reached a steady state!!!'
    }]}];
    
    let oldDescribeMany;
    
    beforeEach(() => {
      oldDescribeMany = ts.__get__('describeMany');
      ts.__set__('describeMany', (a, b, c) => () => Q.resolve(c));
    });
    
    afterEach(() => ts.__set__('describeMany', oldDescribeMany));
    
    it('should throw without a services object', () => {
      expect(() => ts.resolveIfReady(aws, 'cluster')).to.throw(TypeError);
    });
    
    it('should throw without a cluster name', () => {
      expect(() => ts.resolveIfReady(aws, undefined, {})).to.throw(TypeError);
    });
    
    it('should return a function', () => {
      const fn = ts.resolveIfReady(aws, 'cluster', {});
      expect(typeof fn).to.equal('function');
    });
    
    it('should resolve if service is ready', checkAsync(
      ts.resolveIfReady(aws, 'cluster', services),
      (r) => expect(r).to.deep.equal(services)
    ));
  });

  describe('throwIfNotReady function', () => {
    it('should throw if services are malformed', () => {
      expect(() => ts.helpers.throwIfNotReady({})).to.throw(Error);
    }); 
    
    it('should throw if service is not steady', () => {
      expect(() => ts.helpers.throwIfNotReady([{ events: [{ 
        message: 'not steady' 
      }]}])).to.throw(Error);
    });

    it('should *not* throw if service is steady', () => {
      expect(() => ts.helpers.throwIfNotReady([{ events: [{
        message: 'has reached a steady state!!!'
      }]}])).to.not.throw(Error);
    });
  });

  describe('throwIfNotDrained function', () => {
    it('should throw if services are malformed', () => {
      expect(() => ts.helpers.throwIfNotDrained({})).to.throw(Error);
    });
    
    it('should throw if services are not inactive', () => {
      expect(() => ts.helpers.throwIfNotDrained([{ status: 'actice' }]))
        .to.throw(Error);
    });
    
    it('should not throw if services are inactive', () => {
      expect(() => ts.helpers.throwIfNotDrained([{ status: 'INACTIVE' }]))
        .to.not.throw(Error);
    });
  });

  describe('update function', () => {
    it('should update service with updateObj', checkAsync(
      ts.update(aws, 'mycluster', 'myservice', {stuff: 1}),
      (r) => expect(r).to.deep.equal({
          cluster: 'mycluster',
          service: 'myservice',
          stuff: 1
        })
    ));

    it('should throw without clusterArn', () => {
      expect(() => ts.update(aws, null, 'myservice', {}))
        .to.throw(TypeError);
    });

    it('should throw without serviceArn', () => {
      expect(() => ts.update(aws, 'mycluster', null, {}))
        .to.throw(TypeError);
    });

    it('should throw without updateObj', () => {
      expect(() => ts.update(aws, 'mycluster', 'myservice', null))
        .to.throw(TypeError);
    });
  });
  
  describe('bindAws function', () => {
    it('should partially apply aws to API', checkAsync( 
      ts.bindAws(aws).create('mycluster', 'myservice', 'mytaskdef'),
        (r) => expect(r).to.deep.equal({taskDefinition: 'mytaskdef'})
    ));
  });
});
