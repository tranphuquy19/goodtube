// Make the youtube player the lowest quality to save on bandwidth
export function goodTube_youtube_lowestQuality() {
	let youtubeFrameAPI = document.getElementById('movie_player') as any;

	if (youtubeFrameAPI && typeof youtubeFrameAPI.setPlaybackQualityRange === 'function' && typeof youtubeFrameAPI.getAvailableQualityData === 'function' && typeof youtubeFrameAPI.getPlaybackQuality === 'function') {
		let qualities = youtubeFrameAPI.getAvailableQualityData();
		let currentQuality = youtubeFrameAPI.getPlaybackQuality();
		if (qualities.length && currentQuality) {
			let lowestQuality = qualities[qualities.length - 1]['quality'];

			if (currentQuality != lowestQuality) {
				youtubeFrameAPI.setPlaybackQualityRange(lowestQuality, lowestQuality);
			}
		}
	}
}
