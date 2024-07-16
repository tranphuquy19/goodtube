// Parse GET parameters
export function goodTube_helper_parseGetParams(): Record<string, any> {
	let getParams: Record<string, any> = {};

	document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
		function decode(s: string): string {
			return decodeURIComponent(s.split("+").join(" "));
		}

		getParams[decode(arguments[1])] = decode(arguments[2]);
		return ""; // This is necessary to avoid errors in IE
	});

	return getParams;
}
