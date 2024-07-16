// Set a cookie
export function goodTube_helper_setCookie(name: string, value: string): void {
	// 399 days
	document.cookie = name + "=" + encodeURIComponent(value) + "; max-age=" + (399 * 24 * 60 * 60);
}
