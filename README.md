# THE CLUSTERNATOR

#### Install the `clusternator` CLI

```
npm install -g clusternator
```

Check and see if it installed successfully

```
clusternator --help
```

#### [Local Setup](docs/setup.md)
#### [Network Configuration](docs/network.md)
#### [Deploying & Caveats](docs/deploy.md)


## App Definition File

This is the _hard part_ (kinda, not really). The application definition file
(which we will call `appdef.json`) is a JSON file which specifies the following
details about how to run your application:

- Docker images running
- Environment variables
- Links between containers
- Physical -> virtual port mappings
- Data volumes and their physical mount points
  (hard drives, can share between containers)
- CPU and RAM on the physical EC2 instance

You can create an `appdef.json` by running `clusternator app:new > appdef.json`.
More information about the parameters can be found at
http://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
 

## Developing Clusternator

_yay contributions!_

All code is in `src/`. The CLI entry point is `bin/clusternatorCli.js`,
but includes from `lib/` (the compile destination).


`bin/clusternatorCli-es5.js` is ultimately what gets run as the CLI
from `bin/clusternator.sh`.


#### Compile ES6

TODO setup watchers

`npm run build` will transform your ES6 source into ES5

#### Running the clusternator CLI

Run `./bin/clusternator.sh` from the root directory.



# License

Copyright (c) 2015, rangle.io
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
