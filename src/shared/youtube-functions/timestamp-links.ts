// import { goodTube } from '../../configs';
import { goodTube_player_skipTo } from "../players";

// let { , goodTube_player } = goodTube;

// Support timestamp links in comments
export function goodTube_youtube_timestampLinks(goodTube_getParams: any, goodTube_player: any) {
	// Links in video description and comments
	let timestampLinks = document.querySelectorAll('#description a, ytd-comments .yt-core-attributed-string a, ytm-expandable-video-description-body-renderer a, .comment-content a');

	// For each link
	timestampLinks.forEach((element) => {
		// Make sure we've not touched it yet, this stops doubling up on event listeners
		if (!element.classList.contains('goodTube_timestampLink') && element.getAttribute('href') && element.getAttribute('href')!.indexOf(goodTube_getParams['v']) !== -1 && element.getAttribute('href')!.indexOf('t=') !== -1) {
			element.classList.add('goodTube_timestampLink');

			// Add the event listener to send our player to the correct time
			element.addEventListener('click', function () {
				let bits = element.getAttribute('href')!.split('t=');
				if (bits && typeof bits[1] !== 'undefined') {
					let time = bits[1].replace('s', '');
					goodTube_player_skipTo(goodTube_player, time);
				}
			});
		}
	});
}
