export function goodTube_helper_hideElement(element: HTMLElement) {
	if (element && !element.classList.contains('goodTube_hidden')) {
		element.classList.add('goodTube_hidden');
	}
}
