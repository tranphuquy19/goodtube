function goodTube_player_selectApi(url: any, reloadVideoData: any): number {
	let goodTube_automaticServerIndex = 0;

	// Target the source menu
	let menu = document.querySelector('.vjs-source-button .vjs-menu') as HTMLElement | null;

	if (!menu) {
		return;
	}
	// Deselect the currently selected menu items
	let selectedMenuItems = menu.querySelectorAll('.vjs-selected');
	selectedMenuItems.forEach((selectedMenuItem) => {
		selectedMenuItem.classList.remove('vjs-selected');
	});

	// Automatic option
	if (url === 'automatic') {
		// Increment first to skip the first server (which is actually the automatic option itself)
		goodTube_automaticServerIndex++;

		// If we're out of options, show an error
		if (typeof goodTube_apis[goodTube_automaticServerIndex] === 'undefined') {
			goodTube_player_videojs_handleError();
			return;
		}

		// Select the next server
		if (goodTube_apis) {
			return;
		}
		goodTube_api_type = goodTube_apis[goodTube_automaticServerIndex]['type'];
		goodTube_api_proxy = goodTube_apis[goodTube_automaticServerIndex]['proxy'];
		goodTube_api_url = goodTube_apis[goodTube_automaticServerIndex]['url'];
		goodTube_api_name = goodTube_apis[goodTube_automaticServerIndex]['name'];

		// Set cookie to remember we're on automatic
		goodTube_helper_setCookie('goodTube_api_withauto', url);

		// Add class from wrapper for styling automatic option
		let wrapper = document.querySelector('#goodTube_player_wrapper1');
		if (wrapper&& !wrapper.classList.contains('goodTube_automaticServer')) {
			wrapper.classList.add('goodTube_automaticServer');
		}

		// Select the automatic menu item
		let automaticMenuOption = menu.querySelector('ul li:first-child');
		if (automaticMenuOption&& !automaticMenuOption.classList.contains('vjs-selected')) {
			automaticMenuOption.classList.add('vjs-selected');
		}
	}
	// Manual selection
	else {
		goodTube_apis.forEach((api) => {
			if (url == api['url']) {
				goodTube_api_type = api['type'];
				goodTube_api_proxy = api['proxy'];
				goodTube_api_url = api['url'];
				goodTube_api_name = api['name'];

				goodTube_helper_setCookie('goodTube_api_withauto', url);
			}
		});

		// Remove class from wrapper for styling automatic option
		let wrapper = document.querySelector<HTMLElement>('#goodTube_player_wrapper1');
		if (wrapper && wrapper.classList.contains('goodTube_automaticServer')) {
			wrapper.classList.remove('goodTube_automaticServer');
		}

		// Reset the automatic selection
		goodTube_automaticServerIndex = 0;
	}

	// Select the currently selected item
	let menuItems = menu.querySelectorAll('ul li');
	menuItems.forEach((menuItem) => {
		if (menuItem.getAttribute('api') == goodTube_api_url) {
			menuItem.classList.add('vjs-selected');
		}
	});

	// Reload video data
	if (reloadVideoData) {
		goodTube_player_reloadVideoData();
	}

	return goodTube_automaticServerIndex;
}
