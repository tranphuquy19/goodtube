export function goodTube_helper_showElement(element: HTMLElement) {
	if (element && element.classList.contains('goodTube_hidden')) {
		element.classList.remove('goodTube_hidden');
	}
}
