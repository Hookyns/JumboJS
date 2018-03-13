function constructRequestHeaderHtml(headers) {
	let result = "";
	for (let header in headers) {
		if (headers.hasOwnProperty(header)) {
			result += `<b>${header}</b>: ${headers[header]}<br>`;
		}
	}

	return result;
}

module.exports = function (message, ex, status, request) {
	return (`<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
				<title>Server error ${status}</title>
				<style>
					* {
						box-sizing: border-box;
					}
					body {
						padding: 0 20px 20px 20px;
						background: #fff;
						color: #333;
					}
					h1, h2 {
						
						font-family: Arial, Tahoma, sans-serif;
						font-weight: normal;
					}
					code, pre {
						display: block;
						border: 1px solid #888;
						padding: 10px;
						background: #fbf9f3;
					}
				</style>
			</head>
			<body>
				<h1 style="color: #c54242;">Server error ${status}</h1>
				<p><strong>${message}</strong></p>
				<h2>Stack</h2>
				<pre>${ex.stack}</pre>
				<h2>Request</h2>
				<code>
					${constructRequestHeaderHtml(request.headers)}
				</code>
			</body>
		</html>`);
};