cli
===

This directory contains a file called `cli-api.js` which has the yargs
interface in it.  The rest of the folder is either middlewares or 
endware.  The middlewares process CLI arguments passed in from yargs.
The endwares pass STDIO to another process.

There is a better system for middlewares that makes them more efficient
but it needs to be planned.