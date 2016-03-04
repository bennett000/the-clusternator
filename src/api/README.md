api
===

This folder contains versioned copies of _external_ facing APIs this
includes:

- CLI command line interface API 
- js API when Clusternator is exposed as a module and as a facade for
other external APIs to use
- project FS the local project file system.  These modules control what
goes where in a local git repo
- REST is the API used by a Clusternator client, like the CLI

Generally speaking these files should have as _little_ logic as possible
