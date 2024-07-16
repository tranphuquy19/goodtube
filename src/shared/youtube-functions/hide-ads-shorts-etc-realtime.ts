import { goodTube_helper_hideElement } from "../helpers/hide-element";

// Hide ads, shorts, etc - real time
export function goodTube_youtube_hideAdsShortsEtc_realTime() {
	// If we're on a channel page, don't hide shorts
	if (window.location.href.indexOf('@') !== -1) {
		return;
	}

	// Hide shorts links
	let shortsLinks = document.querySelectorAll<HTMLAnchorElement>('a:not(.goodTube_hidden)');
	shortsLinks.forEach((element) => {
		if (element.href.indexOf('shorts/') !== -1) {
			goodTube_helper_hideElement(element);
			const videoRenderer = element.closest<HTMLElement>('ytd-video-renderer');
			const compactVideoRenderer = element.closest<HTMLElement>('ytd-compact-video-renderer');
			const richGridMedia = element.closest<HTMLElement>('ytd-rich-grid-media');

			if (videoRenderer) {
				goodTube_helper_hideElement(videoRenderer);
			}
			if (compactVideoRenderer) {
				goodTube_helper_hideElement(compactVideoRenderer);
			}
			if (richGridMedia) {
				goodTube_helper_hideElement(richGridMedia);
			}
		}
	});
}
