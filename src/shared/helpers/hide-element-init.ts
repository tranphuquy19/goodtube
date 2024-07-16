// Hide or show an element (without Youtube knowing)
export function goodTube_helper_hideElement_init(): void {
	let style = document.createElement('style');
	style.textContent = `
			.goodTube_hidden {
				position: fixed !important;
				top: -9999px !important;
				left: -9999px !important;
				transform: scale(0) !important;
				pointer-events: none !important;
			}
		`;

	document.head.appendChild(style);
}
