#!/usr/bin/env node

'use strict';

/** @todo get this from settings */
const API = '0.0.1';

const yargs = require('yargs');

require(`../lib/api/${API}/cli/cli-api`)(yargs);

