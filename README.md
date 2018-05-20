# JumboJS 
[![NPM version](https://img.shields.io/npm/v/jumbo-core.svg?colorB=green)](https://www.npmjs.com/package/jumbo-core) 
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Gitter chat](https://badges.gitter.im/JumboJS/Lobby.svg)](https://gitter.im/JumboJS/Lobby)

Modern lightweight fast enterprise level MVW framework for Node.js

! Under development, but ready to use !

## DOCS
Watch docs [here](https://hookyns.github.io/JumboJS-docs/)

Docs not completed yet.

## Main Features of JumboJS
- No requires hell! Global lazy-loading namespace exists,
- integrated Node.js clustering - multi core / CPU support,
- advanced variable routing system (just one route enough for most apps),
- integrated Inversion of Control - constructor Dependency Injection,
- code can be changed while runtime,
- unexpected errors are catched and logged, then process will be restarted,
- client-side micro framework automatically creating SPA without any client-side programming (does not replace client frameworks) (soon),
- fully configurable logging with log levels,
- subdomains! More "modules" in one application accessible via subdomains,
- a lot of things integrated but changeable thanks to Adapters,
- code-first ORM/ODM with migrations (under development [UniMapperJS](https://github.com/Hookyns/unimapperjs)),
- sessions stored on disk and in memory for faster access,
- model (DTO, forms) validators (soon),
- integrated email sender (soon),
- native async & await support,
- high performance, ~3 900 requests per second with one worker (2,33 GHz core),
- low dependecy,
- integrated globalization.

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
npm start
```
Application will run on port 80 by default. You can change it in app.js.

See docs for more information.
