# TODO
- security (anti-forgery tokens to form, ...)
	- https://www.npmjs.com/package/csrf
- validators
- HTTP cache (+ etag)
- email sender
- separate Dependency Injection 
	- framework will be able to resolve classes just with parameter-less constructors; if class has parameter framework will request some handler fo resolving that dependency
- add data generator using https://www.npmjs.com/package/faker
- take view process out of Aplication => create ViewEngine
- create form generator oo-form (ObjectOrientedForm)
	- Form.text("name", "value", el => el.attr("title", "Some title value").attr("alt", "Another attr").addClass("css-class")
	- Form.select("select-name", \[value], )

- Validátory přímo v entitách, aby bylo možné rovnou cpát data do entity bez nějakých mezikroků, IFování aj.
	- Validator.getErrors()
		- \[ { name: "field name", error: ""} ]
		
- Pagination plugin, server side rendered (uJumbo should work well with this)