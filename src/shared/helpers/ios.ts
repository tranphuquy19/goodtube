// Are you on iOS?
export function goodTube_helper_iOS() {
	return [
		'iPad Simulator',
		'iPhone Simulator',
		'iPod Simulator',
		'iPad',
		'iPhone',
		'iPod'
	].includes(navigator.platform)
		|| (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
