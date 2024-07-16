// Remove that annoying "Are you still watching" prompt
export function goodTube_youtube_areYouStillWatching() {
	let confirmButtons = document.querySelectorAll<HTMLButtonElement>('tp-yt-paper-dialog #confirm-button:not(.goodTube_clicked)');
	confirmButtons.forEach((confirmButton) => {
		confirmButton.classList.add('goodTube_clicked');
		confirmButton.click();

		// Allow it to be clicked multiple times, you might be watching all day!
		setTimeout(function () {
			confirmButton.classList.remove('goodTube_clicked');
		}, 1000);
	});
}
