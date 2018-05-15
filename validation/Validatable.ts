export class Validatable
{
	// static mixin<T>(type: T): T {
	// 	return <any>(class extends (type as any) {
	//
	// 	});
	// }

	constructor()
	{
		// Does Model implement validate() method?
		if (!("validate" in this.constructor.prototype))
		{
			throw new Error(`Validatable.validate() not implemented in '${this.constructor.name}'.`);
		}
	}
}

// export class Validatable extends _Validatable { }