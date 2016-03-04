daemons
=======

This directory contains daemons which in this context means "things that
use `setInterval`".  Each daemon should be a function that returns a
stop function.  They are implicitly singletons, should a case arise that
requires non-singleton daemons we can adapt then.