'use strict';

const COMMAND = 'ssh',
  USER = 'ec2-user@',
  FLAG_PORT = '-p',
  BASE_SSH_ARGS = [
    '-oStrictHostKeyChecking=no', '-oUserKnownHostsFile=/dev/null'];

var cproc = require('./child-process');

/**
 * ssh's as ec2-user
 * @param {string} host
 * @param {string=} port
 * @returns {Q.Promise}
 */
function shell(host, port) {
  host = USER + host;
  var args = port ? [FLAG_PORT, port, host] : [host];
  return cproc.inherit(COMMAND,
    args.concat(BASE_SSH_ARGS), { stdio: 'inherit' });
}


module.exports = {
  shell
};