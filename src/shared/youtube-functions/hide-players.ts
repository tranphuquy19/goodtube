import { goodTube_helper_hideElement } from "../helpers";

export function goodTube_helper_hideElement(element: HTMLElement) {
	if (element && !element.classList.contains('goodTube_hidden')) {
		element.classList.add('goodTube_hidden');
	}
}


// Hide all Youtube players
export function goodTube_youtube_hidePlayers() {
	// Hide the normal Youtube player
	let regularPlayers = document.querySelectorAll<HTMLElement>('#player:not(.ytd-channel-video-player-renderer):not(.goodTube_hidden)');
	regularPlayers.forEach((element) => {
		goodTube_helper_hideElement(element);
	});

	// Hide the mobile controls
	let mobileControls = document.querySelectorAll<HTMLElement>('#player-control-container:not(.goodTube_hidden)');
	mobileControls.forEach((element) => {
		goodTube_helper_hideElement(element);
	});

	// Remove the full screen Youtube player
	let fullscreenPlayers = document.querySelectorAll<HTMLElement>('#full-bleed-container:not(.goodTube_hidden)');
	fullscreenPlayers.forEach((element) => {
		goodTube_helper_hideElement(element);
	});

	// Hide the Youtube miniplayer
	let miniPlayers = document.querySelectorAll<HTMLElement>('ytd-miniplayer:not(.goodTube_hidden)');
	miniPlayers.forEach((element) => {
		goodTube_helper_hideElement(element);
	});

	// Turn off autoplay
	let autoplayButton: Element | null = null;

	// Desktop
	if (!goodTube_mobile) {
		autoplayButton = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');

		// Turn off the youtube autoplay button
		if (autoplayButton instanceof HTMLElement) {
			autoplayButton.click();
		}
	}
	// Mobile
	else {
		autoplayButton = document.querySelector('.ytm-autonav-toggle-button-container[aria-pressed="true"]');

		// Turn off the youtube autoplay button
		if (autoplayButton) {
			autoplayButton.click();
		}
		// Click the player a bit, this helps to actually make the autoplay button show (after ads)
		else {
			document.querySelector('#player .html5-video-player')?.click();
			document.querySelector('#player')?.click();
			document.querySelector('.ytp-unmute')?.click();
		}
	}
}
