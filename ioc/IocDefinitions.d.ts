declare interface IRegisteredTypeInfo {
	expr: any;
	isExpr: boolean
	params: Array<string>, // Parameters (args names); Will be filled after first resolve,
	scope: string,
	instance: object, // Will be filled after first resolve if scope is SingleInstance
	injectablePropertie: null | {[property: string/* | Symbol*/]: string} | false,
}