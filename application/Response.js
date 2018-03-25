"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Response");
}
class Response {
    constructor(response) {
        this.headers = { "Content-Type": "text/html" };
        this.response = response;
    }
    setCookie(name, value, expire, domain, path) {
        let cookies = this.headers["Set-Cookie"] || [];
        let newCookie = name + "=" + value + ";";
        if (expire) {
            let expdate = new Date();
            expdate.setTime(expdate.getTime() + expire * 1000);
            newCookie += "expires=" + expdate.toUTCString() + ";";
        }
        if (domain) {
            newCookie += "domain=" + domain + ";";
        }
        if (path) {
            newCookie += "$path=" + path + ";";
        }
        cookies.push(newCookie);
        this.headers["Set-Cookie"] = cookies;
    }
    unsetCookie(name) {
        let cookies = this.headers["Set-Cookie"] || [];
        cookies.push(name + "=deleted; $path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT");
        this.headers["Set-Cookie"] = cookies;
    }
    redirectUrl(url, code = 302) {
        this.headers["Location"] = url;
        this.headers["Content-Length"] = 0;
        this.response.writeHead(code, this.headers);
        this.response.end();
    }
}
exports.Response = Response;
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Response END");
}
//# sourceMappingURL=Response.js.map