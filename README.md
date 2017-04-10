# JumboJS
Modern fast enterprise level MVC framework for Node.js

!! Under development !!

Questions, troubles, feedback?
https://gitter.im/JumboJS

## DOCS
Watch docs [here](https://hookyns.github.io/JumboJS-docs/)

Docs not completed yet.

## Main Features of JumboJS
- No requires! Global lazy-loading namespace exists,
- integrated Node.js clustering - multi core / CPU support,
- advanced variable routing system (just one route enough for most apps),
- integrated Inversion of Control - constructor Dependency Injection,
- code can be changed while runtime,
- unexpected errors are catched and logged, then process is restarted,
- fully configurable logging with log levels,
- subdomains! More "modules" in one application accessible via subdomains,
- a lot of things integrated but changeable thanks to Adapters,
- code-first ORM with migrations (or MongoDB? or same wrap over all?) (soon),
- sessions stored on disk and in memory for faster access,
- integrated email sender (soon),
- native async & await support,
- high performance - 2 900 requests per second with one worker (2,33 GHz core),
- low dependecy - just few packages from 3rd party, it means that everything is made right for JumboJS

## Instalation
Use [jumbo-developer](https://www.npmjs.com/package/jumbo-developer) package to create project! Project
must have specific structure but this core does NOT create that structure. 
You can create structure on your own (see docs) but you'll just waste time.

Install jumbo-developer tool via npm.
```
npm install jumbo-developer -g
```

Run jumbo-developer from console.

```
jumbo-developer
```

It will ask you for your project directory, so enter your project directory and press ENTER.
Then write 
```
create project
```
and you'll have base project (default from jumbo-developer template which you can change) in directory you specified earlier.

Go to your project directory and run application.
```
node app.js
```
Application will run on port 80 by default. You can change it in app.js.

See docs for more information.
