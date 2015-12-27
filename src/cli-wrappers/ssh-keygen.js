'use strict';

const COMMAND = 'ssh-keygen';

const path = require('path'),
  fs = require('fs'),
  Q = require('q');

var cproc = require('./child-process');

var readFile = Q.nbind(fs.readFile, fs),
  writeFile = Q.nbind(fs.writeFile, fs);

function movePublicKey(from, to) {
  return readFile(from).then((contents) => {
    return writeFile(to, contents);
  });
}

/**
 * @todo replace this with `os.homedir()`?
 * https://nodejs.org/api/os.html#os_os_homedir
 * @returns {string}
 */
function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/**
 * @param {string} keyname
 * @param {string} publicPath
 * @returns {Q.Promise}
 */
function keygen(keyname, publicPath) {
  if (!keyname || !publicPath) {
    throw new TypeError('ssh-keygen requires a target path, and name');
  }
  publicPath = path.join(publicPath, keyname + '.pub');
  keyname = path.join(getUserHome(), '.ssh', keyname);
  return cproc.inherit(COMMAND, ['-f', keyname], { stdio: 'inherit' })
    .then(() => movePublicKey(`${keyname}.pub`, publicPath));
}

module.exports = keygen;
