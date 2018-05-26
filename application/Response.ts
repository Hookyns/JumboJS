/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode) {
	console.log("[DEBUG] REQUIRE: Response");
}

//region Imports

import * as $http from "http";

//endregion

/**
 * Class encapsulating basic http.ServerResponse
 * @memberOf Jumbo.Application
 */
export class Response
{
	//region Fields

	/**
	 * Original response from http server
	 */
	response: $http.ServerResponse;

	/**
	 * Response headers
	 */
	headers: { [headerProp: string]: any } = {"Content-Type": "text/html"};

	// /**
	//  * Set from application after request
	//  */
	// private request: Request;

	//endregion

	//region Ctors

	/**
	 * @param response
	 * @constructs
	 */
	constructor(response: $http.ServerResponse)
	{
		this.response = response;
	}

	//endregion

	//region Public methods

	/**
	 * Set specific cookie
	 * @param {string} name Cokie name
	 * @param {string} value Cookie value
	 * @param {Number} [expire] Expiration in seconds
	 * @param {String} [domain] Domain
	 * @param {String} [path] Path
	 */
	setCookie(name: string, value: string, expire?: number, domain?: string, path?: string)
	{
		let cookies = this.headers["Set-Cookie"] || [];
		let newCookie: string = name + "=" + value + ";";

		if (expire)
		{
			let expdate = new Date();
			expdate.setTime(expdate.getTime() + expire * 1000);
			newCookie += "expires=" + expdate.toUTCString() + ";";
		}

		if (domain)
		{
			newCookie += "domain=" + domain + ";";
		}

		if (path)
		{
			newCookie += "path=" + path + ";";
		}

		cookies.push(newCookie);
		this.headers["Set-Cookie"] = cookies;
	}

	/**
	 * Delete cookie with given name
	 * @param name
	 */
	unsetCookie(name: string)
	{
		let cookies = this.headers["Set-Cookie"] || [];
		cookies.push(name + "=deleted; $path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT");
		this.headers["Set-Cookie"] = cookies;
	}

	// /**
	//  * Redirect to given application URL
	//  * @param {(url: Url) => Url} urlBuilder
	//  */
	// redirect(urlBuilder: (url: Url) => Url) {
	// 	this.redirectUrl(urlBuilder(new Url(this.request)).getUrl());
	// }

	/**
	 * Redirect to given URL string
	 * @param {string} url
	 * @param {number} code
	 */
	redirectUrl(url: string, code: number = 302)
	{
		this.headers["Location"] = url;
		this.headers["Content-Length"] = 0;
		this.response.writeHead(code, this.headers);
		this.response.end();
	}

	//endregion
}

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Response END");
}