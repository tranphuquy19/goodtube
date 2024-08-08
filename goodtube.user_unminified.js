// ==UserScript==
// @name         GoodTube
// @namespace    http://tampermonkey.net/
// @version      4.531
// @description  Loads Youtube videos from different sources. Also removes ads, shorts, etc.
// @author       GoodTube
// @match        https://*.youtube.com/*
// @icon         https://cdn-icons-png.flaticon.com/256/1384/1384060.png
// @run-at       document-start
// @updateURL    https://github.com/tranphuquy19/goodtube/raw/main-2/goodtube.user.js
// @downloadURL  https://github.com/tranphuquy19/goodtube/raw/main-2/goodtube.user.js
// @noframes
// ==/UserScript==

(function() {
	'use strict';


	// Bypass CSP restrictions, introduced by the latest Chrome updates
	if (window.trustedTypes && window.trustedTypes.createPolicy && !window.trustedTypes.defaultPolicy) {
		window.trustedTypes.createPolicy('default', {
			createHTML: string => string,
			createScriptURL: string => string,
			createScript: string => string
		});
	}


	/* General config
	------------------------------------------------------------------------------------------ */
	// Github location for loading assets
	let goodTube_github = 'https://raw.githubusercontent.com/goodtube4u/GoodTube/main';

	// How long to wait before trying to load something again (in milliseconds)
	let goodTube_retryDelay = 500;

	// How many times to try and load something again
	let goodTube_retryAttempts = 3;

	// Create a variable to hold retry timeouts
	let goodTube_pendingRetry = [];


	/* Video servers
	------------------------------------------------------------------------------------------ */
	let goodTube_videoServers = [
		{
	    	'name': 'IT-i (VN)',
			'type': 2,
			'proxy': true,
			'url': 'https://youtube.innova-tech.io.vn'
		},
	    {
        	'name': 'IT-p (VN)',
        	'type': 3,
	    	'proxy': true,
	    	'url': 'https://pipedapi.innova-tech.io.vn'
		},
	];

	// Set the starting server to automatic mode
	let goodTube_videoServer_type = goodTube_videoServers[0]['type'];
	let goodTube_videoServer_proxy = goodTube_videoServers[0]['proxy'];
	let goodTube_videoServer_url = goodTube_videoServers[0]['url'];
	let goodTube_videoServer_name = goodTube_videoServers[0]['name'];

	// Set the automatic server index
	let goodTube_videoServer_automaticIndex = 0;


	/* Subtitle and storyboard servers
	------------------------------------------------------------------------------------------ */
	let goodTube_storyboardSubtitleServers_subtitleIndex = 0;
	let goodTube_storyboardSubtitleServers_storyboardIndex = 0;
	let goodTube_storyboardSubtitleServers = [
		'https://invidious.perennialte.ch',
		'https://yt.artemislena.eu',
		'https://invidious.private.coffee',
		'https://invidious.drgns.space',
		'https://inv.nadeko.net',
		'https://invidious.projectsegfau.lt',
		'https://invidious.jing.rocks',
		'https://invidious.incogniweb.net',
		'https://invidious.privacyredirect.com',
		'https://invidious.fdn.fr',
		'https://iv.datura.network',
		'https://pipedapi-libre.kavin.rocks',
		'https://pipedapi.syncpundit.io',
		'https://invidious.protokolla.fi',
		'https://iv.melmac.space'
	];


	/* Download servers
	------------------------------------------------------------------------------------------ */
	// We first try these servers, recommended by "ihatespawn".
	// As I understand it these are ok to use, not trying to step on anyone's toes here.
	// Any issues with this implementation, please contact me. I am happy to work with you, so long as we let people download from somewhere.
	let goodTube_downloadServers_default = [
		// 'https://dl01.yt-dl.click',
		// 'https://dl02.yt-dl.click',
		// 'https://dl03.yt-dl.click',
		// 'https://apicloud9.filsfkwtlfjas.xyz',
		'https://apicloud3.filsfkwtlfjas.xyz',
		'https://apicloud8.filsfkwtlfjas.xyz',
		'https://apicloud4.filsfkwtlfjas.xyz',
		'https://apicloud5.filsfkwtlfjas.xyz',
	];

	// Only if they all fail, will we then fallback to using community instances.
	// This array is also shuffled to take the load off any single community instance.
	let goodTube_downloadServers_community = [
		'https://sea-downloadapi.stuff.solutions',
		'https://ca.haloz.at',
		'https://cobalt.wither.ing',
		'https://capi.tieren.men',
		'https://co.tskau.team',
		'https://apicb.tigaultraman.com',
		'https://api-cobalt.boykisser.systems',
		'https://cobalt.decrystalfan.app',
		'https://wukko.wolfdo.gg',
		'https://capi.oak.li',
		'https://cb.nyoom.fun',
		'https://dl.khyernet.xyz',
		'https://cobalt-api.alexagirl.studio',
		'https://nyc1.coapi.ggtyler.dev',
		'https://api.dl.ixhby.dev',
		'https://co.eepy.today',
		'https://downloadapi.stuff.solutions',
		'https://cobalt-api.ayo.tf',
		'https://api.sacreations.me',
		'https://apicloud2.filsfkwtlfjas.xyz',
		'https://dl01.yt-dl.click'
	];

	// Shuffle community instances
	let currentIndex = goodTube_downloadServers_community.length;
	while (currentIndex != 0) {
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		[goodTube_downloadServers_community[currentIndex], goodTube_downloadServers_community[randomIndex]] = [goodTube_downloadServers_community[randomIndex], goodTube_downloadServers_community[currentIndex]];
	}

	// Combine the default download servers with the shuffled community instances
	let goodTube_downloadServers = goodTube_downloadServers_default.concat(goodTube_downloadServers_community);


	/* Helper functions
	------------------------------------------------------------------------------------------ */
	// Are you on iOS?
	function goodTube_helper_iOS() {
		return [
			'iPad Simulator',
			'iPhone Simulator',
			'iPod Simulator',
			'iPad',
			'iPhone',
			'iPod'
		].includes(navigator.platform)
		|| (navigator.userAgent.includes("Mac") && "ontouchend" in document)
	}

	// Pad a number with leading zeros
	function goodTube_helper_padNumber(num, size) {
		num = num.toString();
		while (num.length < size) num = "0" + num;
		return num;
	}

	// Setup GET parameters
	function goodTube_helper_setupGetParams() {
		let getParams = {};

		document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function() {
			function decode(s) {
				return decodeURIComponent(s.split("+").join(" "));
			}

			getParams[decode(arguments[1])] = decode(arguments[2]);
		});

		// If we're on a playlist, but we don't have a video id in the URL - then get it from the frame API
		if (typeof getParams['list'] !== 'undefined' && typeof getParams['v'] === 'undefined') {
			let youtubeFrameAPI = document.getElementById('movie_player');

			if (youtubeFrameAPI && typeof youtubeFrameAPI.getVideoData === 'function') {
				let videoData = youtubeFrameAPI.getVideoData();

				if (typeof videoData['video_id'] !== 'undefined' && videoData['video_id']) {
					getParams['v'] = videoData['video_id'];
				}
			}
		}

		return getParams;
	}

	// Set a cookie
	function goodTube_helper_setCookie(name, value) {
		// 399 days
		document.cookie = name + "=" + encodeURIComponent(value) + "; max-age=" + (399*24*60*60);
	}

	// Get a cookie
	function goodTube_helper_getCookie(name) {
		// Split the cookie string and get all individual name=value pairs in an array
		let cookies = document.cookie.split(";");

		// Loop through the array elements
		for (let i = 0; i < cookies.length; i++) {
			let cookie = cookies[i].split("=");

			// Removing whitespace at the beginning of the cookie name and compare it with the given string
			if (name == cookie[0].trim()) {
				// Decode the cookie value and return
				return decodeURIComponent(cookie[1]);
			}
		}

		// Return null if not found
		return null;
	}

	// Hide or show an element / youtube player
	function goodTube_helper_hideElement_init() {
		let style = document.createElement('style');
		style.textContent = `
			.goodTube_hidden {
				position: fixed !important;
				top: -9999px !important;
				left: -9999px !important;
				transform: scale(0) !important;
				pointer-events: none !important;
			}

			.goodTube_hiddenPlayer {
				position: relative;
				overflow: hidden;
				z-index: 1;
			}

			.goodTube_hiddenPlayer::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: #ffffff;
				z-index: 998;
			}

			html[dark] .goodTube_hiddenPlayer::before {
				background: #0f0f0f;
			}
		`;

		document.head.appendChild(style);
	}

	function goodTube_helper_hideElement(element) {
		if (element && !element.classList.contains('goodTube_hidden')) {
			element.classList.add('goodTube_hidden');
		}
	}

	function goodTube_helper_showElement(element) {
		if (element && element.classList.contains('goodTube_hidden')) {
			element.classList.remove('goodTube_hidden');
		}
	}

	function goodTube_helper_hideYoutubePlayer(element) {
		// Add a wrapping div to help avoid detection
		if (!element.closest('.goodTube_hiddenPlayer')) {
			let parent = element.parentNode;
			let wrapper = document.createElement('div');
			wrapper.classList.add('goodTube_hiddenPlayer');
			parent.replaceChild(wrapper, element);
			wrapper.appendChild(element);
		}
	}


	/* Video server functions
	------------------------------------------------------------------------------------------ */
	// Check for custom video servers
	function goodTube_server_custom(server) {
		// Check setting
		if (typeof goodTube_getParams['goodtube_customserver_'+server] !== 'undefined' && goodTube_getParams['goodtube_customserver_'+server] === 'false') {
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_name', 'false');
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_type', 'false');
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_proxy', 'false');
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_url', 'false');
		}

		if (typeof goodTube_getParams['goodtube_customserver_'+server+'_name'] !== 'undefined' && typeof goodTube_getParams['goodtube_customserver_'+server+'_type'] !== 'undefined' && typeof goodTube_getParams['goodtube_customserver_'+server+'_proxy'] !== 'undefined' && typeof goodTube_getParams['goodtube_customserver_'+server+'_url'] !== 'undefined') {
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_name', goodTube_getParams['goodtube_customserver_'+server+'_name']);
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_type', goodTube_getParams['goodtube_customserver_'+server+'_type']);
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_proxy', goodTube_getParams['goodtube_customserver_'+server+'_proxy']);
			goodTube_helper_setCookie('goodtube_customserver_'+server+'_url', goodTube_getParams['goodtube_customserver_'+server+'_url']);
		}

		// If custom video server is enabled
		if (goodTube_helper_getCookie('goodtube_customserver_'+server+'_name') && goodTube_helper_getCookie('goodtube_customserver_'+server+'_name') !== 'false') {
			// Format the data (cookies are always strings)
			let customServer_name = goodTube_helper_getCookie('goodtube_customserver_'+server+'_name');
			let customServer_type = parseFloat(goodTube_helper_getCookie('goodtube_customserver_'+server+'_type'));
			let customServer_url = goodTube_helper_getCookie('goodtube_customserver_'+server+'_url');

			let customServer_proxy = goodTube_helper_getCookie('goodtube_customserver_'+server+'_proxy');
			if (customServer_proxy === 'false') {
				customServer_proxy = false;
			}
			else if (customServer_proxy === 'true') {
				customServer_proxy = true;
			}

			// Add custom server to servers list
			goodTube_videoServers.splice(1, 0, {
				'name': customServer_name,
				'type': customServer_type,
				'proxy': customServer_proxy,
				'url': customServer_url
			});

			// Debug message
			console.log('[GoodTube] Custom video server '+server+' enabled ('+customServer_name+')');
		}

		// Do this for up to 10 custom servers
		server++;
		if (server < 10) {
			goodTube_server_custom(server);
		}
	}

	// Check for a local video server
	function goodTube_server_local() {
		// Check setting
		if (typeof goodTube_getParams['goodtube_local'] !== 'undefined') {
			if (goodTube_getParams['goodtube_local'] === 'true') {
				goodTube_helper_setCookie('goodTube_local', 'true');
			}
			else if (goodTube_getParams['goodtube_local'] === 'false') {
				goodTube_helper_setCookie('goodTube_local', 'false');
			}
		}

		// If local video server is enabled
		if (goodTube_helper_getCookie('goodTube_local') === 'true') {
			// Add local video server to servers list
			goodTube_videoServers.splice(1, 0, {
				'name': 'LOCAL',
				'type': 2,
				'proxy': true,
				'url': 'http://127.0.0.1:3000'
			});

			// Debug message
			console.log('[GoodTube] Local video server enabled! 🚀');
		}
	}


	/* Youtube functions
	------------------------------------------------------------------------------------------ */
	// Hide ads, shorts, etc - init
	function goodTube_youtube_hideAdsShortsEtc() {
		let style = document.createElement('style');
		style.textContent = `
			.ytd-search ytd-shelf-renderer,
			ytd-reel-shelf-renderer,
			ytd-merch-shelf-renderer,
			ytd-action-companion-ad-renderer,
			ytd-display-ad-renderer,
			ytd-rich-section-renderer,
			ytd-video-masthead-ad-advertiser-info-renderer,
			ytd-video-masthead-ad-primary-video-renderer,
			ytd-in-feed-ad-layout-renderer,
			ytd-ad-slot-renderer,
			ytd-statement-banner-renderer,
			ytd-banner-promo-renderer-background
			ytd-ad-slot-renderer,
			ytd-in-feed-ad-layout-renderer,
			ytd-engagement-panel-section-list-renderer:not(.ytd-popup-container):not([target-id='engagement-panel-clip-create']),
			ytd-compact-video-renderer:has(.goodTube_hidden),
			ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)
			.ytd-video-masthead-ad-v3-renderer,
			div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
			div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
			div#main-container.style-scope.ytd-promoted-video-renderer,
			div#player-ads.style-scope.ytd-watch-flexy,
			#clarify-box,

			ytm-rich-shelf-renderer,
			ytm-search ytm-shelf-renderer,
			ytm-button-renderer.icon-avatar_logged_out,
			ytm-companion-slot,
			ytm-reel-shelf-renderer,
			ytm-merch-shelf-renderer,
			ytm-action-companion-ad-renderer,
			ytm-display-ad-renderer,
			ytm-rich-section-renderer,
			ytm-video-masthead-ad-advertiser-info-renderer,
			ytm-video-masthead-ad-primary-video-renderer,
			ytm-in-feed-ad-layout-renderer,
			ytm-ad-slot-renderer,
			ytm-statement-banner-renderer,
			ytm-banner-promo-renderer-background
			ytm-ad-slot-renderer,
			ytm-in-feed-ad-layout-renderer,
			ytm-compact-video-renderer:has(.goodTube_hidden),
			ytm-rich-item-renderer:has(> #content > ytm-ad-slot-renderer)
			.ytm-video-masthead-ad-v3-renderer,
			div#root.style-scope.ytm-display-ad-renderer.yt-simple-endpoint,
			div#sparkles-container.style-scope.ytm-promoted-sparkles-web-renderer,
			div#main-container.style-scope.ytm-promoted-video-renderer,
			div#player-ads.style-scope.ytm-watch-flexy,
			ytm-pivot-bar-item-renderer:has(> .pivot-shorts),
			ytd-compact-movie-renderer,

			yt-about-this-ad-renderer,
			masthead-ad,
			ad-slot-renderer,
			yt-mealbar-promo-renderer,
			statement-banner-style-type-compact,
			ytm-promoted-sparkles-web-renderer,
			tp-yt-iron-overlay-backdrop,
			#masthead-ad
			 {
				display: none !important;
			}

			.style-scope[page-subtype='channels'] ytd-shelf-renderer,
			.style-scope[page-subtype='channels'] ytm-shelf-renderer {
				display: block !important;
			}
		`;

		document.head.appendChild(style);

		// Debug message
		console.log('[GoodTube] Ads removed');
	}

	// Hide shorts
	function goodTube_youtube_hideShorts() {
		// If we're on a channel page, don't hide shorts
		if (window.location.href.indexOf('@') !== -1) {
			return;
		}

		// Hide shorts links
		let shortsLinks = document.querySelectorAll('a:not(.goodTube_hidden)');
		shortsLinks.forEach((element) => {
			if (element.href.indexOf('shorts/') !== -1) {
				goodTube_helper_hideElement(element);
				goodTube_helper_hideElement(element.closest('ytd-video-renderer'));
				goodTube_helper_hideElement(element.closest('ytd-compact-video-renderer'));
				goodTube_helper_hideElement(element.closest('ytd-rich-grid-media'));
			}
		});
	}

	// Support timestamp links in comments
	function goodTube_youtube_timestampLinks() {
		// Links in video description and comments
		let timestampLinks = document.querySelectorAll('#description a, ytd-comments .yt-core-attributed-string a, ytm-expandable-video-description-body-renderer a, .comment-content a');

		// For each link
		timestampLinks.forEach((element) => {
			// Make sure we've not touched it yet, this stops doubling up on event listeners
			if (!element.classList.contains('goodTube_timestampLink') && element.getAttribute('href') && element.getAttribute('href').indexOf(goodTube_getParams['v']) !== -1 && element.getAttribute('href').indexOf('t=') !== -1) {
				element.classList.add('goodTube_timestampLink');

				// Add the event listener to send our player to the correct time
				element.addEventListener('click', function() {
					let bits = element.getAttribute('href').split('t=');
					if (typeof bits[1] !== 'undefined') {
						let time = bits[1].replace('s', '');
						goodTube_player_skipTo(goodTube_player, time);
					}
				});
			}
		});
	}

	// Make the youtube player the lowest quality to save on bandwidth (via the frame API)
	function goodTube_youtube_lowestQuality() {
		let youtubeFrameAPI = document.getElementById('movie_player');

		if (youtubeFrameAPI && typeof youtubeFrameAPI.setPlaybackQualityRange === 'function' && typeof youtubeFrameAPI.getAvailableQualityData === 'function' && typeof youtubeFrameAPI.getPlaybackQuality === 'function') {
			let qualities = youtubeFrameAPI.getAvailableQualityData();
			let currentQuality = youtubeFrameAPI.getPlaybackQuality();
			if (qualities.length && currentQuality) {
				let lowestQuality = qualities[qualities.length-1]['quality'];

				if (currentQuality != lowestQuality) {
					youtubeFrameAPI.setPlaybackQualityRange(lowestQuality, lowestQuality);
				}
			}
		}
	}

	// Hide all Youtube players
	function goodTube_youtube_hidePlayers() {
		// Hide the normal Youtube player
		let regularPlayers = document.querySelectorAll('#player:not(.ytd-channel-video-player-renderer)');
		regularPlayers.forEach((element) => {
			goodTube_helper_hideYoutubePlayer(element);
		});

		// Remove the full screen and theater Youtube player
		let fullscreenPlayers = document.querySelectorAll('#full-bleed-container');
		fullscreenPlayers.forEach((element) => {
			goodTube_helper_hideYoutubePlayer(element);
		});

		// Hide the mobile controls
		let mobileControls = document.querySelectorAll('#player-control-container');
		mobileControls.forEach((element) => {
			goodTube_helper_hideElement(element);
		});

		// Hide the Youtube miniplayer
		let miniPlayers = document.querySelectorAll('ytd-miniplayer');
		miniPlayers.forEach((element) => {
			goodTube_helper_hideElement(element);
		});
	}

	// Turn off autoplay
	let goodTube_turnedOffAutoplay = false;
	function goodTube_youtube_turnOffAutoplay() {
		// If we've already turned off autoplay, just return
		if (goodTube_turnedOffAutoplay) {
			return;
		}

		let autoplayButton = false;

		// Desktop
		if (!goodTube_mobile) {
			// Target the autoplay button
			autoplayButton = document.querySelector('.ytp-autonav-toggle-button');

			// If we found it
			if (autoplayButton) {
				// Set a variable if autoplay has been turned off
				if (autoplayButton.getAttribute('aria-checked') === 'false') {
					goodTube_turnedOffAutoplay = true;
					return;
				}
				// Otherwise click the button
				else {
					autoplayButton.click();
				}
			}
		}
		// Mobile
		else {
			// Autoplay is always on for mobile now, we can't control it sadly...

			// // Target the autoplay button
			// autoplayButton = document.querySelector('.ytm-autonav-toggle-button-container');

			// // If we found it
			// if (autoplayButton) {
			// 	// Set a variable if autoplay has been turned off
			// 	if (autoplayButton.getAttribute('aria-pressed') === 'false') {
			// 		goodTube_turnedOffAutoplay = true;
			// 		return;
			// 	}
			// 	// Otherwise click the button
			// 	else {
			// 		autoplayButton.click();
			// 	}
			// }
			// // If we didn't find it - click the player a bit, this helps to actually make the autoplay button show (after ads)
			// else {
			// 	document.querySelector('#player .html5-video-player')?.click();
			// 	document.querySelector('#player').click();
			// 	document.querySelector('.ytp-unmute')?.click();
			// }
		}
	}

	// Sync players
	let goodTube_youtube_syncing = false;
	let goodTube_youtube_previousSyncTime = 0;
	function goodTube_youtube_syncPlayers() {
		let youtubeVideo = document.querySelector('#movie_player video');

		// If the youtube player exists, our player is loaded and we're viewing a video
		if (youtubeVideo && goodTube_videojs_player_loaded && typeof goodTube_getParams['v'] !== 'undefined') {
			// Don't keep syncing the same time over and over unless it's the start of the video
			let syncTime = goodTube_player.currentTime;
			if (syncTime === goodTube_youtube_previousSyncTime && parseFloat(syncTime) > 0) {
				return;
			}

			// Setup the previous sync time
			goodTube_youtube_previousSyncTime = syncTime;

			// Set the current time of the Youtube player to match ours (this makes history and watched time work correctly)
			youtubeVideo.currentTime = syncTime;

			// We're syncing (this turns off the pausing of the Youtube video in goodTube_youtube_mutePauseSkipAds)
			goodTube_youtube_syncing = true;

			// Play for 10ms to make history work via JS
			youtubeVideo.play();
			youtubeVideo.muted = true;
			youtubeVideo.volume = 0;

			// Play for 10ms to make history work via the frame API
			let youtubeFrameApi = document.querySelector('#movie_player');
			if (youtubeFrameApi) {
				if (typeof youtubeFrameApi.playVideo === 'function') {
					youtubeFrameApi.playVideo();
				}

				if (typeof youtubeFrameApi.mute === 'function') {
					youtubeFrameApi.mute();
				}

				if (typeof youtubeFrameApi.setVolume === 'function') {
					youtubeFrameApi.setVolume(0);
				}
			}

			// Stop syncing after 10ms (this turns on the pausing of the Youtube video in goodTube_youtube_mutePauseSkipAds)
			setTimeout(function() {
				goodTube_youtube_syncing = false;
			}, 10);
		}
	}

	// Mute, pause and skip ads on all Youtube videos
	function goodTube_youtube_mutePauseSkipAds() {
		// // Always skip the ads as soon as possible by clicking the skip button
		// let skipButton = document.querySelector('.ytp-skip-ad-button');
		// if (skipButton) {
		// 	skipButton.click();
		// }

		// Pause and mute all HTML videos on the page that are not GoodTube
		let youtubeVideos = document.querySelectorAll('video:not(#goodTube_player):not(#goodTube_player_html5_api)');
		youtubeVideos.forEach((element) => {
			// Don't touch the thumbnail hover player
			if (!element.closest('#inline-player')) {
				element.muted = true;
				element.volume = 0;

				if (!goodTube_youtube_syncing) {
					element.pause();
				}
			}
		});
	}


	/* Video JS functions
	------------------------------------------------------------------------------------------ */
	let goodTube_videojs_player = false;
	let goodTube_videojs_player_loaded = false;
	let goodTube_videojs_tapTimer_backwards = false;
	let goodTube_videojs_tapTimer_forwards = false;
	let goodTube_videojs_fastForwardTimeout = false;
	let goodTube_videojs_fastForward = false;
	let goodTube_qualityApi = false;
	let goodTube_bufferingTimeout = false;
	let goodTube_bufferCountTimeout = false;
	let goodTube_loadingTimeout = false;
	let goodTube_seeking = false;
	let goodTube_bufferCount = 0;
	let goodTube_videojs_playbackRate = 1;
	let goodTube_player_restoreTime = 0;

	// Init video js
	function goodTube_videojs_init() {
		// Debug message
		console.log('[GoodTube] Loading player...');


		// Style video js
		goodTube_videojs_style();


		// Add custom menu buttons
		const MenuItem = videojs.getComponent("MenuItem");
		const MenuButton = videojs.getComponent("MenuButton");

		class CustomMenuButton extends MenuButton {
			createItems() {
				const items = [];
				const { myItems } = this.options_;

				if (!Array.isArray(myItems)) items;

				myItems.forEach(({ clickHandler, ...item }) => {
					const menuItem = new MenuItem(this.player(), item);

					if (clickHandler) {
						menuItem.handleClick = clickHandler;
					}

					items.push(menuItem);
				});

				return items;
			}

			buildCSSClass() {
				return `${super.buildCSSClass()}`;
			}
		}

		videojs.registerComponent("DownloadButton", CustomMenuButton);
		videojs.registerComponent("SourceButton", CustomMenuButton);
		videojs.registerComponent("AutoplayButton", CustomMenuButton);


		// Add custom normal buttons
		const Button = videojs.getComponent("Button");

		class PrevButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_nav_prev();
			}
		}
		videojs.registerComponent('PrevButton', PrevButton);

		class NextButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_nav_next(true);
			}
		}
		videojs.registerComponent('NextButton', NextButton);

		class MiniplayerButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_miniplayer_showHide();
			}
		}
		videojs.registerComponent('MiniplayerButton', MiniplayerButton);

		class TheaterButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_shortcuts_trigger('theater');
			}
		}
		videojs.registerComponent('TheaterButton', TheaterButton);


		// Setup the API selection
		let apiList = [];

		goodTube_videoServers.forEach((api) => {
			apiList.push({
				label: api['name'],
				clickHandler(event) {
					// Get the menu
					let menu = event.target.closest('.vjs-menu');

					// Deselect the currently selected menu items
					let selectedMenuItems = menu.querySelectorAll('.vjs-selected');
					selectedMenuItems.forEach((selectedMenuItem) => {
						selectedMenuItem.classList.remove('vjs-selected');
					});

					// Select the clicked menu item
					let menuItem = event.target.closest('.vjs-menu-item');
					menuItem.classList.add('vjs-selected');

					// If we selected automatic, reset the server index so it tries them all
					if (menuItem.getAttribute('api') === 'automatic') {
						goodTube_videoServer_automaticIndex = 0;
					}

					// Set the player time to be restored when the new server loads
					if (goodTube_player.currentTime > 0) {
						goodTube_player_restoreTime = goodTube_player.currentTime;
					}

					// Set the new API
					goodTube_player_selectVideoServer(menuItem.getAttribute('api'), true);
				}
			});
		});

		// Init the player
		goodTube_videojs_player = videojs('goodTube_player', {
			inactivityTimeout: 3000,
			controls: true,
			autoplay: false,
			preload: 'auto',
			width: '100%',
			height: '100%',
			playbackRates: [0.25, 0.5, 1, 1.25, 1.5, 1.75, 2],
			userActions: {
				doubleClick: false
			},
			// This fixes issues with the quality selector on iOS
			html5: {
				vhs: {
					overrideNative: true
				},
				hls: {
					overrideNative: true
				}
			},
			controlBar: {
				children: [
					'playToggle',
					'volumePanel',
					'currentTimeDisplay',
					'timeDivider',
					'durationDisplay',
					'progressControl',
					'playbackRateMenuButton',
					'subsCapsButton',
					'qualitySelector',
					'fullscreenToggle'
				],

				// Add next button
				NextButton: {
					className: "vjs-next-button"
				},

				// Add prev button
				PrevButton: {
					className: "vjs-prev-button"
				},

				// Add autoplay button
				AutoplayButton: {
					controlText: "Autoplay",
					className: "vjs-autoplay-button",
					myItems: [
						{
							label: "Autoplay off",
							clickHandler() {
								// Get the menu
								let menu = event.target.closest('.vjs-menu');

								// Deselect the currently selected menu item
								menu.querySelector('.vjs-selected')?.classList.remove('vjs-selected');

								// Select the clicked menu item
								let menuItem = event.target.closest('.vjs-menu-item');
								menuItem.classList.add('vjs-selected');

								goodTube_helper_setCookie('goodTube_autoplay', 'off');
							},
						},
						{
							label: "Autoplay on",
							clickHandler() {
								// Get the menu
								let menu = event.target.closest('.vjs-menu');

								// Deselect the currently selected menu item
								menu.querySelector('.vjs-selected')?.classList.remove('vjs-selected');

								// Select the clicked menu item
								let menuItem = event.target.closest('.vjs-menu-item');
								menuItem.classList.add('vjs-selected');

								goodTube_helper_setCookie('goodTube_autoplay', 'on');
							},
						},
					],
				},

				// Add source button
				SourceButton: {
					controlText: "Video source",
					className: "vjs-source-button",
					myItems: apiList,
				},

				// Add download button
				DownloadButton: {
					controlText: "Download",
					className: "vjs-download-button",
					myItems: [
						{
							className: 'goodTube_download_playlist_cancel',
							label: "CANCEL ALL DOWNLOADS",
							clickHandler() {
								goodTube_download_cancelAll();
							},
						},
						{
							label: "Download video",
							clickHandler() {
								// Add to pending downloads
								goodTube_pendingDownloads[goodTube_getParams['v']] = true;

								// Download the video
								goodTube_download_addToQue(0, 'video', goodTube_getParams['v']);
							},
						},
						{
							label: "Download audio",
							clickHandler() {
								// Add to pending downloads
								goodTube_pendingDownloads[goodTube_getParams['v']] = true;

								// Download the audio
								goodTube_download_addToQue(0, 'audio', goodTube_getParams['v']);
							},
						},
						{
							className: 'goodTube_download_playlist_video',
							label: "Download playlist (video)",
							clickHandler() {
								goodTube_download_playlist('video');
							},
						},
						{
							className: 'goodTube_download_playlist_audio',
							label: "Download playlist (audio)",
							clickHandler() {
								goodTube_download_playlist('audio');
							},
						},
					],
				},

				// Add miniplayer button
				MiniplayerButton: {
					className: "vjs-miniplayer-button"
				},

				// Add theater button
				TheaterButton: {
					className: "vjs-theater-button"
				},
			}
		});

		// Disable console errors from video js
		videojs.log.level('off');

		// If for any reason the video failed to load, try reloading it again
		videojs.hook('error', function(error) {
			// Ensure we're viewing a video
			if (!goodTube_player.getAttribute('src')) {
				return;
			}

			if (typeof goodTube_pendingRetry['reloadVideo'] !== 'undefined') {
				clearTimeout(goodTube_pendingRetry['reloadVideo']);
			}

			goodTube_pendingRetry['reloadVideo'] = setTimeout(function() {
				goodTube_video_reloadVideo(goodTube_player);
			}, goodTube_retryDelay);

			// Add the loading state
			goodTube_player_addLoadingState();

			// Update the video js player
			goodTube_videojs_update();
		});

		// After video JS has loaded
		goodTube_videojs_player.on('ready', function() {
			goodTube_videojs_player_loaded = true;

			// Add the playsinline attributes (this stops iOS from automatically going fullscreen)
			let video = document.querySelector('#goodTube_player video');
			if (video) {
				video.setAttribute('playsinline', '');
				video.setAttribute('webkit-playsinline', '');
			}

			// Sync the Youtube player for watch history
			goodTube_youtube_syncPlayers();

			// Enable the qualities API
			goodTube_qualityApi = goodTube_videojs_player.hlsQualitySelector();

			// Add expand and close miniplayer buttons
			let goodTube_target = document.querySelector('#goodTube_player');

			if (goodTube_target) {
				let miniplayer_closeButton = document.createElement('div');
				miniplayer_closeButton.id = 'goodTube_miniplayer_closeButton';
				miniplayer_closeButton.onclick = function() {
					goodTube_miniplayer_showHide();
				};
				goodTube_target.appendChild(miniplayer_closeButton);

				let miniplayer_expandButton = document.createElement('div');
				miniplayer_expandButton.id = 'goodTube_miniplayer_expandButton';
				miniplayer_expandButton.onclick = function() {
					if (goodTube_miniplayer_video !== goodTube_getParams['v']) {
						window.location.href = '/watch?v='+goodTube_miniplayer_video+'&t='+parseFloat(goodTube_player.currentTime).toFixed(0)+'s';
					}
					else {
						goodTube_miniplayer_showHide();
					}
				};
				goodTube_target.appendChild(miniplayer_expandButton);
			}

			// Debug message
			console.log('[GoodTube] Player loaded');

			// Re-target the goodTube player globally (as video JS shifts this element)
			goodTube_player = document.querySelector('#goodTube_player video');

			// Attach mobile seeking events
			if (goodTube_mobile) {
				// Attach the backwards seek button
				let goodTube_seekBackwards = document.createElement('div');
				goodTube_seekBackwards.id = 'goodTube_seekBackwards';
				goodTube_target.append(goodTube_seekBackwards);

				// Double tap event to seek backwards
				goodTube_seekBackwards.onclick = function() {
					// Get the time
					var now = new Date().getTime();

					// Check how long since last tap
					var timesince = now - goodTube_videojs_tapTimer_backwards;

					// If it's less than 400ms
					if ((timesince < 400) && (timesince > 0)) {
						// Remove active state and hide overlays (so you can see the video properly)
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');

						// Seek backwards 10 seconds
						goodTube_player.currentTime -= 10;
					}
					// If it's just a normal tap
					else {
						// Swap to opposite state of active / inactive
						if (goodTube_target.classList.contains('vjs-user-active')) {
							goodTube_target.classList.remove('vjs-user-active');
							goodTube_target.classList.add('vjs-user-inactive');
						}
						else {
							goodTube_target.classList.add('vjs-user-active');
							goodTube_target.classList.remove('vjs-user-inactive');
						}
					}

					// Set the last tap time
					goodTube_videojs_tapTimer_backwards = new Date().getTime();
				}


				// Attach the forwards seek button
				let goodTube_seekForwards = document.createElement('div');
				goodTube_seekForwards.id = 'goodTube_seekForwards';
				goodTube_target.append(goodTube_seekForwards);

				goodTube_seekForwards.onclick = function() {
					// Get the time
					var now = new Date().getTime();

					// Check how long since last tap
					var timesince = now - goodTube_videojs_tapTimer_forwards;

					// If it's less than 400ms
					if ((timesince < 400) && (timesince > 0)) {
						// Remove active state and hide overlays (so you can see the video properly)
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');

						// Seek forwards 5 seconds
						goodTube_player.currentTime += 5;
					}
					// If it's just a normal tap
					else {
						// Swap to opposite state of active / inactive
						if (goodTube_target.classList.contains('vjs-user-active')) {
							goodTube_target.classList.remove('vjs-user-active');
							goodTube_target.classList.add('vjs-user-inactive');
						}
						else {
							goodTube_target.classList.add('vjs-user-active');
							goodTube_target.classList.remove('vjs-user-inactive');
						}
					}

					// Set the last tap time
					goodTube_videojs_tapTimer_forwards = new Date().getTime();
				}


				// Long press to fast forward

				// On touch start
				goodTube_target.addEventListener('touchstart', function(e) {
					// Start fast forward after 1 second
					goodTube_videojs_fastForwardTimeout = setTimeout(function() {
						// Remove active state and hide overlays (so you can see the video properly)
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');

						// Save the current playback rate
						goodTube_videojs_playbackRate = goodTube_player.playbackRate;

						// Set playback rate to 2x (fast forward)
						goodTube_player.playbackRate = 2;

						// Set a variable to indicate that we're fast forwarding
						goodTube_videojs_fastForward = true;
					}, 1000);
				});

				// On touch move / touch end
				['touchmove','touchend', 'touchcancel'].forEach(eventType => {
					goodTube_target.addEventListener(eventType, function(e) {
						// Remove any pending timeouts to fast forward
						if (goodTube_videojs_fastForwardTimeout) {
							clearTimeout(goodTube_videojs_fastForwardTimeout);
						}

						// If we are fast forwarding
						if (goodTube_videojs_fastForward) {
							// Restore the current playback rate
							goodTube_player.playbackRate = goodTube_videojs_playbackRate;

							// Set a variable to indicate that we're not fast forwarding anymore
							goodTube_videojs_fastForward = false;
						}
					});
				});
			}

			// Double click to fullscreen (desktop only)
			if (!goodTube_mobile) {
				goodTube_target.addEventListener('dblclick', function(event) {
					// Make sure we're not clicking a menu button or the seek bar
					if (!event.target.closest('.vjs-progress-control') && !event.target.closest('.vjs-menu-button') && !event.target.closest('.vjs-control')) {
						// Click the fullscreen button
						document.querySelector('.vjs-fullscreen-control')?.click();
					}
				});
			}

			// Active and inactive control based on mouse movement (desktop only)
			if (!goodTube_mobile) {
				// Mouse off make inactive
				goodTube_target.addEventListener('mouseout', function(event) {
					if (goodTube_target.classList.contains('vjs-user-active') && !goodTube_target.classList.contains('vjs-paused')) {
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');
					}
				});

				// Mouse over make active
				goodTube_target.addEventListener('mouseover', function(event) {
					if (goodTube_target.classList.contains('vjs-user-inactive') && !goodTube_target.classList.contains('vjs-paused')) {
						goodTube_target.classList.add('vjs-user-active');
						goodTube_target.classList.remove('vjs-user-inactive');
					}
				});

				// Click to play, don't make inactive (override video js default behavior)
				goodTube_target.addEventListener('click', function(event) {
					setTimeout(function() {
						if (goodTube_target.classList.contains('vjs-user-inactive') && !goodTube_target.classList.contains('vjs-paused')) {
							goodTube_target.classList.add('vjs-user-active');
							goodTube_target.classList.remove('vjs-user-inactive');

							// Set a timeout to make inactive (to replace video js default behavior)
							window.goodTube_inactive_timeout = setTimeout(function() {
								if (goodTube_target.classList.contains('vjs-user-active') && !goodTube_target.classList.contains('vjs-paused')) {
									goodTube_target.classList.remove('vjs-user-active');
									goodTube_target.classList.add('vjs-user-inactive');
								}
							}, 3000);
						}
					}, 1);
				});

				// If they move the mouse, remove our timeout to make inactive (return to video js default behavior)
				goodTube_target.addEventListener('mousemove', function(event) {
					if (typeof window.goodTube_inactive_timeout !== 'undefined') {
						clearTimeout(window.goodTube_inactive_timeout);
					}
				});
			}

			// Remove all title attributes from buttons, we don't want hover text
			let buttons = document.querySelectorAll('#goodTube_player button');
			buttons.forEach((element) => {
				element.setAttribute('title', '');
			});


			// Set the default volume (if a cookie exists for it)
			let volume = goodTube_helper_getCookie('goodTube_volume');
			if (volume && volume == parseFloat(volume)) {
				goodTube_player_volume(goodTube_player, volume);
			}


			// Autoplay
			// If autoplay cookie doesn't exist, or we're on mobile, turn autoplay on (as it's forced for mobile now)
			if (!goodTube_helper_getCookie('goodTube_autoplay') || goodTube_mobile) {
				goodTube_helper_setCookie('goodTube_autoplay', 'on');
			}

			// Select the correct autoplay button
			let autoplayButton = document.querySelector('.vjs-autoplay-button');

			if (autoplayButton) {
				// Deselect all our autoplay menu items
				autoplayButton.querySelector('.vjs-menu .vjs-selected')?.classList.remove('vjs-selected');

				// Select the correct autoplay menu item
				let autoplay_menuItems = autoplayButton.querySelectorAll('.vjs-menu .vjs-menu-item');

				if (goodTube_helper_getCookie('goodTube_autoplay') === 'on') {
					autoplay_menuItems[autoplay_menuItems.length- 1].classList.add('vjs-selected');
				}
				else {
					autoplay_menuItems[0].classList.add('vjs-selected');
				}
			}

			// Make mute button work
			let muteButton = document.querySelector('.vjs-mute-control');
			if (muteButton) {
				muteButton.onmousedown = function() {
					if (goodTube_player.muted) {
						goodTube_videojs_player.muted(false);
					}
					else {
						goodTube_videojs_player.muted(true);
					}
				}

				muteButton.ontouchstart = function() {
					if (goodTube_player.muted) {
						goodTube_videojs_player.muted(false);
					}
					else {
						goodTube_videojs_player.muted(true);
					}
				}
			}

			// Make clicking the play / pause button work
			let playPauseButton = document.querySelector('.vjs-play-control');
			if (playPauseButton) {
				playPauseButton.removeEventListener('click', goodTube_player_togglePlayPause, false);
				playPauseButton.addEventListener('click', goodTube_player_togglePlayPause, false);
			}

			// Click off close menu
			document.onmousedown = function() {
				if (!event.target.closest('.vjs-menu') && !event.target.closest('.vjs-menu-button')) {
					let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

					openMenuButtons.forEach((openMenuButton) => {
						openMenuButton.classList.remove('vjs-menuOpen');
					});
				}
			}

			document.ontouchstart = function() {
				if (!event.target.closest('.vjs-menu') && !event.target.closest('.vjs-menu-button')) {
					let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

					openMenuButtons.forEach((openMenuButton) => {
						openMenuButton.classList.remove('vjs-menuOpen');
					});
				}
			}

			// Make replay button work
			let playButton = document.querySelector('.vjs-control-bar .vjs-play-control');
			if (playButton) {
				playButton.onclick = function() {
					if (goodTube_player.currentTime === 0) {
						goodTube_player.click();
					}
				}

				playButton.ontouchstart = function() {
					if (goodTube_player.currentTime === 0) {
						goodTube_player.click();
					}
				}
			}

			// Add URL param to default video source menu items
			let sourceMenuItems = document.querySelectorAll('.vjs-source-button .vjs-menu .vjs-menu-item');
			if (sourceMenuItems) {
				let i = 0;

				sourceMenuItems.forEach((sourceMenuItem) => {
					sourceMenuItem.setAttribute('api', goodTube_videoServers[i]['url']);
					i++;
				});
			}

			// If they're on iOS - hide the download button
			if (goodTube_helper_iOS()) {
				let downloadButton = document.querySelector('.vjs-download-button');
				if (downloadButton) {
					downloadButton.remove();
				}
			}

			// Init the API selection
			goodTube_player_selectVideoServer(goodTube_helper_getCookie('goodTube_videoServer_withauto'), false);

			// Update the video js player
			goodTube_videojs_update();
		});

		// Esc keypress close menus
		document.addEventListener('keydown', function(event) {
			if (event.keyCode == 27) {
				let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

				openMenuButtons.forEach((openMenuButton) => {
					openMenuButton.classList.remove('vjs-menuOpen');
				});
			}
		}, true);

		// Seeking events
		goodTube_videojs_player.on('seeking', function() {
			goodTube_seeking = true;
		});

		goodTube_videojs_player.on('seeked', function() {
			goodTube_seeking = false;

			// Sync the Youtube player for watch history
			goodTube_youtube_syncPlayers();
		});

		// On buffering / loading
		goodTube_videojs_player.on('waiting', function() {
			// Clear any buffering timeouts
			if (goodTube_bufferingTimeout) {
				clearTimeout(goodTube_bufferingTimeout);
			}
			if (goodTube_bufferCountTimeout) {
				clearTimeout(goodTube_bufferCountTimeout);
			}

			// If we're at the start of the video, don't do anything
			if (goodTube_player.currentTime <= 0) {
				return;
			}

			// If we're not seeking
			if (!goodTube_seeking) {
				goodTube_bufferCountTimeout = setTimeout(function() {
					// And we've had to wait for it to buffer for at least 1 second 3 times, select the next server
					goodTube_bufferCount++;

					if (goodTube_bufferCount >= 3) {
						// Clear any buffering timeouts
						if (goodTube_bufferingTimeout) {
							clearTimeout(goodTube_bufferingTimeout);
						}
						if (goodTube_bufferCountTimeout) {
							clearTimeout(goodTube_bufferCountTimeout);
						}

						// Debug message
						console.log('[GoodTube] Video buffering too often - selecting next video source...');

						// Reset the buffer count
						goodTube_bufferCount = 0;

						// Set the player time to be restored when the new server loads
						goodTube_player_restoreTime = goodTube_player.currentTime;

						// Select the next server
						goodTube_player_selectVideoServer('automatic', true);

						return;
					}
				}, 1000);
			}

			// Only do this for HD servers (Invidious and Piped)
			if ((goodTube_videoServer_type === 2 || goodTube_videoServer_type === 3)) {
				// Save the time we started buffering
				let bufferStartTime = goodTube_player.currentTime;

				// If we've been waiting more than 15s, select the next server
				goodTube_bufferingTimeout = setTimeout(function() {
					if (goodTube_player.currentTime === bufferStartTime) {
						// Clear any buffering timeouts
						if (goodTube_bufferingTimeout) {
							clearTimeout(goodTube_bufferingTimeout);
						}
						if (goodTube_bufferCountTimeout) {
							clearTimeout(goodTube_bufferCountTimeout);
						}

						// Debug message
						console.log('[GoodTube] Video not loading fast enough - selecting next video source...');

						// Set the player time to be restored when the new server loads
						goodTube_player_restoreTime = goodTube_player.currentTime;

						// Select the next server
						goodTube_player_selectVideoServer('automatic', true);
					}
				}, 15000);
			}
		});

		// Once the metadata has loaded
		goodTube_videojs_player.on('loadedmetadata', function() {
			// Ensure we're viewing a video
			if (!goodTube_player.getAttribute('src')) {
				return;
			}

			// Clear any loading timeouts
			if (goodTube_loadingTimeout) {
				clearTimeout(goodTube_loadingTimeout);
			}

			// Skip to remembered time once loaded metadata (if there's a get param of 't')
			if (typeof goodTube_getParams['t'] !== 'undefined') {
				let time = goodTube_getParams['t'].replace('s', '');
				goodTube_player_skipTo(goodTube_player, time);
			}

			// Skip to remembered time if we're changing server
			if (goodTube_player_restoreTime > 0) {
				goodTube_player_skipTo(goodTube_player, goodTube_player_restoreTime);
			}

			// Focus the video player once loaded metadata
			goodTube_player.focus();
		});

		// Debug message to show the video is loading
		goodTube_videojs_player.on('loadstart', function() {
			// Ensure we're viewing a video
			if (!goodTube_player.getAttribute('src')) {
				return;
			}

			// Clear any loading timeouts
			if (goodTube_loadingTimeout) {
				clearTimeout(goodTube_loadingTimeout);
			}

			// If we've been waiting more than 15s, select the next server
			goodTube_loadingTimeout = setTimeout(function() {
				// Debug message
				console.log('[GoodTube] Video not loading fast enough - selecting next video source...');

				// Get the next server
				goodTube_player_selectVideoServer('automatic', true);
			}, 15000);

			// Server 1 quality stuff
			if (goodTube_videoServer_type === 1) {
				let qualityLabel = '';

				// Get the quality label from the quality select menu in the player
				let qualityLabelMenuItem = document.querySelector('.vjs-quality-selector .vjs-menu .vjs-selected .vjs-menu-item-text');
				if (qualityLabelMenuItem) {
					qualityLabel = qualityLabelMenuItem.innerHTML;
				}
				// Otherwise that doesn't exist so get it from the selected source
				else {
					qualityLabel = goodTube_player.querySelector('source[selected=true]').getAttribute('label');
				}

				// If we've manually changed quality, remember it so the next video stays with the same quality
				let newQuality = qualityLabel.replace('p', '').replace('hd', '').replace(' ', '').toLowerCase();

				if (parseFloat(goodTube_player_selectedQuality) !== parseFloat(newQuality)) {
					goodTube_player_manuallySelectedQuality = newQuality;
					goodTube_player_selectedQuality = newQuality;
				}

				// Target the outer wrapper
				let goodTube_target = document.querySelector('#goodTube_playerWrapper');

				// If the quality is audio, add the audio style to the player
				if (newQuality === 'audio') {
					if (!goodTube_target.classList.contains('goodTube_audio')) {
						goodTube_target.classList.add('goodTube_audio');
					}
				}
				// Otherwise remove the audio style from the player
				else if (goodTube_target.classList.contains('goodTube_audio')) {
					goodTube_target.classList.remove('goodTube_audio');
				}

				// Debug message
				if (goodTube_player_reloadVideoAttempts <= 1) {
					console.log('[GoodTube] Loading quality '+qualityLabel+'...');
				}
			}


			// Server type 2 (dash) quality stuff
			else if (goodTube_videoServer_type === 2 || goodTube_videoServer_type === 3) {
				// Target the outer wrapper
				let goodTube_target = document.querySelector('#goodTube_playerWrapper');

				// Remove any audio styles from the player
				if (goodTube_target.classList.contains('goodTube_audio')) {
					goodTube_target.classList.remove('goodTube_audio');
				}

				// Debug message
				if (goodTube_player_reloadVideoAttempts <= 1) {
					console.log('[GoodTube] Loading qualities...');
				}
			}
		});

		// Once data had loaded
		goodTube_videojs_player.on('loadeddata', function() {
			// Reset the buffer count
			goodTube_bufferCount = 0;

			// Autoplay the video
			// Only autoplay if the user hasn't paused the video prior to it loading
			if (!goodTube_player.paused) {
				goodTube_player_play(goodTube_player);
			}

			// The load worked so clear any pending reloads and allow more reload attempts for future loads
			goodTube_player_reloadVideoAttempts = 1;
			if (typeof goodTube_pendingRetry['reloadVideo'] !== 'undefined') {
				clearTimeout(goodTube_pendingRetry['reloadVideo']);
			}

			// Debug message
			if (goodTube_videoServer_type === 1) {
				console.log('[GoodTube] Quality loaded');
			}
			else if (goodTube_videoServer_type === 2 || goodTube_videoServer_type === 3) {
				console.log('[GoodTube] Qualities loaded');
			}

			// Update the video js player
			goodTube_videojs_update();

			// Remove the loading state
			goodTube_player_removeLoadingState();
		});

		// Play next video this video has ended
		goodTube_videojs_player.on('ended', function() {
			goodTube_youtube_syncPlayers();
			goodTube_nav_next();
		});

		// Save the volume you were last at in a cookie
		goodTube_videojs_player.on('volumechange', function() {
			let volume = goodTube_player.volume;
			if (goodTube_player.muted) {
				volume = 0;
			}

			goodTube_helper_setCookie('goodTube_volume', volume);
		});
	}

	// Style video js
	function goodTube_videojs_style() {
		let style = document.createElement('style');
		style.textContent = `
			.video-js {
				overflow: hidden;
			}

			.video-js *:focus {
				outline-color: transparent;
				outline-style: none;
			}

			.vjs-has-started.vjs-user-inactive.vjs-playing .vjs-control-bar {
				transition: visibility .25s, opacity .25s !important;
			}

			.vjs-menu .vjs-menu-item-text {
				text-transform: none !important;
			}

			.vjs-menu .vjs-menu-item-text:first-letter {
				text-transform: uppercase !important;
			}

			.video-js .vjs-download-button .vjs-icon-placeholder,
			.video-js .vjs-source-button .vjs-icon-placeholder,
			.video-js .vjs-autoplay-button .vjs-icon-placeholder,
			.video-js .vjs-quality-selector .vjs-icon-placeholder,
			.video-js .vjs-prev-button .vjs-icon-placeholder,
			.video-js .vjs-next-button .vjs-icon-placeholder,
			.video-js .vjs-miniplayer-button .vjs-icon-placeholder,
			.video-js .vjs-theater-button .vjs-icon-placeholder {
				font-family: VideoJS;
				font-weight: 400;
				font-style: normal;
			}

			.video-js .vjs-control-bar > button {
				cursor: pointer;
			}

			.video-js .vjs-prev-button .vjs-icon-placeholder:before {
				content: "\\f124";
			}

			.video-js .vjs-next-button .vjs-icon-placeholder:before {
				content: "\\f123";
			}

			.video-js .vjs-download-button .vjs-icon-placeholder:before {
				content: "\\f110";
			}



			// Loading indicator for downloads
			.video-js .vjs-download-button {
				position: relative;
			}

			.video-js .vjs-download-button .goodTube_spinner {
				opacity: 0;
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				transition: opacity .4s linear;
			}
			.video-js .vjs-download-button.goodTube_loading .goodTube_spinner {
				opacity: 1;
				transition: opacity .2s .2s linear;
			}

			.video-js .vjs-download-button .vjs-icon-placeholder:before {
				opacity: 1;
				transition: opacity .2s .2s linear;
			}
			.video-js .vjs-download-button.goodTube_loading .vjs-icon-placeholder:before {
				opacity: 0;
				transition: opacity .2s linear;
			}

			.goodTube_spinner {
				color: #ffffff;
				pointer-events: none;
			}
			.goodTube_spinner,
			.goodTube_spinner div {
				box-sizing: border-box;
			}
			.goodTube_spinner {
				display: inline-block;
				position: relative;
				width: 36px;
				height: 36px;
			}
			.goodTube_spinner div {
				position: absolute;
				border: 2px solid currentColor;
				opacity: 1;
				border-radius: 50%;
				animation: goodTube_spinner 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
			}
			.goodTube_spinner div:nth-child(2) {
				animation-delay: -0.5s;
			}
			@keyframes goodTube_spinner {
				0% {
					top: 16px;
					left: 16px;
					width: 4px;
					height: 4px;
					opacity: .5;
				}
				4.9% {
					top: 16px;
					left: 16px;
					width: 4px;
					height: 4px;
					opacity: .5;
				}
				5% {
					top: 16px;
					left: 16px;
					width: 4px;
					height: 4px;
					opacity: 1;
				}
				100% {
					top: 0;
					left: 0;
					width: 36px;
					height: 36px;
					opacity: 0;
				}
			}



			.video-js .vjs-source-button .vjs-icon-placeholder:before {
				content: "\\f10e";
			}

			.video-js .vjs-autoplay-button .vjs-icon-placeholder:before {
				content: "\\f102";
			}

			.video-js .vjs-quality-selector .vjs-icon-placeholder:before {
				content: "\\f114";
			}

			.video-js .vjs-source-button .vjs-icon-placeholder:before {
				content: "\\f10e";
			}

			.video-js .vjs-miniplayer-button .vjs-icon-placeholder:before {
				content: "\\f127";
			}

			.video-js .vjs-theater-button .vjs-icon-placeholder:before {
				content: "\\f115";
			}

			/* Youtube player style */
			.vjs-slider-horizontal .vjs-volume-level:before {
				font-size: 14px !important;
			}

			.vjs-volume-control {
				width: auto !important;
				margin-right: 0 !important;
			}

			.video-js .vjs-volume-panel.vjs-volume-panel-horizontal {
				transition: width .25s !important;
				z-index: 999;
			}

			.video-js .vjs-volume-panel .vjs-volume-control.vjs-volume-horizontal {
				transition: opacity .25s, width 1s !important;
				min-width: 0 !important;
				padding-right: 8px !important;
				pointer-events: none;
			}

			.video-js .vjs-volume-panel {
				margin-right: 6px !important;
			}

			.video-js .vjs-volume-panel.vjs-hover,
			.video-js .vjs-volume-panel.vjs-slider-active {
				margin-right: 16px !important;
			}

			.video-js .vjs-volume-panel.vjs-hover .vjs-volume-control.vjs-volume-horizontal {
				pointer-events: all;
			}

			.vjs-volume-bar.vjs-slider-horizontal {
				min-width: 52px !important;
			}

			.video-js.player-style-youtube .vjs-control-bar > .vjs-spacer {
				flex: 1;
				order: 2;
			}

			.video-js.player-style-youtube .vjs-play-progress .vjs-time-tooltip {
				display: none;
			}

			.video-js.player-style-youtube .vjs-play-progress::before {
				color: red;
				font-size: 0.85em;
				display: none;
			}

			.video-js.player-style-youtube .vjs-progress-holder:hover .vjs-play-progress::before {
				display: unset;
			}

			.video-js.player-style-youtube .vjs-control-bar {
				display: flex;
				flex-direction: row;
			}

			.video-js.player-style-youtube .vjs-big-play-button {
				top: 50%;
				left: 50%;
				margin-top: -0.81666em;
				margin-left: -1.5em;
			}

			.video-js.player-style-youtube .vjs-menu-button-popup .vjs-menu {
				margin-bottom: 2em;
			}

			.video-js ul.vjs-menu-content::-webkit-scrollbar {
				display: none;
			}

			.video-js .vjs-user-inactive:not(.vjs-paused) {
				cursor: none;
			}

			.video-js .vjs-text-track-display > div > div > div {
				border-radius: 0 !important;
				padding: 4px 8px !important;
				line-height: calc(1.2em + 7px) !important;
				white-space: break-spaces !important;
			}

			.video-js .vjs-play-control {
				order: 0;
			}

			.video-js .vjs-prev-button {
				order: 1;
			}

			.video-js .vjs-next-button {
				order: 2;
			}

			.video-js .vjs-volume-panel {
				order: 3;
			}

			/* Time control */
			html body #goodTube_playerWrapper .video-js .vjs-time-control {
				font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif !important;
				order: 4;
				font-size: 13.0691px !important;
				padding-top: 4px !important;
				color: rgb(221, 221, 221) !important;
				text-shadow: 0 0 2px rgba(0, 0, 0, .5) !important;
				min-width: 0 !important;
				z-index: 1;
			}

			html body #goodTube_playerWrapper .video-js .vjs-time-control * {
				min-width: 0 !important;
			}

			.video-js .vjs-current-time {
				padding-right: 4px !important;
				padding-left: 0 !important;
				margin-left: 0 !important;
			}

			.video-js .vjs-duration {
				padding-left: 4px !important;
				padding-right: 5px !important;
				margin-right: 0 !important;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-time-control {
				position: absolute;
				top: calc(100% - 98px);
				font-weight: 500;
				pointer-events: none;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-current-time {
				color: #ffffff !important;
			}

			.video-js .vjs-source-button {
				margin-left: auto !important;
				order: 5;
			}

			.video-js .vjs-download-button {
				order: 6;
			}

			.video-js .vjs-autoplay-button {
				order: 7;
			}

			.video-js .vjs-playback-rate {
				order: 8;
			}

			.video-js .vjs-subs-caps-button {
				order: 9;
			}

			.video-js .vjs-quality-selector {
				order: 10;
			}

			.video-js .vjs-miniplayer-button {
				order: 11;
			}

			.video-js .vjs-theater-button {
				order: 12;
			}

			.video-js .vjs-fullscreen-control {
				order: 13;
			}

			.video-js .vjs-control-bar {
				display: flex;
				flex-direction: row;
				scrollbar-width: none;
				height: 48px !important;
				background: transparent !important;
				z-index: 2 !important;
			}

			#goodTube_playerWrapper:not(.goodTube_mobile) .video-js::before {
				content: '';
				position: absolute;
				left: 0;
				right: 0;
				bottom: 0;
				height: 33.33%;
				background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAD1CAYAAACRFp+GAAAAAXNSR0IArs4c6QAAASpJREFUOE9lyOlHGAAcxvHuY63Wta3WsdWqdaz7vtfduoyZSBLJmCSSSCaSSBJJJIkk0h+Z7/Pm59Hz4sP3SUh4tUSeIIkMkkmR4qSSIs1JJ4MMUmQ6b0iR5bwlg2xS5DjvSJHr5JFBPikKnEIyeE+KD85HUhQ5xWTwiRQlTikpypxyMvhMii9OBSkqna9kUEWKaqeGDL6RotapI0W900AG30nR6DSRotlpIYNWUrQ57aTocDrJoIsU3U4PKXqdPjLoJ8WAM0gGQ6QYdn6QYsQZJYMxUow7E6SYdKbIYJoUP50ZUsw6c2QwTy7AL/gNf2ARlmAZVmAV1mAd/sI/2IBN2IJt2IFd2IN9+A8HcAhHcAwncApncA4XcAlXcA03cAt3cA8P8AhP8PwCakcyvVVFagcAAAAASUVORK5CYII=");
				background-size: cover;
				background-repeat: repeat-x;
				background-position: bottom;
				background-size: contain;
				pointer-events: none;
				opacity: 0;
				transition: opacity .1s linear;
				z-index: 1;
			}

			#goodTube_playerWrapper:not(.goodTube_mobile) .video-js.vjs-paused::before,
			#goodTube_playerWrapper:not(.goodTube_mobile) .video-js.vjs-user-active::before {
				opacity: 1;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control-bar::before {
				display: none;
				content: none;
			}

			.video-js .vjs-menu .vjs-icon-placeholder {
				display: none !important;
			}

			.video-js .vjs-menu .vjs-menu-content > * {
				padding-top: 8px !important;
				padding-bottom: 8px !important;
				padding-left: 12px !important;
				padding-right: 12px !important;
			}

			.video-js .vjs-menu {
				height: auto !important;
				bottom: 48px !important;
				padding-bottom: 0 !important;
				margin-bottom: 0 !important;
				width: auto !important;
				transform: translateX(-50%) !important;
				left: 50% !important;
			}

			.video-js .vjs-menu .vjs-menu-content {
				position: static !important;
				border-radius: 4px !important;
			}

			.video-js .vjs-volume-control {
				height: 100% !important;
				display: flex !important;
				align-items: center !important;
			}

			.video-js .vjs-vtt-thumbnail-display {
				bottom: calc(100% + 35px) !important;
				border-radius: 12px !important;
				overflow: hidden !important;
				border: 2px solid #ffffff !important;
				background-color: #000000 !important;
			}

			.video-js .vjs-control-bar .vjs-icon-placeholder {
				height: 100%;
			}

			.video-js .vjs-control {
				min-width: 48px !important;
			}

			#goodTube_playerWrapper:not(goodTube_mobile) .video-js .vjs-control-bar > .vjs-play-control {
				padding-left: 8px;
				box-sizing: content-box;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control:not(.vjs-progress-control) {
				min-width: 0 !important;
				flex-grow: 1 !important;
				max-width: 9999px !important;
				padding-left: 0 !important;
				padding-right: 0 !important;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control.vjs-volume-panel,
			#goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-control.vjs-volume-panel {
				display: none;
			}

			.video-js .vjs-control-bar .vjs-icon-placeholder::before {
				height: auto;
				top: 50%;
				transform: translateY(-50%);
				font-size: 24px;
				line-height: 100%;
			}

			.video-js .vjs-control-bar *:not(.vjs-time-control) {
				text-shadow: none !important;
			}

			.video-js .vjs-vtt-thumbnail-time {
				display: none !important;
			}

			.video-js .vjs-playback-rate .vjs-playback-rate-value {
				line-height: 48px;
				font-size: 14px !important;
				font-weight: 700;
			}

			.video-js .vjs-play-progress .vjs-time-tooltip {
				display: none !important;
			}

			.video-js .vjs-mouse-display .vjs-time-tooltip {
				background: none !important;
				font-size: 12px !important;
				top: -50px !important;
				text-shadow: 0 0 10px rgba(0, 0, 0, .5) !important;
				font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif !important;
				font-weight: 500 !important;
			}

			.video-js .vjs-control-bar::-webkit-scrollbar {
				display: none;
			}

			.video-js .vjs-icon-cog {
				font-size: 18px;
			}

			.video-js .vjs-control-bar,
			.video-js .vjs-menu-button-popup .vjs-menu .vjs-menu-content {
				background-color: rgba(35, 35, 35, 0.75);
			}

			.video-js .vjs-menu li.vjs-menu-item:not(.vjs-selected) {
				background-color: transparent !important;
				color: #ffffff !important;
			}

			.video-js .vjs-menu li.vjs-menu-item:not(.vjs-selected):hover {
				background-color: rgba(255, 255, 255, 0.75) !important;
				color: rgba(49, 49, 51, 0.75) !important;
				color: #ffffff !important;
			}

			.video-js .vjs-menu li.vjs-selected,
			.video-js .vjs-menu li.vjs-selected:hover {
				background-color: #ffffff !important;
				color: #000000 !important;
			}

			.video-js .vjs-menu li {
				white-space: nowrap !important;
				font-size: 12px !important;
				font-weight: 700 !important;
				max-width: 9999px !important;
			}

			.video-js .vjs-subs-caps-button .vjs-menu li {
				white-space: normal !important;
				min-width: 128px !important;
			}

			/* Progress Bar */
			.video-js .vjs-slider {
				background-color: rgba(15, 15, 15, 0.5);
			}

			.video-js .vjs-load-progress,
			.video-js .vjs-load-progress div {
				background: rgba(87, 87, 88, 1);
			}

			.video-js .vjs-slider:hover,
			.video-js button:hover {
				color: #ffffff;
			}

			/* Overlay */
			.video-js .vjs-overlay {
				background-color: rgba(35, 35, 35, 0.75) !important;
			}
			.video-js .vjs-overlay * {
				color: rgba(255, 255, 255, 1) !important;
				text-align: center;
			}

			/* ProgressBar marker */
			.video-js .vjs-marker {
				background-color: rgba(255, 255, 255, 1);
				z-index: 0;
			}

			/* Big "Play" Button */
			.video-js .vjs-big-play-button {
				background-color: rgba(35, 35, 35, 0.5);
			}

			.video-js:hover .vjs-big-play-button {
				background-color: rgba(35, 35, 35, 0.75);
			}

			.video-js .vjs-current-time,
			.video-js .vjs-time-divider,
			.video-js .vjs-duration {
				display: block;
			}

			.video-js .vjs-time-divider {
				min-width: 0px;
				padding-left: 0px;
				padding-right: 0px;
			}

			.video-js .vjs-poster {
				background-size: cover;
				object-fit: cover;
			}

			.video-js .player-dimensions.vjs-fluid {
				padding-top: 82vh;
			}

			video.video-js {
				position: absolute;
				height: 100%;
			}

			.video-js .mobile-operations-bar {
				display: flex;
				position: absolute;
				top: 0;
				right: 1px !important;
				left: initial !important;
				width: initial !important;
			}

			.video-js .mobile-operations-bar ul {
				position: absolute !important;
				bottom: unset !important;
				top: 1.5em;
			}

			.video-js .vjs-menu-button-popup .vjs-menu {
				border: 0 !important;
				padding-bottom: 12px !important;
			}

			.video-js .vjs-menu li.vjs-menu-item:not(.vjs-selected):hover,
			.video-js .vjs-menu li.vjs-menu-item.vjs-auto-selected {
				background-color: rgba(255, 255, 255, .2) !important;
				color: #ffffff !important;
			}

			.video-js .vjs-menu * {
				border: 0 !important;
			}

			/* Tooltips
			------------------------------------------------------------------------------------------ */
			.video-js .vjs-control-bar > .vjs-prev-button::before {
				content: 'Previous video';
			}

			.video-js .vjs-control-bar > .vjs-next-button::before {
				content: 'Next video';
			}

			.video-js .vjs-control-bar .vjs-mute-control:not(.vjs-vol-0)::before {
				content: 'Mute (m)';
			}

			.video-js .vjs-control-bar .vjs-mute-control.vjs-vol-0::before {
				content: 'Unmute (m)';
			}

			.video-js .vjs-control-bar > .vjs-playback-rate > .vjs-menu-button::before {
				content: 'Playback speed';
			}

			.video-js .vjs-control-bar > .vjs-subs-caps-button > .vjs-menu-button::before {
				content: 'Subtitles';
			}

			.video-js .vjs-control-bar > .vjs-quality-selector > .vjs-menu-button::before {
				content: 'Quality';
			}

			.video-js .vjs-control-bar > .vjs-download-button > .vjs-menu-button::before {
				content: 'Download';
			}

			.video-js .vjs-control-bar > .vjs-autoplay-button > .vjs-menu-button::before {
				content: 'Autoplay';
			}

			.video-js .vjs-control-bar > .vjs-source-button > .vjs-menu-button::before {
				content: 'Video source';
			}

			.video-js .vjs-control-bar > .vjs-miniplayer-button::before {
				content: 'Miniplayer (i)';
			}

			.video-js .vjs-control-bar > .vjs-theater-button::before {
				content: 'Theater mode (t)';
			}

			.video-js .vjs-control-bar > .vjs-fullscreen-control::before {
				content: 'Fullscreen (f)';
				left: auto !important;
				right: 12px !important;
				transform: none !important;
			}

			.video-js .vjs-control-bar button.vjs-menu-button::before,
			.video-js .vjs-control-bar .vjs-button:not(.vjs-menu-button)::before {
				position: absolute;
				top: -40px;
				left: 50%;
				transform: translateX(-50%);
				background: rgba(0, 0, 0, .75);
				border-radius: 4px;
				font-size: 12px;
				font-weight: 600;
				padding: 8px;
				white-space: nowrap;
				opacity: 0;
				transition: opacity .1s;
				pointer-events: none;
				text-shadow: none !important;
				z-index: 1;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control-bar button.vjs-menu-button::before,
			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control-bar .vjs-button:not(.vjs-menu-button)::before {
				display: none !important;
				content: none !important;
			}

			.video-js .vjs-control-bar div.vjs-menu-button:not(.vjs-menuOpen) button.vjs-menu-button:hover::before,
			.video-js .vjs-control-bar .vjs-button:not(.vjs-menu-button):hover::before {
				opacity: 1;
			}

			.video-js div.vjs-menu-button:not(.vjs-menuOpen) .vjs-menu {
				display: none !important;
			}

			.video-js div.vjs-menu-button.vjs-menuOpen .vjs-menu {
				display: block !important;
			}

			.video-js .vjs-menu {
				z-index: 999 !important;
			}

			.video-js .vjs-big-play-button {
				display: none !important;
			}

			.video-js .vjs-volume-panel,
			.video-js .vjs-button {
				z-index: 1;
			}

			.video-js .vjs-button.vjs-menuOpen {
				z-index: 999;
			}

			.video-js .vjs-error-display .vjs-modal-dialog-content {
				display: none;
			}

			.video-js:not(.vjs-has-started) .vjs-control-bar {
				display: flex !important;
			}

			.vjs-track-settings-controls button:hover {
				color: #000000 !important;
			}
		`;

		document.body.appendChild(style);
	}

	// Update video js
	function goodTube_videojs_update() {
		// Make menus work
		let menuButtons = document.querySelectorAll('.vjs-control-bar button');
		menuButtons.forEach((button) => {
			button.onclick = function() {
				let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');
				openMenuButtons.forEach((openMenuButton) => {
					if (openMenuButton != button.closest('div.vjs-menu-button')) {
						openMenuButton.classList.remove('vjs-menuOpen');
					}
				});

				let menu = button.closest('div.vjs-menu-button');

				if (menu) {
					if (menu.classList.contains('vjs-menuOpen')) {
						menu.classList.remove('vjs-menuOpen');
					}
					else {
						menu.classList.add('vjs-menuOpen');
					}
				}
			}

			button.ontouchstart = function() {
				let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');
				openMenuButtons.forEach((openMenuButton) => {
					if (openMenuButton != button.closest('div.vjs-menu-button')) {
						openMenuButton.classList.remove('vjs-menuOpen');
					}
				});

				let menu = button.closest('div.vjs-menu-button');

				if (menu) {
					if (menu.classList.contains('vjs-menuOpen')) {
						menu.classList.remove('vjs-menuOpen');
					}
					else {
						menu.classList.add('vjs-menuOpen');
					}
				}
			}
		});

		const onClickOrTap = (element, handler) => {
			let touchMoveHappened = false;

			function touchstart() {
				touchMoveHappened = false;
			}

			function touchmove() {
				touchMoveHappened = true;
			}

			function touchend(e) {
				if (touchMoveHappened) {
					return;
				}

				handler(e);
			}

			function click(e) {
				handler(e);
			}

			element.addEventListener('touchstart', touchstart);
			element.addEventListener('touchmove', touchmove);
			element.addEventListener('touchend', touchend);
			element.addEventListener('click', click);
		};

		// Click menu item, close menu
		let menuItems = document.querySelectorAll('.vjs-menu-item');
		menuItems.forEach((item) => {
			onClickOrTap(item, (e) => {
				let delay = 0;

				if (goodTube_mobile) {
					delay = 400;
				}

				setTimeout(function() {
					let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');
					openMenuButtons.forEach((openMenuButton) => {
						openMenuButton.classList.remove('vjs-menuOpen');
					});
				}, delay);
			});
		});

		// Add a hover bar to the DOM if we haven't already (desktop only)
		if (!goodTube_mobile) {
			if (!document.querySelector('.goodTube_hoverBar')) {
				let hoverBar = document.createElement('div');
				hoverBar.classList.add('goodTube_hoverBar');
				document.querySelector('.video-js .vjs-progress-control').appendChild(hoverBar);

				// Add actions to size the hover bar
				document.querySelector('.video-js .vjs-progress-control').addEventListener('mousemove', function(event) {
					window.requestAnimationFrame(function() {
						hoverBar.style.width = document.querySelector('.video-js .vjs-progress-control .vjs-mouse-display').style.left;
					});

				});
			}
		}
	}


	/* Usage stats
	------------------------------------------------------------------------------------------ */
	// Don't worry everyone - this is just a counter that totals unique users / how many videos were played with GoodTube.
	// It's only in here so I can have some fun and see how many people use this thing I made - no private info is tracked.

	// Count unique users
	function goodTube_stats_user() {
		if (!goodTube_helper_getCookie('goodTube_unique_new2')) {
			fetch('https://api.counterapi.dev/v1/goodtube/users/up/');

			// Set a cookie to only count users once
			goodTube_helper_setCookie('goodTube_unique_new2', 'true');
		}
	}

	// Count videos
	function goodTube_stats_video() {
		fetch('https://api.counterapi.dev/v1/goodtube/videos/up/');
	}


	/* Downloads
	------------------------------------------------------------------------------------------ */
	let goodTube_downloadTimeouts = [];
	let goodTube_pendingDownloads = [];

	// Que download video / audio for a specificed youtube ID
	function goodTube_download_addToQue(serverIndex, type, youtubeId, fileName, codec) {
		// Ensure filename as a value
		if (typeof fileName === 'undefined') {
			fileName = '';
		}

		// Stop if this is no longer a pending download
		if (typeof goodTube_pendingDownloads[youtubeId] === 'undefined') {
			return;
		}

		// If we're out of download servers to try, show an error
		if (typeof goodTube_downloadServers[serverIndex] === 'undefined') {
			// Remove from pending downloads
			if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
				delete goodTube_pendingDownloads[youtubeId];
			}

			// Debug message
			if (typeof fileName !== 'undefined') {
				alert('[GoodTube] '+type.charAt(0).toUpperCase()+type.slice(1)+' - '+fileName+' could not be downloaded. Please try again soon.');
				console.log('[GoodTube] '+type.charAt(0).toUpperCase()+type.slice(1)+' - '+fileName+' could not be downloaded. Please try again soon.');
			}
			else {
				alert('[GoodTube] '+type.charAt(0).toUpperCase()+type.slice(1)+' could not be downloaded. Please try again soon.');
				console.log('[GoodTube] '+type.charAt(0).toUpperCase()+type.slice(1)+' could not be downloaded. Please try again soon.');
			}

			// Hide the downloading indicator
			goodTube_download_hideDownloading();

			return;
		}

		// Show the downloading indicator
		goodTube_download_showDownloading();

		// Delay calling the API 3s since it was last called
		let delaySeconds = 0;
		let currentTimeSeconds = new Date().getTime() / 1000;
		let lastDownloadTimeSeconds = parseFloat(goodTube_helper_getCookie('goodTube_lastDownloadTimeSeconds'));
		if (lastDownloadTimeSeconds) {
			delaySeconds = (3 - (currentTimeSeconds - lastDownloadTimeSeconds));

			if (delaySeconds < 0) {
				delaySeconds = 0;
			}
		}
		goodTube_helper_setCookie('goodTube_lastDownloadTimeSeconds', (currentTimeSeconds + delaySeconds));

		goodTube_downloadTimeouts[youtubeId] = setTimeout(function() {
			// Debug message
			if (fileName !== '') {
				console.log('[GoodTube] Downloading '+type+' - '+fileName+'...');
			}
			else {
				console.log('[GoodTube] Downloading '+type+'...');
			}

			// CODEC:
			// Desktop tries in this order: vp9, av1, h264
			// Mobile tries in this order: h264, av1, vp9

			// Set the default codec (first download call)
			let vCodec = 'vp9';
			if (goodTube_mobile) {
				vCodec = 'h264';
			}

			// If a codec was passed to this function (cus it retried itself) - then use that
			if (typeof codec !== 'undefined') {
				vCodec = codec;
			}

			// Audio only option
			let isAudioOnly = false;
			if (type === 'audio') {
				isAudioOnly = true;
			}

			// Setup options to call the API
			let jsonData = JSON.stringify({
				'url': 'https://www.youtube.com/watch?v='+youtubeId,
				'vCodec': vCodec,
				'vQuality': 'max',
				'filenamePattern': 'basic',
				'isAudioOnly': isAudioOnly
			});

			// Call the API (die after 10s)
			fetch(goodTube_downloadServers[serverIndex]+'/api/json', {
				signal: AbortSignal.timeout(10000),
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: jsonData
			})
			.then(response => response.text())
			.then(data => {
				// Stop if this is no longer a pending download
				if (typeof goodTube_pendingDownloads[youtubeId] === 'undefined') {
					return;
				}

				// Turn data into JSON
				data = JSON.parse(data);

				// Try again if we've hit the API rate limit
				if (typeof data['status'] !== 'undefined' && data['status'] === 'rate-limit') {
					if (typeof goodTube_pendingRetry['download_'+youtubeId] !== 'undefined') {
						clearTimeout(goodTube_pendingRetry['download_'+youtubeId]);
					}

					goodTube_pendingRetry['download_'+youtubeId] = setTimeout(function() {
						goodTube_download_addToQue(serverIndex, type, youtubeId, fileName);
					}, goodTube_retryDelay);

					return;
				}

				// If there was an error returned from the API
				if (typeof data['status'] !== 'undefined' && data['status'] === 'error') {
					// If there was an issue with the codec, try the next one.
					// There should be an error with the word 'settings' in it if this happens.
					let nextCodec = false;
					if (typeof data['text'] !== 'undefined' && data['text'].toLowerCase().indexOf('settings') !== -1) {
						// Select the next codec

						// Desktop
						if (!goodTube_mobile) {
							if (vCodec === 'vp9') {
								nextCodec = 'av1';
							}
							else if (vCodec === 'av1') {
								nextCodec = 'h264';
							}
						}

						// Mobile
						if (goodTube_mobile) {
							if (vCodec === 'h264') {
								nextCodec = 'av1';
							}
							else if (vCodec === 'av1') {
								nextCodec = 'vp9';
							}
						}

						// If there's a next codec available (and we're not out of options)
						if (nextCodec) {
							// Retry with the next codec
							if (typeof goodTube_pendingRetry['download_'+youtubeId] !== 'undefined') {
								clearTimeout(goodTube_pendingRetry['download_'+youtubeId]);
							}

							goodTube_pendingRetry['download_'+youtubeId] = setTimeout(function() {
								goodTube_download_addToQue(serverIndex, type, youtubeId, fileName, nextCodec);
							}, goodTube_retryDelay);

							return;
						}
						// Otherwise, there's no more codecs to try, so display an error
						else {
							// Debug message
							console.log('[GoodTube] Could not download '+type+' - '+fileName);

							// Remove from pending downloads
							if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
								delete goodTube_pendingDownloads[youtubeId];
							}

							// Hide the downloading indicator
							setTimeout(function() {
								goodTube_download_hideDownloading();
							}, 1000);

							return;
						}
					}
					// All other errors, just try again
					else {
						if (typeof goodTube_pendingRetry['download_'+youtubeId] !== 'undefined') {
							clearTimeout(goodTube_pendingRetry['download_'+youtubeId]);
						}

						serverIndex++;

						goodTube_pendingRetry['download_'+youtubeId] = setTimeout(function() {
							goodTube_download_addToQue(serverIndex, type, youtubeId, fileName);
						}, goodTube_retryDelay);

						return;
					}
				}

				// If the data is all good
				else if (typeof data['status'] !== 'undefined' && typeof data['url'] !== 'undefined') {
					// Download the file
					goodTube_download_file(data['url'], type, fileName, youtubeId, serverIndex);
				}
			})
			// If anything went wrong, try again
			.catch((error) => {
				if (typeof goodTube_pendingRetry['download_'+youtubeId] !== 'undefined') {
					clearTimeout(goodTube_pendingRetry['download_'+youtubeId]);
				}

				serverIndex++;

				goodTube_pendingRetry['download_'+youtubeId] = setTimeout(function() {
					goodTube_download_addToQue(serverIndex, type, youtubeId, fileName);
				}, goodTube_retryDelay);
			});
		}, (delaySeconds * 1000));
	}

	// Download the entire playlist
	function goodTube_download_playlist(type, noPrompt) {
		// Show a "are you sure cus it takes some time" sort of message
		if (typeof noPrompt === 'undefined' && !confirm("Are you sure you want to download this playlist ("+type+")?\r\rYou can keep playing and downloading other videos, just don't close the tab :)")) {
			return;
		}

		// Debug message
		if (typeof noPrompt === 'undefined') {
			console.log('[GoodTube] Downloading '+type+' playlist...');
		}

		// Get the playlist items
		let playlistItems = document.querySelectorAll('#goodTube_playlistContainer a');

		// Make sure the data is all good
		if (playlistItems.length <= 0) {
			console.log('[GoodTube] Downloading failed, could not find playlist data.');
			return;
		}

		let track = 0;
		playlistItems.forEach((playlistItem) => {
			// Get playlist info
			let fileName = goodTube_helper_padNumber((track + 1), 2)+' - '+playlistItem.innerHTML.trim();
			let url = playlistItem.href;

			// Make sure the data is all good
			if (!fileName || !url) {
				console.log('[GoodTube] Downloading failed, could not find playlist data.');
				return;
			}

			let urlGet = url.split('?')[1];

			let getParams = {};
			urlGet.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function() {
				function decode(s) {
					return decodeURIComponent(s.split("+").join(" "));
				}

				getParams[decode(arguments[1])] = decode(arguments[2]);
			});

			let id = getParams['v'];

			// Add to pending downloads
			goodTube_pendingDownloads[id] = true;

			// Download the video
			goodTube_download_addToQue(0, type, id, fileName);

			track++;
		});
	}

	// Download a file as blob (this allows us to name it so we use it for playlists - but it doesn't actually download the file until it's fully loaded in the browser, which is kinda bad UX...but for now, it works!)
	function goodTube_download_file(url, type, fileName, youtubeId, serverIndex) {
		// Stop if this is no longer a pending download
		if (typeof goodTube_pendingDownloads[youtubeId] === 'undefined') {
			return;
		}

		// Show the downloading indicator
		goodTube_download_showDownloading();

		// Set the file extension based on the type
		let fileExtension = '.mp4';
		if (type === 'audio') {
			fileExtension = '.mp3';
		}

		// Download as a blob on desktop (only if we have a filename / as that's a playlist)
		if (!goodTube_mobile && fileName !== '') {
			// Get the file
			fetch(url)
			.then(response => response.blob())
			.then(blob => {
				// Stop if this is no longer a pending download
				if (typeof goodTube_pendingDownloads[youtubeId] === 'undefined') {
					return;
				}

				// Get the blob
				let blobUrl = URL.createObjectURL(blob);

				// Create a download link element and set params
				let a = document.createElement('a');
				a.style.display = 'none';
				a.href = blobUrl;
				a.download = fileName+fileExtension;
				document.body.appendChild(a);

				// Click the link to download
				a.click();

				// Remove the blob from memory
				window.URL.revokeObjectURL(blobUrl);

				// Remove the link
				a.remove();

				// Debug message
				console.log('[GoodTube] Downloaded '+type+' - '+fileName);

				// Remove from pending downloads
				if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
					delete goodTube_pendingDownloads[youtubeId];
				}

				// Hide the downloading indicator
				goodTube_download_hideDownloading();
			})
			// If anything went wrong, try again (next download server)
			.catch((error) => {
				if (typeof goodTube_pendingRetry['download_'+youtubeId] !== 'undefined') {
					clearTimeout(goodTube_pendingRetry['download_'+youtubeId]);
				}

				serverIndex++;

				goodTube_pendingRetry['download_'+youtubeId] = setTimeout(function() {
					goodTube_download_addToQue(serverIndex, type, youtubeId, fileName);
				}, goodTube_retryDelay);
			});
		}
		// Just open the stream URL on mobile (or for single files without a filename)
		else {
			window.open(url, '_self');

			// Debug message
			if (fileName !== '') {
				console.log('[GoodTube] Downloaded '+type+' - '+fileName);
			}
			else {
				console.log('[GoodTube] Downloaded '+type);
			}

			// Remove from pending downloads
			if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
				delete goodTube_pendingDownloads[youtubeId];
			}

			// Hide the downloading indicator
			setTimeout(function() {
				goodTube_download_hideDownloading();
			}, 1000);
		}
	}

	// Cancel all pending downloads
	function goodTube_download_cancelAll() {
		// Show "are you sure" prompt
		if (!confirm("Are you sure you want to cancel all downloads?")) {
			return;
		}

		// Remove all pending downloads
		goodTube_pendingDownloads = [];

		// Clear all download timeouts
		for (let key in goodTube_downloadTimeouts) {
			clearTimeout(goodTube_downloadTimeouts[key]);
			delete goodTube_downloadTimeouts[key];
		}

		// Hide the downloading indicator
		goodTube_download_hideDownloading(true);

		// Debug message
		console.log('[GoodTube] Downloads cancelled');
	}

	// Show downloading indicator
	function goodTube_download_showDownloading() {
		let loadingElement = document.querySelector('.vjs-download-button');

		// If there's no spinner, add one
		let spinnerElement = document.querySelector('.vjs-download-button .goodTube_spinner');
		if (!spinnerElement) {
			let spinnerIcon = document.createElement('div');
			spinnerIcon.classList.add('goodTube_spinner');
			spinnerIcon.innerHTML = "<div></div><div></div>";

			loadingElement.append(spinnerIcon);
		}

		if (loadingElement && !loadingElement.classList.contains('goodTube_loading')) {
			loadingElement.classList.add('goodTube_loading');
		}
	}

	// Hide downloading indicator
	function goodTube_download_hideDownloading(hideMessage) {
		// Only do this if we've finished all downloads (this is a weird if statement, but it works to check the length of an associative array)
		if (Reflect.ownKeys(goodTube_pendingDownloads).length > 1) {
			return;
		}

		let loadingElement = document.querySelector('.vjs-download-button');

		if (loadingElement && loadingElement.classList.contains('goodTube_loading')) {
			loadingElement.classList.remove('goodTube_loading');
		}

		// Set the last download time in seconds to now
		goodTube_helper_setCookie('goodTube_lastDownloadTimeSeconds', (new Date().getTime() / 1000));

		// Debug message
		if (typeof hideMessage === 'undefined') {
			console.log('[GoodTube] Downloads finished');
		}
	}

	// Show or hide the download playlist buttons
	function goodTube_download_showHideDownloadPlaylistButtons() {
		// Target the playlist buttons
		let playlistButton_cancel = document.querySelector('.goodTube_download_playlist_cancel');
		let goodTube_download_playlist_video = document.querySelector('.goodTube_download_playlist_video');
		let goodTube_download_playlist_audio = document.querySelector('.goodTube_download_playlist_audio');

		// Make sure the playlist buttons exist
		if (!playlistButton_cancel || !goodTube_download_playlist_video || !goodTube_download_playlist_audio) {
			return;
		}

		// If we're viewing a playlist
		if (typeof goodTube_getParams['i'] !== 'undefined' || typeof goodTube_getParams['index'] !== 'undefined' || typeof goodTube_getParams['list'] !== 'undefined') {
			// Show the download playlist buttons
			goodTube_helper_showElement(goodTube_download_playlist_video);
			goodTube_helper_showElement(goodTube_download_playlist_audio);
		}
		// If we're not viewing a playlist
		else {
			// Hide the download playlist buttons
			goodTube_helper_hideElement(goodTube_download_playlist_video);
			goodTube_helper_hideElement(goodTube_download_playlist_audio);
		}

		// If there's pendng downloads (this is a weird if statement, but it works to check the length of an associative array)
		if (Reflect.ownKeys(goodTube_pendingDownloads).length > 1) {
			// Show the cancel button
			goodTube_helper_showElement(playlistButton_cancel);
		}
		// If there's no pending downloads
		else {
			// Hide the cancel button
			goodTube_helper_hideElement(playlistButton_cancel);
		}
	}


	/* Navigation (playlists and autoplay)
	------------------------------------------------------------------------------------------ */
	let goodTube_nav_clickedPlaylistOpen = false;
	let goodTube_nav_prevVideo = [];
	let goodTube_nav_prevButton = false;
	let goodTube_nav_nextButton = true;

	// Generate playlist links (these are internally used to help us navigate through playlists and use autoplay)
	function goodTube_nav_generatePlaylistLinks() {
		// If we're not viewing a playlist, just return.
		if (typeof goodTube_getParams['i'] === 'undefined' && typeof goodTube_getParams['index'] === 'undefined' && typeof goodTube_getParams['list'] === 'undefined') {
			return;
		}

		// Get the playlist items
		let playlistLinks = false;
		let playlistTitles = false;

		// Desktop
		if (!goodTube_mobile) {
			playlistLinks = document.querySelectorAll('#playlist-items > a');
			playlistTitles = document.querySelectorAll('#playlist-items #video-title');
		}
		// Mobile
		else {
			playlistLinks = document.querySelectorAll('ytm-playlist-panel-renderer a.compact-media-item-image');
			playlistTitles = document.querySelectorAll('ytm-playlist-panel-renderer .compact-media-item-headline span');
		}

		// If the playlist links exist
		if (playlistLinks.length > 0) {
			// Target the playlist container
			let playlistContainer = document.getElementById('goodTube_playlistContainer');

			// Add the playlist container if we don't have it
			if (!playlistContainer) {
				playlistContainer = document.createElement('div');
				playlistContainer.setAttribute('id', 'goodTube_playlistContainer');
				playlistContainer.style.display = 'none';
				document.body.appendChild(playlistContainer);
			}

			// Empty the playlist container
			playlistContainer.innerHTML = '';

			// For each playlist item
			let i = 0;
			playlistLinks.forEach((playlistItem) => {
				// Create a link element
				let playlistItemElement = document.createElement('a');

				// Set the href
				playlistItemElement.href = playlistItem.href;

				// Set the title
				playlistItemElement.innerHTML = playlistTitles[i].innerHTML.trim();

				// If we're currently on this item, set the selected class
				if (playlistItem.href.indexOf('v='+goodTube_getParams['v']) !== -1) {
					playlistItemElement.classList.add('goodTube_selected');
				}

				// Add the item to the playlist container
				playlistContainer.appendChild(playlistItemElement);

				i++;
			});
		}
	}

	// Play the previous video
	function goodTube_nav_prev() {
		// Check if we clicked a playlist item
		let clickedPlaylistItem = false;

		// If we are viewing a playlist
		if (typeof goodTube_getParams['i'] !== 'undefined' || typeof goodTube_getParams['index'] !== 'undefined' || typeof goodTube_getParams['list'] !== 'undefined') {
			// Get the playlist items
			let playlistItems = document.querySelectorAll('#goodTube_playlistContainer a');

			// For each playlist item
			let clickNext = false;

			// Loop in reverse
			for (let i = (playlistItems.length - 1); i >= 0; i--) {
				let playlistItem = playlistItems[i];

				if (clickNext) {
					// Find the matching playlist item on the page and click it
					let bits = playlistItem.href.split('/watch');
					let findUrl = '/watch'+bits[1];

					// Desktop
					if (!goodTube_mobile) {
						clickedPlaylistItem = true;
						document.querySelector('#playlist-items > a[href="'+findUrl+'"]')?.click();
					}
					// Mobile
					else {
						clickedPlaylistItem = true;
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="'+findUrl+'"]')?.click();
					}

					if (clickedPlaylistItem) {
						clickedPlaylistItem = true;

						// Double check that the playlist is open, if not - open it.
						let playlistContainer = document.querySelector('ytm-playlist-panel-renderer');
						if (!playlistContainer) {
							let openButton = document.querySelector('ytm-playlist-panel-entry-point');

							if (openButton && !goodTube_nav_clickedPlaylistOpen) {
								goodTube_nav_clickedPlaylistOpen = true;
								openButton.click();
								setTimeout(goodTube_nav_prev, 500);
							}

							return;
						}

						goodTube_nav_clickedPlaylistOpen = false;

						// Click the matching playlist item
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="'+findUrl+'"]')?.click();
					}
				}

				if (playlistItem.classList.contains('goodTube_selected')) {
					clickNext = true;
				}
				else {
					clickNext = false;
				}
			}
		}

		// If we didn't click a playlist item, play previous video (if it exists in our history)
		if (!clickedPlaylistItem && goodTube_nav_prevVideo[goodTube_nav_prevVideo.length - 2] && goodTube_nav_prevVideo[goodTube_nav_prevVideo.length - 2] !== window.location.href) {
			// Debug message
			console.log('[GoodTube] Playing previous video...');

			// Go back to the previous video
			goodTube_helper_setCookie('goodTube_previous', 'true');
			window.history.go(-1);
		}
	}

	// Play the next video
	function goodTube_nav_next(pressedButton = false) {
		// Is autoplay turned on?
		let autoplay = goodTube_helper_getCookie('goodTube_autoplay');

		// Check if we clicked a playlist item
		let clickedPlaylistItem = false;

		// If we are viewing a playlist
		if (typeof goodTube_getParams['i'] !== 'undefined' || typeof goodTube_getParams['index'] !== 'undefined' || typeof goodTube_getParams['list'] !== 'undefined') {
			// Get the playlist items
			let playlistItems = document.querySelectorAll('#goodTube_playlistContainer a');

			// For each playlist item
			let clickNext = false;

			playlistItems.forEach((playlistItem) => {
				if (clickNext) {
					// Find the matching playlist item on the page and click it
					let bits = playlistItem.href.split('/watch');
					let findUrl = '/watch'+bits[1];

					// Desktop
					if (!goodTube_mobile) {
						clickedPlaylistItem = true;
						document.querySelector('#playlist-items > a[href="'+findUrl+'"]')?.click();
					}
					// Mobile
					else {
						clickedPlaylistItem = true;

						// Double check that the playlist is open, if not - open it.
						let playlistContainer = document.querySelector('ytm-playlist-panel-renderer');
						if (!playlistContainer) {
							let openButton = document.querySelector('ytm-playlist-panel-entry-point');

							if (openButton && !goodTube_nav_clickedPlaylistOpen) {
								goodTube_nav_clickedPlaylistOpen = true;
								openButton.click();
								setTimeout(goodTube_nav_next, 500);
							}

							return;
						}

						goodTube_nav_clickedPlaylistOpen = false;

						// Click the matching playlist item
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="'+findUrl+'"]')?.click();
					}

					if (clickedPlaylistItem) {
						// Debug message
						console.log('[GoodTube] Playing next video in playlist...');
					}
				}

				if (playlistItem.classList.contains('goodTube_selected')) {
					clickNext = true;
				}
				else {
					clickNext = false;
				}
			});
		}

		// If we didn't click a playlist item, autoplay next video (only if they pressed the next button or autoplay is on)
		if (!clickedPlaylistItem && (autoplay !== 'off' || pressedButton)) {
			let youtubeFrameAPI = document.getElementById('movie_player');
			youtubeFrameAPI.nextVideo();

			// Debug message
			console.log('[GoodTube] Autoplaying next video...');
		}
	}

	// Setup the previous button history
	function goodTube_nav_setupPrevHistory() {
		// If we've hit the previous button
		if (goodTube_helper_getCookie('goodTube_previous') === 'true') {
			// Remove the last item from the previous video array
			goodTube_nav_prevVideo.pop();

			goodTube_helper_setCookie('goodTube_previous', 'false');
		}
		// Otherwise it's a normal video load
		else {
			// Add this page to the previous video array
			goodTube_nav_prevVideo.push(window.location.href);
		}
	}

	// Show or hide the next and previous button
	function goodTube_nav_showHideNextPrevButtons() {
		goodTube_nav_prevButton = false;
		goodTube_nav_nextButton = true;

		// Don't show next / prev in the miniplayer / pip unless we're viewing a video
		if ((goodTube_miniplayer || goodTube_pip) && typeof goodTube_getParams['v'] === 'undefined') {
			goodTube_nav_prevButton = false;
			goodTube_nav_nextButton = false;
		}
		// For the regular player
		else {
			// If we're viewing a playlist
			if (typeof goodTube_getParams['i'] !== 'undefined' || typeof goodTube_getParams['index'] !== 'undefined' || typeof goodTube_getParams['list'] !== 'undefined') {
				let playlist = document.querySelectorAll('#goodTube_playlistContainer a');

				if (!playlist || !playlist.length) {
					return;
				}

				// If the first video is NOT selected
				if (!playlist[0].classList.contains('goodTube_selected')) {
					// Enable the previous button
					goodTube_nav_prevButton = true;
				}
			}
			// Otherwise we're not in a playlist, so if a previous video exists
			else if (goodTube_nav_prevVideo[goodTube_nav_prevVideo.length - 2] && goodTube_nav_prevVideo[goodTube_nav_prevVideo.length - 2] !== window.location.href) {
				// Enable the previous button
				goodTube_nav_prevButton = true;
			}
		}

		// Show or hide the previous button
		let prevButton = document.querySelector('.vjs-prev-button');
		if (prevButton) {
			if (!goodTube_nav_prevButton) {
				goodTube_helper_hideElement(prevButton);
			}
			else {
				goodTube_helper_showElement(prevButton);
			}
		}

		// Show or hide the next button
		let nextButton = document.querySelector('.vjs-next-button');
		if (nextButton) {
			if (!goodTube_nav_nextButton) {
				goodTube_helper_hideElement(nextButton);
			}
			else {
				goodTube_helper_showElement(nextButton);
			}
		}
	}


	/* Keyboard shortcuts
	------------------------------------------------------------------------------------------ */
	// Add keyboard shortcuts
	function goodTube_shortcuts_init(player) {
		document.addEventListener('keydown', function(event) {
			// Don't do anything if we're holding control
			if (event.ctrlKey) {
				return;
			}

			// Get the key pressed in lower case
			let keyPressed = event.key.toLowerCase();

			// Support bluetooth headset play/pause
			if (keyPressed === 'mediaplaypause' || event.keyCode === 179) {
				if (player.paused) {
					player.play();
				}
				else {
					player.pause();
				}
			}

			// If we're not focused on a HTML form element
			let focusedElement = event.srcElement;
			let focusedElement_tag = false;
			let focusedElement_id = false;
			if (focusedElement) {
				if (typeof focusedElement.nodeName !== 'undefined') {
					focusedElement_tag = focusedElement.nodeName.toLowerCase();
				}

				if (typeof focusedElement.getAttribute !== 'undefined') {
					focusedElement_id = focusedElement.getAttribute('id');
				}
			}

			if (
				!focusedElement ||
				(
					focusedElement_tag.indexOf('input') === -1 &&
					focusedElement_tag.indexOf('label') === -1 &&
					focusedElement_tag.indexOf('select') === -1 &&
					focusedElement_tag.indexOf('textarea') === -1 &&
					focusedElement_tag.indexOf('fieldset') === -1 &&
					focusedElement_tag.indexOf('legend') === -1 &&
					focusedElement_tag.indexOf('datalist') === -1 &&
					focusedElement_tag.indexOf('output') === -1 &&
					focusedElement_tag.indexOf('option') === -1 &&
					focusedElement_tag.indexOf('optgroup') === -1 &&
					focusedElement_id !== 'contenteditable-root'
				)
			) {
				// Speed up playback
				if (keyPressed === '>') {
					if (parseFloat(player.playbackRate) == .25) {
						player.playbackRate = .5;
					}
					else if (parseFloat(player.playbackRate) == .5) {
						player.playbackRate = .75;
					}
					else if (parseFloat(player.playbackRate) == .75) {
						player.playbackRate = 1;
					}
					else if (parseFloat(player.playbackRate) == 1) {
						player.playbackRate = 1.25;
					}
					else if (parseFloat(player.playbackRate) == 1.25) {
						player.playbackRate = 1.5;
					}
					else if (parseFloat(player.playbackRate) == 1.5) {
						player.playbackRate = 1.75;
					}
					else if (parseFloat(player.playbackRate) == 1.75) {
						player.playbackRate = 2;
					}
				}

				// Slow down playback
				else if (keyPressed === '<') {
					if (parseFloat(player.playbackRate) == .5) {
						player.playbackRate = .25;
					}
					else if (parseFloat(player.playbackRate) == .75) {
						player.playbackRate = .5;
					}
					else if (parseFloat(player.playbackRate) == 1) {
						player.playbackRate = .75;
					}
					else if (parseFloat(player.playbackRate) == 1.25) {
						player.playbackRate = 1;
					}
					else if (parseFloat(player.playbackRate) == 1.5) {
						player.playbackRate = 1.25;
					}
					else if (parseFloat(player.playbackRate) == 1.75) {
						player.playbackRate = 1.5;
					}
					else if (parseFloat(player.playbackRate) == 2) {
						player.playbackRate = 1.75;
					}
				}

				// If we're not holding down the shift key
				if (!event.shiftKey) {

					// If we're focused on the video element
					if (focusedElement && typeof focusedElement.closest !== 'undefined' && focusedElement.closest('#goodTube_player')) {
						// Volume down
						if (keyPressed === 'arrowdown') {
							if (player.volume >= .05) {
								player.volume -= .05;
							}
							else {
								player.volume = 0;
							}

							// No scroll
							event.preventDefault();
						}

						// Volume up
						if (keyPressed === 'arrowup') {
							if (player.volume <= .95) {
								player.volume += .05;
							}
							else {
								player.volume = 1;
							}

							// No scroll
							event.preventDefault();
						}

						// Theater mode (focus the body, this makes the default youtube shortcut work)
						if (keyPressed === 't') {
							document.querySelector('body').focus();
						}
					}

					// Prev 5 seconds
					if (keyPressed === 'arrowleft') {
						player.currentTime -= 5;
					}

					// Next 5 seconds
					if (keyPressed === 'arrowright') {
						player.currentTime += 5;
					}

					// Toggle play/pause
					if (keyPressed === ' ' || keyPressed === 'k') {
						if (player.paused || player.ended) {
							player.play();
						}
						else {
							player.pause();
						}
					}

					// Toggle mute
					if (keyPressed === 'm') {
						// Also check the volume, because player.muted isn't reliable
						if (player.muted || player.volume <= 0) {
							player.muted = false;

							// Small fix to make unmute work if you've manually turned it all the way down
							if (player.volume <= 0) {
								player.volume = 1;
							}
						}
						else {
							player.muted = true;
						}
					}

					// Toggle miniplayer
					if (keyPressed === 'i') {
						event.stopImmediatePropagation();
						goodTube_miniplayer_showHide();
					}

					// Toggle fullscreen
					if (keyPressed === 'f') {
						document.querySelector('.vjs-fullscreen-control')?.click();
					}

					// Prev 10 seconds
					else if (keyPressed === 'j') {
						player.currentTime -= 10;
					}

					// Next 10 seconds
					else if (keyPressed === 'l') {
						player.currentTime += 10;
					}

					// Start of video
					else if (keyPressed === 'home') {
						player.currentTime = 0;
					}

					// End of video
					else if (keyPressed === 'end') {
						player.currentTime += player.duration;
					}

					// Skip to percentage
					if (keyPressed === '0') {
						player.currentTime = 0;
					}
					else if (keyPressed === '1') {
						player.currentTime = ((player.duration / 100) * 10);
					}
					else if (keyPressed === '2') {
						player.currentTime = ((player.duration / 100) * 20);
					}
					else if (keyPressed === '3') {
						player.currentTime = ((player.duration / 100) * 30);
					}
					else if (keyPressed === '4') {
						player.currentTime = ((player.duration / 100) * 40);
					}
					else if (keyPressed === '5') {
						player.currentTime = ((player.duration / 100) * 50);
					}
					else if (keyPressed === '6') {
						player.currentTime = ((player.duration / 100) * 60);
					}
					else if (keyPressed === '7') {
						player.currentTime = ((player.duration / 100) * 70);
					}
					else if (keyPressed === '8') {
						player.currentTime = ((player.duration / 100) * 80);
					}
					else if (keyPressed === '9') {
						player.currentTime = ((player.duration / 100) * 90);
					}
				}
			}
		}, true);
	}

	// Trigger a keyboard shortcut
	function goodTube_shortcuts_trigger(shortcut) {
		let theKey = false;
		let keyCode = false;
		let shiftKey = false;

		if (shortcut === 'next') {
			theKey = 'n';
			keyCode = 78;
			shiftKey = true;
		}
		else if (shortcut === 'prev') {
			theKey = 'p';
			keyCode = 80;
			shiftKey = true;
		}
		else if (shortcut === 'theater') {
			theKey = 't';
			keyCode = 84;
			shiftKey = false;
		}
		else if (shortcut === 'fullscreen') {
			theKey = 'f';
			keyCode = 70;
			shiftKey = false;
		}
		else {
			return;
		}

		let e = false;
		e = new window.KeyboardEvent('focus', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('keydown', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('beforeinput', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('keypress', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('input', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('change', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);

		e = new window.KeyboardEvent('keyup', {
			bubbles: true,
			key: theKey,
			keyCode: keyCode,
			shiftKey: shiftKey,
			charCode: 0,
		});
		document.dispatchEvent(e);
	}


	/* Player functions
	------------------------------------------------------------------------------------------ */
	// Play
	function goodTube_player_play(player) {
		player.play();
	}

	// Pause
	function goodTube_player_pause(player) {
		player.pause();
	}

	// Toggle play pause
	function goodTube_player_togglePlayPause() {
		let playPauseButton = document.querySelector('.vjs-play-control');

		if (playPauseButton.classList.contains('vjs-playing')) {
			goodTube_player_play(goodTube_player);
		}
		else {
			goodTube_player_pause(goodTube_player);
		}
	}

	// Set volume
	function goodTube_player_volume(player, volume) {
		player.volume = volume;
	}

	// Skip to
	function goodTube_player_skipTo(player, time) {
		player.currentTime = time;
	}

	// Clear the player
	function goodTube_player_clear(player) {
		goodTube_error_hide();
		player.currentTime = 0;
		player.setAttribute('src', '');
		player.pause();

		// Clear any existing chapters
		goodTube_chapters_remove();

		// Remove the storyboard
		document.querySelector('.vjs-vtt-thumbnail-display')?.remove();

		// Remove any existing subtitles from videojs
		let existingSubtitles = goodTube_videojs_player.remoteTextTracks();
		if (typeof existingSubtitles['tracks_'] !== 'undefined') {
			existingSubtitles['tracks_'].forEach((existingSubtitle) => {
				goodTube_videojs_player.removeRemoteTextTrack(existingSubtitle);
			});
		}

		// Clear all qualities
		let qualityMenus = document.querySelectorAll('.vjs-quality-selector');
		if (qualityMenus && typeof qualityMenus[1] !== 'undefined') {
			let menuInner = qualityMenus[1].querySelector('ul');
			if (menuInner) {
				menuInner.innerHTML = '';
			}
		}
	}

	// Add loading state
	function goodTube_player_addLoadingState() {
		let player = document.getElementById('goodTube_player');

		if (!player.classList.contains('vjs-loading')) {
			player.classList.add('vjs-loading');
		}
		if (!player.classList.contains('vjs-waiting')) {
			player.classList.add('vjs-waiting');
		}
	}

	// Remove loading state
	function goodTube_player_removeLoadingState() {
		let player = document.getElementById('goodTube_player');

		if (player.classList.contains('vjs-loading')) {
			player.classList.remove('vjs-loading');
		}
		if (player.classList.contains('vjs-waiting')) {
			player.classList.remove('vjs-waiting');
		}
	}

	// Select video server
	function goodTube_player_selectVideoServer(url, reloadVideoData) {
		// Target the source menu
		let menu = document.querySelector('.vjs-source-button .vjs-menu');

		// Deselect the currently selected menu items
		let selectedMenuItems = menu.querySelectorAll('.vjs-selected');
		selectedMenuItems.forEach((selectedMenuItem) => {
			selectedMenuItem.classList.remove('vjs-selected');
		});

		// Automatic option
		if (url === 'automatic') {
			// Increment first to skip the first server (which is actually the automatic option itself)
			goodTube_videoServer_automaticIndex++;

			// If we're out of options, show an error
			if (typeof goodTube_videoServers[goodTube_videoServer_automaticIndex] === 'undefined') {
				goodTube_error_show();
				return;
			}

			// Select the next server
			goodTube_videoServer_type = goodTube_videoServers[goodTube_videoServer_automaticIndex]['type'];
			goodTube_videoServer_proxy = goodTube_videoServers[goodTube_videoServer_automaticIndex]['proxy'];
			goodTube_videoServer_url = goodTube_videoServers[goodTube_videoServer_automaticIndex]['url'];
			goodTube_videoServer_name = goodTube_videoServers[goodTube_videoServer_automaticIndex]['name'];

			// Set cookie to remember we're on automatic
			goodTube_helper_setCookie('goodTube_videoServer_withauto', url);

			// Add class from wrapper for styling automatic option
			let wrapper = document.querySelector('#goodTube_playerWrapper');
			if (!wrapper.classList.contains('goodTube_automaticServer')) {
				wrapper.classList.add('goodTube_automaticServer');
			}

			// Select the automatic menu item
			let automaticMenuOption = menu.querySelector('ul li:first-child');
			if (!automaticMenuOption.classList.contains('vjs-selected')) {
				automaticMenuOption.classList.add('vjs-selected');
			}
		}
		// Manual selection
		else {
			goodTube_videoServers.forEach((api) => {
				if (url == api['url']) {
					goodTube_videoServer_type = api['type'];
					goodTube_videoServer_proxy = api['proxy'];
					goodTube_videoServer_url = api['url'];
					goodTube_videoServer_name = api['name'];

					goodTube_helper_setCookie('goodTube_videoServer_withauto', url);
				}
			});

			// Remove class from wrapper for styling automatic option
			let wrapper = document.querySelector('#goodTube_playerWrapper');
			if (wrapper.classList.contains('goodTube_automaticServer')) {
				wrapper.classList.remove('goodTube_automaticServer');
			}

			// Reset the automatic selection
			goodTube_videoServer_automaticIndex = 0;
		}

		// Select the currently selected item
		let menuItems = menu.querySelectorAll('ul li');
		menuItems.forEach((menuItem) => {
			if (menuItem.getAttribute('api') == goodTube_videoServer_url) {
				menuItem.classList.add('vjs-selected');
			}
		});

		// Reload video data
		if (reloadVideoData) {
			goodTube_video_reloadData();
		}
	}

	// Init player
	function goodTube_player_init() {
		// Wait until the assets are loaded
		if (goodTube_assets_loaded < goodTube_assets.length) {
			setTimeout(function() {
				goodTube_player_init();
			}, 0);

			return;
		}

		// Add CSS styles for the player
		let style = document.createElement('style');
		style.textContent = `
			/* Default quality modal */
			#goodTube_playerWrapper .goodTube_defaultQualityModal {
				position: absolute;
				z-index: 99999;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				padding: 24px;
				transition: opacity .2s linear;
				opacity: 0;
				pointer-events: none;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_overlay {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0,0,0,.8);
				z-index: 1;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal.goodTube_defaultQualityModal_visible {
				opacity: 1;
				pointer-events: all;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_inner {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 264px;
				max-width: calc(100% - 32px);
				max-height: calc(100% - 32px);
				overflow: auto;
				background: #ffffff;
				border-radius: 12px;
				padding: 0;
				z-index: 2;
				box-shadow: 0 0 16px rgba(15, 15, 15, .3);
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_title {
				color: rgba(15, 15, 15);
				font-size: 16px;
				font-weight: 700;
				padding: 12px;
				padding-top: 16px;
				text-align: center;
				width: 100%;
				box-sizing: border-box;
				font-family: Roboto, Arial, Helvetica, sans-serif;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_options {
				padding-bottom: 12px;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_options .goodTube_defaultQualityModal_option {
				color: rgba(15, 15, 15);
				font-size: 14px;
				display: block;
				width: 100%;
				padding: 10px;
				text-align: center;
				font-weight: 400;
				text-decoration: none;
				box-sizing: border-box;
				transition: background-color .2s linear;
				cursor: pointer;
				font-family: Roboto, Arial, Helvetica, sans-serif;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_options .goodTube_defaultQualityModal_option.goodTube_defaultQualityModal_selected {
				background: rgba(15,15,15,.15);
				font-weight: 700;
			}

			#goodTube_playerWrapper .goodTube_defaultQualityModal .goodTube_defaultQualityModal_options .goodTube_defaultQualityModal_option:hover {
				background: rgba(15,15,15,.1);
			}


			/* Automatic server styling */
			#goodTube_playerWrapper.goodTube_automaticServer .vjs-source-button ul li:first-child,
			#goodTube_playerWrapper.goodTube_automaticServer .vjs-source-button ul li.vjs-selected:first-child {
				background: #ffffff !important;
				color: #000000 !important;
			}

			#goodTube_playerWrapper.goodTube_automaticServer .vjs-source-button ul li.vjs-selected {
				background-color: rgba(255, 255, 255, .2) !important;
				color: #ffffff !important;
			}


			/* Hide the volume tooltip */
			#goodTube_playerWrapper .vjs-volume-bar .vjs-mouse-display {
				display: none !important;
			}

			#contentContainer.tp-yt-app-drawer[swipe-open].tp-yt-app-drawer::after {
				display: none !important;
			}

			/* Live streams */
			#goodTube_playerWrapper .vjs-live .vjs-progress-control {
				display: block;
			}

			#goodTube_playerWrapper .vjs-live .vjs-duration-display,
			#goodTube_playerWrapper .vjs-live .vjs-time-divider {
				display: none !important;
			}

			/* Seek bar */
			#goodTube_playerWrapper .vjs-progress-control {
				position: absolute;
				bottom: 48px;
				left: 0;
				right: 0;
				width: 100%;
				height: calc(24px + 3px);
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider {
				margin: 0;
				background: transparent;
				position: absolute;
				bottom: 3px;
				left: 8px;
				right: 8px;
				top: auto;
				transition: height .1s linear, bottom .1s linear;
				z-index: 1;
			}

			#goodTube_playerWrapper .vjs-progress-control:hover .vjs-slider {
				pointer-events: none;
				height: 5px;
				bottom: 2px;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-load-progress {
				height: 100%;
				background: rgba(255, 255, 255, .2);
				transition: none;
				position: static;
				margin-bottom: -3px;
				transition: margin .1s linear;
			}

			#goodTube_playerWrapper .vjs-progress-control:hover .vjs-slider .vjs-load-progress {
				margin-bottom: -5px;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-load-progress .vjs-control-text {
				display: none;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-load-progress > div {
				background: transparent !important;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-play-progress {
				background: transparent;
				position: static;
				z-index: 1;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-play-progress::before {
				content: '';
				background: #ff0000;
				width: 100%;
				height: 100%;
				position: static;
				display: block;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-slider .vjs-play-progress::after {
				content: '';
				display: block;
				float: right;
				background: #ff0000;
				border-radius: 50%;
				opacity: 0;
				width: 13px;
				height: 13px;
				right: -7px;
				top: -8px;
				transition: opacity .1s linear, top .1s linear;
				position: relative;
			}

			#goodTube_playerWrapper .vjs-progress-control:hover .vjs-slider .vjs-play-progress::after {
				opacity: 1;
				top: -9px;
			}


			/* Without chapters */
			#goodTube_playerWrapper:not(.goodTube_hasChapters) .vjs-progress-control::before {
				content: '';
				position: absolute;
				bottom: 3px;
				left: 8px;
				right: 8px;
				height: 3px;
				background: rgba(255, 255, 255, .2);
				transition: height .1s linear, bottom .1s linear;
			}

			#goodTube_playerWrapper:not(.goodTube_hasChapters) .vjs-progress-control:hover::before {
				height: 5px;
				bottom: 2px;
			}


			/* With chapters */
			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_chapters {
				position: absolute;
				top: 0;
				bottom: 0;
				left: 8px;
				right: 8px;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter {
				height: 100%;
				position: absolute;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter::before {
				content: '';
				background: rgba(255, 255, 255, .2);
				position: absolute;
				left: 0;
				right: 2px;
				bottom: 3px;
				height: 3px;
				transition: height .1s linear, bottom .1s linear, background .1s linear;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter.goodTube_redChapter::before {
				background: #ff0000 !important;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter:last-child::before {
				right: 0;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control:hover .goodTube_chapters .goodTube_chapter::before {
				height: 5px;
				bottom: 2px;
			}

			#goodTube_playerWrapper.goodTube_hasChapters:not(.goodTube_mobile) .vjs-progress-control .goodTube_chapters .goodTube_chapter:hover::before {
				height: 9px;
				bottom: 0;
				background: rgba(255, 255, 255, .4);
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_markers {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				pointer-events: none;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_marker {
				width: 2px;
				height: 100%;
				position: absolute;
				background: rgba(0, 0, 0, .2);
				margin-left: -2px;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_marker.goodTube_showMarker {
				background: rgba(0, 0, 0, .6);
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .goodTube_marker:last-child {
				display: none;
			}

			#goodTube_playerWrapper .vjs-progress-control .vjs-mouse-display {
				background: transparent;
			}

			#goodTube_playerWrapper.goodTube_hasChapters .vjs-progress-control .vjs-mouse-display .vjs-time-tooltip::before {
				content: attr(chapter-title);
				display: block;
				white-space: nowrap;
				margin-bottom: 4px;
			}

			#goodTube_playerWrapper .vjs-progress-control .goodTube_hoverBar {
				background: rgba(255, 255, 255, .4);
				position: absolute;
				bottom: 3px;
				left: 8px;
				height: 3px;
				opacity: 0;
				transition: height .1s linear, bottom .1s linear, opacity .1s linear;
			}

			#goodTube_playerWrapper .vjs-progress-control:hover .goodTube_hoverBar {
				height: 5px;
				bottom: 2px;
				opacity: 1;
			}

			#goodTube_playerWrapper.goodTube_mobile .vjs-time-control .vjs-duration-display {
				white-space: nowrap;
			}

			#goodTube_playerWrapper.goodTube_mobile .vjs-time-control .vjs-duration-display::after {
				content: attr(chapter-title);
				display: inline-block;
				color: #ffffff;
				margin-left: 3px;
			}

			#goodTube_playerWrapper.goodTube_mobile .vjs-progress-control .vjs-slider,
			#goodTube_playerWrapper.goodTube_mobile:not(.goodTube_hasChapters) .vjs-progress-control::before,
			#goodTube_playerWrapper.goodTube_mobile.goodTube_hasChapters .vjs-progress-control .goodTube_chapters,
			#goodTube_playerWrapper.goodTube_mobile .vjs-progress-control .goodTube_hoverBar {
				left: 16px;
				right: 16px;
			}


			/* Audio only view */
			#goodTube_playerWrapper.goodTube_audio {
				background: #000000;
				position: relative;
			}

			#goodTube_playerWrapper.goodTube_audio .video-js::after {
				content: '\\f107';
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				color: #ffffff;
				font-family: VideoJS;
				font-weight: 400;
				font-style: normal;
				font-size: 148px;
				pointer-events: none;
			}

			@media (max-width: 768px) {
				#goodTube_playerWrapper.goodTube_audio .video-js::after {
					font-size: 100px;
				}
			}

			#goodTube_playerWrapper.goodTube_mobile #goodTube_playerWrapper.goodTube_audio .video-js::after {
				font-size: 100px;
			}

			/* Double tap or tap and hold elements for seeking on mobile */
			#goodTube_seekBackwards {
				position: absolute;
				top: 0;
				left: 0;
				bottom: 48px;
				content: '';
				width: 25%;
			}

			#goodTube_seekForwards {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 48px;
				content: '';
				width: 25%;
			}

			/* Desktop */
			#goodTube_playerWrapper {
				border-radius: 12px;
				background: #ffffff;
				position: absolute;
				top: 0;
				left: 0;
				z-index: 999;
				overflow: hidden;
			}

			html[dark] #goodTube_playerWrapper {
				background: #0f0f0f;
			}

			/* Mobile */
			#goodTube_playerWrapper.goodTube_mobile {
				position: fixed;
				background: #000000;
				border-radius: 0;
				z-index: 3;
			}

			/* Theater mode */
			#goodTube_playerWrapper.goodTube_theater {
				background: #000000;
				border-radius: 0;
			}

			/* Miniplayer */
			#goodTube_playerWrapper.goodTube_miniplayer {
				z-index: 999 !important;
			}

			#goodTube_playerWrapper.goodTube_miniplayer .video-js {
				position: fixed;
				bottom: 12px;
				right: 12px;
				width: 400px;
				max-width: calc(100% - 24px);
				min-height: 0;
				padding-top: 0;
				z-index: 999;
				height: auto;
				left: auto;
				aspect-ratio: 16 / 9;
				top: auto;
				overflow: hidden;
				background: #000000;
				border-radius: 12px;
			}
			#goodTube_playerWrapper.goodTube_miniplayer .video-js::before {
				content: none !important;
			}

			#goodTube_playerWrapper.goodTube_miniplayer.goodTube_mobile .video-js {
				bottom: 60px;
			}

			ytd-watch-flexy.goodTube_miniplayer {
				display: block !important;
				top: 0;
				left: 0;
				position: fixed;
				z-index: 999;
				top: -9999px;
				left: -9999px;
			}

			#goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-source-button,
			#goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-autoplay-button,
			#goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-miniplayer-button,
			#goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-theater-button {
				display: none !important;
			}

			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton {
				font-family: VideoJS;
				font-weight: 400;
				font-style: normal;
				cursor: pointer;
				position: absolute;
				top: 0;
				width: 48px;
				height: 48px;
				line-height: 48px;
				text-align: center;
				z-index: 999;
				color: #ffffff;
				opacity: 0;
				transition: opacity .2s linear;
			}


			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::after {
				content: 'Close';
				right: 12px;
			}
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::after {
				content: 'Expand';
				left: 12px;
			}
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::after,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::after {
				position: absolute;
				bottom: -24px;
				background: rgba(0, 0, 0, .75);
				border-radius: 4px;
				font-size: 12px;
				font-weight: 700;
				padding: 8px;
				white-space: nowrap;
				opacity: 0;
				transition: opacity .1s;
				pointer-events: none;
				text-shadow: none !important;
				z-index: 1;
				font-family: 'MS Shell Dlg 2', sans-serif;
				line-height: initial;
			}
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton:hover::after,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton:hover::after {
				opacity: 1;
			}

			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton {
				right: 0;
				font-size: 24px;
			}
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::before {
				content: "\\f119";
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}

			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton {
				left: 0;
				font-size: 18px;
			}
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::before {
				content: "\\f128";
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}


			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-paused:not(.vjs-user-inactive) #goodTube_miniplayer_expandButton,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-user-active #goodTube_miniplayer_expandButton,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-paused:not(.vjs-user-inactive) #goodTube_miniplayer_closeButton,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-user-active #goodTube_miniplayer_closeButton {
				opacity: 1;
			}

			/* Mobile */
			html body #goodTube_playerWrapper.goodTube_mobile {
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control.vjs-play-control,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-control.vjs-play-control {
				position: absolute;
				top: calc(50% - 48px);
				left: calc(50% - 32px);
				width: 64px;
				height: 64px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
				box-sizing: border-box;
			}
			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-play-control .vjs-icon-placeholder::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-play-control .vjs-icon-placeholder::before {
				font-size: 44px !important;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-prev-button,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-prev-button {
				position: absolute;
				top: calc(50% - 40px);
				left: calc(50% - 104px);
				width: 48px;
				height: 48px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
			}
			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-prev-button .vjs-icon-placeholder::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-prev-button .vjs-icon-placeholder::before {
				font-size: 32px !important;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-next-button,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-next-button {
				position: absolute;
				top: calc(50% - 40px);
				left: calc(50% + 56px);
				width: 48px;
				height: 48px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
			}
			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-next-button .vjs-icon-placeholder::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-next-button .vjs-icon-placeholder::before {
				font-size: 32px !important;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-control-bar,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-control-bar {
				z-index: 1;
				position: static;
				margin-top: auto;
				justify-content: space-around;
			}

			ytd-watch-flexy:not([theater]) #primary {
				min-width: 721px !important;
			}

			@media (max-width: 1100px) {
				ytd-watch-flexy:not([theater]) #primary {
					min-width: 636px !important;
				}

				#goodTube_playerWrapper:not(.goodTube_mobile):not(.goodTube_theater) .video-js .vjs-control-bar .vjs-button {
					zoom: .88;
				}
			}

			@media (max-width: 1016px) {
				ytd-watch-flexy:not([theater]) #primary {
					min-width: 0 !important;
				}

				#goodTube_playerWrapper:not(.goodTube_mobile):not(.goodTube_theater) .video-js .vjs-control-bar .vjs-button {
					zoom: 1;
				}
			}

			@media (max-width: 786px) {
				#goodTube_playerWrapper:not(.goodTube_mobile):not(.goodTube_theater) .video-js .vjs-control-bar .vjs-button {
					zoom: .9;
				}
			}

			@media (max-width: 715px) {
				#goodTube_playerWrapper:not(.goodTube_mobile):not(.goodTube_theater) .video-js .vjs-control-bar .vjs-button {
					zoom: .85;
				}
			}

			@media (max-width: 680px) {
				#goodTube_playerWrapper:not(.goodTube_mobile):not(.goodTube_theater) .video-js .vjs-control-bar .vjs-button {
					zoom: .8;
				}
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js {
				display: flex;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-source-button,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-source-button {
				margin-left: 0 !important;
			}

			@media (max-width: 480px) {
				html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-source-button .vjs-menu,
				html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-source-button .vjs-menu {
					left: auto !important;
					transform: none !important;
				}
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js .vjs-loading-spinner,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js .vjs-loading-spinner {
				top: calc(50% - 16px);
			}

			html body #goodTube_playerWrapper .video-js.vjs-loading {
				background: #000000;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js::before {
				content: '';
				background: transparent;
				transition: background .2s ease-in-out;
				pointer-events: none;
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 1;
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js.vjs-paused::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-paused::before,
			html body #goodTube_playerWrapper.goodTube_mobile .video-js.vjs-user-active::before,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-user-active::before {
				background: rgba(0,0,0,.6);
			}

			html body #goodTube_playerWrapper.goodTube_mobile .video-js.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar,
			html body #goodTube_playerWrapper.goodTube_miniplayer .video-js.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar {
				visibility: visible;
				opacity: 0;
				pointer-events: none;
			}

			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-theater-button,
			#goodTube_playerWrapper.goodTube_mobile .video-js .vjs-autoplay-button {
				display: none !important;
			}

			/* Video */
			#goodTube_player {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				width: 100%;
				height: 100%;
				background: transparent;
				z-index: 1;
			}

			#goodTube_playerWrapper.goodTube_mobile #goodTube_player,
			#goodTube_player.vjs-loading {
				background: #000000;
			}

			#goodTube_player:focus {
				outline: 0;
			}

			/* Error */
			#goodTube_error {
				position: absolute;
				top: 50%;
				left: 40px;
				right: 40px;
				transform: translateY(-50%);
				text-align: center;
				color: #ffffff;
				font-size: 20px;
				padding: 16px;
				background: #000000;
				border-radius: 8px;
			}

			#goodTube_error small {
				padding-top: 8px;
				display: block;
			}
		`;
		document.head.appendChild(style);

		// Setup player layout
		let playerWrapper = document.createElement('div');
		playerWrapper.id = 'goodTube_playerWrapper';

		// Add a mobile class
		if (goodTube_mobile) {
			playerWrapper.classList.add('goodTube_mobile');
		}

		// Setup player dynamic positioning and sizing
		goodTube_player_positionAndSize(playerWrapper);

		// Add player to the page
		document.body.appendChild(playerWrapper);

		// Add video
		let player = document.createElement('video');
		player.id = 'goodTube_player';
		player.classList.add('video-js');
		player.controls = true;
		player.setAttribute('tab-index', '1');
		playerWrapper.appendChild(player);

		// Expose the player globally
		goodTube_player = player;

		// Init picture in picture
		goodTube_pip_init();

		// Init videojs
		goodTube_videojs_init();

		// Init default quality modal
		goodTube_defaultQuality_initModal();

		// Sync players every 10s
		setInterval(goodTube_youtube_syncPlayers, 10000);

		// Run the main actions (these setup the player when the page changes)
		goodTube_actions();
		setInterval(goodTube_actions, 100);

		// Support timestamp links in comments
		setInterval(goodTube_youtube_timestampLinks, 500);

		// Generate the playlist links (used by GoodTube to navigate playlists correctly)
		setInterval(goodTube_nav_generatePlaylistLinks, 500);

		// Update our next / prev buttons to show or hide every 100ms
		setInterval(goodTube_nav_showHideNextPrevButtons, 100);

		// Update the download playlist buttons visibility
		setInterval(goodTube_download_showHideDownloadPlaylistButtons, 500);

		// Update pip actions
		setInterval(goodTube_pip_update, 100);

		// Update miniplayer
		setInterval(goodTube_miniplayer_update, 100);

		// Position timestamp (mobile only)
		if (goodTube_mobile) {
			setInterval(goodTube_player_positionTimestamp, 100);
		}

		// Add keyboard shortcuts
		goodTube_shortcuts_init(player);

		// If we're on mobile, set the volume to 100%
		if (goodTube_mobile) {
			goodTube_player_volume(goodTube_player, 1);
		}
	}


	/* Update player display
	------------------------------------------------------------------------------------------ */
	// Position and size the player
	function goodTube_player_positionAndSize(playerWrapper) {
		// If we're viewing a video
		if (typeof goodTube_getParams['v'] !== 'undefined') {
			// Show the GoodTube player
			goodTube_helper_showElement(playerWrapper);

			// This is used to position and size the player
			let positionElement = false;

			// Desktop
			if (!goodTube_mobile) {
				// Theater mode
				if (document.querySelector('ytd-watch-flexy[theater]')) {
					positionElement = document.getElementById('full-bleed-container');

					if (!playerWrapper.classList.contains('goodTube_theater')) {
						playerWrapper.classList.add('goodTube_theater');
					}
				}
				// Regular mode
				else {
					positionElement = document.getElementById('player');

					if (playerWrapper.classList.contains('goodTube_theater')) {
						playerWrapper.classList.remove('goodTube_theater');
					}
				}

				// Position the player
				if (positionElement && positionElement.offsetHeight > 0) {
					// Our wrapper has "position: absolute" so take into account the window scroll
					let rect = positionElement.getBoundingClientRect();
					playerWrapper.style.top = (rect.top + window.scrollY)+'px';
					playerWrapper.style.left = (rect.left + window.scrollX)+'px';

					// Match the size of the position element
					playerWrapper.style.width = positionElement.offsetWidth+'px';
					playerWrapper.style.height = positionElement.offsetHeight+'px';
				}
			}

			// Mobile
			else {
				positionElement = document.getElementById('player');

				// Position the player
				if (positionElement && positionElement.offsetHeight > 0) {
					// Our wrapper has "position: absolute" so don't take into account the window scroll
					let rect = positionElement.getBoundingClientRect();
					playerWrapper.style.top = rect.top+'px';
					playerWrapper.style.left = rect.left+'px';

					// Match the size of the position element
					playerWrapper.style.width = positionElement.offsetWidth+'px';
					playerWrapper.style.height = positionElement.offsetHeight+'px';
				}
			}

			// Fix the menu max heights
			if (positionElement) {
				let menus = document.querySelectorAll('.vjs-menu-content');
				menus.forEach((menu) => {
					menu.style.maxHeight = (positionElement.offsetHeight - 72)+'px';
				});
			}


		}
		// If we're not viewing a video
		else {
			// Hide the GoodTube player
			goodTube_helper_hideElement(playerWrapper);
		}

		// Call this function again on next draw frame
		window.requestAnimationFrame(function() {
			goodTube_player_positionAndSize(playerWrapper);
		});
	}

	// Position the timestamp (mobile only)
	function goodTube_player_positionTimestamp() {
		let currentTime = document.querySelector('.vjs-current-time');
		let divider = document.querySelector('.vjs-time-divider');
		let duration = document.querySelector('.vjs-duration');

		if (currentTime && divider && duration) {
			let leftOffset = 16;
			let padding = 4;

			currentTime.style.left = leftOffset+'px';
			divider.style.left = (leftOffset+currentTime.offsetWidth+padding)+'px';
			duration.style.left = (leftOffset+currentTime.offsetWidth+divider.offsetWidth+padding+padding)+'px';
		}
	}


	/* Video functions
	------------------------------------------------------------------------------------------ */
	let goodTube_player_loadVideoDataAttempts = 0;
	let goodTube_player_reloadVideoAttempts = 1;
	let goodTube_player_highestQuality = false;
	let goodTube_player_selectedQuality = false;
	let goodTube_player_manuallySelectedQuality = false;

	// Load video
	function goodTube_video_load(player) {
		// If we're not viewing a video
		if (typeof goodTube_getParams['v'] === 'undefined') {
			// Empty the previous video history
			goodTube_nav_prevVideo = [];

			// Then return, we don't do anything else.
			return;
		}

		// Clear any pending reloadVideo attempts
		goodTube_player_reloadVideoAttempts = 1;
		if (typeof goodTube_pendingRetry['reloadVideo'] !== 'undefined') {
			clearTimeout(goodTube_pendingRetry['reloadVideo']);
		}

		// Clear any pending loadVideoData attempts
		if (typeof goodTube_pendingRetry['loadVideoData'] !== 'undefined') {
			clearTimeout(goodTube_pendingRetry['loadVideoData']);
		}

		// Clear the player
		goodTube_player_clear(player);

		// Add the loading state
		goodTube_player_addLoadingState();

		// Only re-attempt to load the video data max configured retry attempts
		goodTube_player_loadVideoDataAttempts++;
		if (goodTube_player_loadVideoDataAttempts > goodTube_retryAttempts) {
			// Show an error or select next server if we're on automatic mode
			goodTube_error_show();

			return;
		}

		// Remove any existing video sources
		let videoSources_existing = player.querySelectorAll('source');
		videoSources_existing.forEach((videoSource) => {
			videoSource.remove();
		});

		// Setup API endpoint to get video data from
		let apiEndpoint = false;

		// Invidious (360p / HD)
		if (goodTube_videoServer_type === 1 || goodTube_videoServer_type === 2) {
			apiEndpoint = goodTube_videoServer_url+"/api/v1/videos/"+goodTube_getParams['v'];
		}
		// Piped (HD)
		else if (goodTube_videoServer_type === 3) {
			apiEndpoint = goodTube_videoServer_url+"/streams/"+goodTube_getParams['v'];
		}

		// Call the API (die after 5s)
		fetch(apiEndpoint, {
			signal: AbortSignal.timeout(5000)
		})
		.then(response => response.text())
		.then(data => {
			// Add the loading state
			goodTube_player_addLoadingState();

			// Turn video data into JSON
			let videoData = JSON.parse(data);

			// Setup variables to hold the data
			let sourceData = false;
			let subtitleData = false;
			let storyboardData = false;
			let chaptersData = false;
			let videoDescription = false;
			let videoDuration = false;

			// Below populates the source data - but first, if there's any issues with the source data, try again (after configured delay time)
			let retry = false;

			// Invidious (360p)
			if (goodTube_videoServer_type === 1) {
				if (typeof videoData['formatStreams'] === 'undefined') {
					retry = true;
				}
				else {
					sourceData = videoData['formatStreams'];
					subtitleData = videoData['captions'];
					storyboardData = videoData['storyboards'];
					videoDescription = videoData['description'];
					videoDuration = videoData['lengthSeconds'];
					chaptersData = false;
				}
			}
			// Invidious (HD)
			else if (goodTube_videoServer_type === 2) {
				if (typeof videoData['dashUrl'] === 'undefined' && typeof videoData['hlsUrl'] === 'undefined') {
					retry = true;
				}
				else {
					sourceData = false;
					subtitleData = videoData['captions'];
					storyboardData = videoData['storyboards'];
					videoDescription = videoData['description'];
					videoDuration = videoData['lengthSeconds'];
					chaptersData = false;
				}
			}
			// Piped (HD)
			else if (goodTube_videoServer_type === 3) {
				if (typeof videoData['hls'] === 'undefined' && typeof videoData['dash'] === 'undefined') {
					retry = true;
				}
				else {
					// Leave the subtitle data as false, because these are still fetched from invidious (using fallback servers)
					subtitleData = false;

					// Leave the storyboard data as false, because this is baked into the stream (yay!)
					storyboardData = false;

					// Replace <br> with a newline, and strip the html from the desc. We need this to generate chapters properly.
					videoDescription = videoData['description'].replace(/<br>/g, '\r\n').replace(/<[^>]*>?/gm, '');
					videoDuration = videoData['duration'];

					// Chapters come from the API
					if (typeof videoData['chapters'] !== 'undefined' && videoData['chapters'].length && videoData['chapters'].length > 0) {
						chaptersData = [];
						videoData['chapters'].forEach((chapter) => {
							chaptersData.push({
								time: parseFloat(chapter['start']),
								title: chapter['title']
							});
						});
					}
				}
			}


			// Try again if data wasn't all good
			if (retry) {
				if (typeof goodTube_pendingRetry['loadVideoData'] !== 'undefined') {
					clearTimeout(goodTube_pendingRetry['loadVideoData']);
				}

				goodTube_pendingRetry['loadVideoData'] = setTimeout(function() {
					goodTube_video_load(player);
				}, goodTube_retryDelay);

				// Add the loading state
				goodTube_player_addLoadingState();

				return;
			}
			// Otherwise the data was all good so load the sources
			else {
				// Debug message
				console.log('[GoodTube] Video data loaded');

				// Invidious (360p)
				if (goodTube_videoServer_type === 1) {
					// If we've manually selected a quality, and it exists for this video, select it
					if (goodTube_player_manuallySelectedQuality && player.querySelector('.goodTube_source_'+goodTube_player_manuallySelectedQuality)) {
						player.querySelector('.goodTube_source_'+goodTube_player_manuallySelectedQuality).setAttribute('selected', true);

						// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
						goodTube_player_selectedQuality = goodTube_player_manuallySelectedQuality;
					}
					// Otherwise select the highest quality source
					else {
						player.querySelector('.goodTube_source_'+goodTube_player_highestQuality)?.setAttribute('selected', true);

						// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
						goodTube_player_selectedQuality = goodTube_player_highestQuality;
					}

					// Add audio only source
					let audio_element = document.createElement('source');
					audio_element.setAttribute('src', goodTube_videoServer_url+"/watch?v="+goodTube_getParams['v']+'&raw=1&listen=1');
					audio_element.setAttribute('type', 'audio/mp3');
					audio_element.setAttribute('label', 'Audio');
					audio_element.setAttribute('video', true);
					audio_element.setAttribute('class', 'goodTube_source_audio');
					player.appendChild(audio_element);

					// For each source
					let i = 0;
					goodTube_player_highestQuality = false;
					sourceData.forEach((source) => {
						// Format the data correctly
						let source_src = false;
						let source_type = false;
						let source_label = false;
						let source_quality = false;

						source_src = goodTube_videoServer_url+'/latest_version?id='+goodTube_getParams['v']+'&itag='+source['itag'];
						if (goodTube_videoServer_proxy) {
							source_src = source_src+'&local=true';
						}

						source_type = source['type'];
						source_label = parseFloat(source['resolution'].replace('p', '').replace('hd', ''))+'p';
						source_quality = parseFloat(source['resolution'].replace('p', '').replace('hd', ''));

						// Only add the source to the player if the data is populated
						if (source_src && source_type && source_label) {

							// Add video
							if (source_type.toLowerCase().indexOf('video') !== -1) {
								let video_element = document.createElement('source');
								video_element.setAttribute('src', source_src);
								video_element.setAttribute('type', source_type);
								video_element.setAttribute('label', source_label);
								video_element.setAttribute('video', true);
								video_element.setAttribute('class', 'goodTube_source_'+source_quality);
								player.appendChild(video_element);

								// Keep track of the highest quality item
								if (!goodTube_player_highestQuality || source_quality > goodTube_player_highestQuality) {
									goodTube_player_highestQuality = source_quality;
								}
							}
						}

						// Increment the loop
						i++;
					});

					// If we've manually selected a quality, and it exists for this video, select it
					if (goodTube_player_manuallySelectedQuality && player.querySelector('.goodTube_source_'+goodTube_player_manuallySelectedQuality)) {
						player.querySelector('.goodTube_source_'+goodTube_player_manuallySelectedQuality).setAttribute('selected', true);

						// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
						goodTube_player_selectedQuality = goodTube_player_manuallySelectedQuality;
					}
					// Otherwise select the highest quality source
					else {
						player.querySelector('.goodTube_source_'+goodTube_player_highestQuality)?.setAttribute('selected', true);

						// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
						goodTube_player_selectedQuality = goodTube_player_highestQuality;
					}


					// Enable the videojs quality selector
					let qualities = [];
					player.querySelectorAll('source[video=true]').forEach((quality) => {
						qualities.push({
							src: quality.getAttribute('src'),
							type: quality.getAttribute('type'),
							label: quality.getAttribute('label'),
							selected: quality.getAttribute('selected')
						});
					});

					goodTube_videojs_player.src(qualities);


					// Show the correct quality menu item
					let qualityButtons = document.querySelectorAll('.vjs-quality-selector');
					if (qualityButtons.length === 2) {
						qualityButtons[1].style.display = 'none';
						qualityButtons[0].style.display = 'block';
					}
				}

				// Invidious (HD)
				else if (goodTube_videoServer_type === 2) {
					// Format manifest source data
					let manifestUrl = false;
					let manifestType = false;

					// Add manifest source
					let proxyUrlPart = 'false';
					if (goodTube_videoServer_proxy) {
						proxyUrlPart = 'true';
					}

					// HLS stream
					if (typeof videoData['hlsUrl'] !== 'undefined' && videoData['hlsUrl']) {
						manifestUrl = videoData['hlsUrl']+'?local='+proxyUrlPart+'&amp;unique_res=1';
						manifestType = 'application/x-mpegURL';
					}
					// DASH stream
					else if (typeof videoData['dashUrl'] !== 'undefined' && videoData['dashUrl']) {
						manifestUrl = videoData['dashUrl']+'?local='+proxyUrlPart+'&amp;unique_res=1';
						manifestType = 'application/dash+xml';
					}

					// Does the manifest URL start with a slash?
					if (manifestUrl && manifestUrl[0] === '/') {
						// If this happens, prepend the API url to make the link whole.
						manifestUrl = goodTube_videoServer_url+manifestUrl;
					}

					// Add the HLS or DASH source
					goodTube_videojs_player.src({
						src: manifestUrl,
						type: manifestType
					});

					// Update manifest quality menu
					goodTube_defaultQuality_updateMenu();
				}

				// Piped (HD)
				else if (goodTube_videoServer_type === 3) {
					// Format manifest source data
					let manifestUrl = false;
					let manifestType = false;

					// Add manifest source
					let proxyUrlPart = 'false';
					if (goodTube_videoServer_proxy) {
						proxyUrlPart = 'true';
					}

					// HLS stream
					if (typeof videoData['hls'] !== 'undefined' && videoData['hls']) {
						manifestUrl = videoData['hls'];
						manifestType = 'application/x-mpegURL';
					}
					// DASH stream
					else if (typeof videoData['dash'] !== 'undefined' && videoData['dash']) {
						manifestUrl = videoData['dash'];
						manifestType = 'application/dash+xml';
					}

					// Does the manifest URL start with a slash?
					if (manifestUrl && manifestUrl[0] === '/') {
						// If this happens, prepend the API url to make the link whole.
						manifestUrl = goodTube_videoServer_url+manifestUrl;
					}

					// Add the HLS or DASH source
					goodTube_videojs_player.src({
						src: manifestUrl,
						type: manifestType
					});

					// Update manifest quality menu
					goodTube_defaultQuality_updateMenu();
				}


				// Play the video
				setTimeout(function() {
					goodTube_player_play(player);
				}, 1);

				// Load the subtitles into the player
				goodTube_subtitles_load(player, subtitleData);

				// Load the chapters into the player
				// Debug message
				console.log('[GoodTube] Loading chapters...');

				goodTube_chapters_load(player, videoDescription, videoDuration, chaptersData);

				// Load storyboards into the player (desktop only)
				if (!goodTube_mobile) {
					// Debug message
					console.log('[GoodTube] Loading storyboard...');

					goodTube_storyboard_loaded = false;
					goodTube_storyboard_load(player, storyboardData, 0);
				}
			}
		})
		// If there's any issues loading the video data, try again (after configured delay time)
		.catch((error) => {
			if (typeof goodTube_pendingRetry['loadVideoData'] !== 'undefined') {
				clearTimeout(goodTube_pendingRetry['loadVideoData']);
			}

			goodTube_pendingRetry['loadVideoData'] = setTimeout(function() {
				goodTube_video_load(player);
			}, goodTube_retryDelay);

			// Add the loading state
			goodTube_player_addLoadingState();
		});
	}

	// Reload the video data
	function goodTube_video_reloadData() {
		// Debug message
		console.log('\n-------------------------\n\n');
		console.log('[GoodTube] Loading video data from '+goodTube_videoServer_name+'...');

		let delay = 0;
		if (goodTube_mobile) {
			delay = 400;
		}

		setTimeout(function() {
			goodTube_player_loadVideoDataAttempts = 0;
			goodTube_video_load(goodTube_player);
		}, delay);
	}

	// Reload the video
	function goodTube_video_reloadVideo(player) {
		// If we're not viewing a video, just return
		if (typeof goodTube_getParams['v'] === 'undefined') {
			return;
		}

		// Clear any pending timeouts to prevent double ups
		if (typeof goodTube_pendingRetry['reloadVideo'] !== 'undefined') {
			clearTimeout(goodTube_pendingRetry['reloadVideo']);
		}

		// Only re-attempt to load these max configured retry attempts
		if (goodTube_player_reloadVideoAttempts > goodTube_retryAttempts) {
			// Show an error or select next server if we're on automatic mode
			goodTube_error_show();

			return;
		}

		// Store the current video src
		let currentSrc = player.src;

		// Clear the player
		goodTube_player_clear(player);

		// Now use the next javascript animation frame (via set timeout so it still works when you're not focused on the tab) to load the actual video
		setTimeout(function() {
			player.setAttribute('src', currentSrc);
		}, 0);

		goodTube_player_reloadVideoAttempts++;
	}


	/* Default quality selection
	------------------------------------------------------------------------------------------ */
	let goodTube_updateManifestQualityTimeout = false;

	// Setup the default quality modal
	function goodTube_defaultQuality_initModal() {
		// Create the modal
		let defaultQualityModal = document.createElement('div');
		defaultQualityModal.classList.add('goodTube_defaultQualityModal');
		defaultQualityModal.innerHTML = `
			<div class='goodTube_defaultQualityModal_overlay'></div>

			<div class='goodTube_defaultQualityModal_inner'>
				<div class='goodTube_defaultQualityModal_title'>Select default quality</div>
				<div class='goodTube_defaultQualityModal_options'>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_4320'>4320p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_2160'>2160p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_1440'>1440p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_1080'>1080p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_720'>720p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_480'>480p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_360'>360p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_240'>240p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_144'>144p</div>
					<div class='goodTube_defaultQualityModal_option' id='goodTube_defaultQualityModal_option_auto'>Auto</div>
				</div> <!-- .goodTube_defaultQualityModal_inner -->
			</div> <!-- .goodTube_defaultQualityModal_options -->
		`;

		// Add it to the DOM
		document.querySelector('#goodTube_playerWrapper .video-js').appendChild(defaultQualityModal);

		// Add click events to buttons
		let defaultQualityOptions = document.querySelectorAll('.goodTube_defaultQualityModal .goodTube_defaultQualityModal_option');
		defaultQualityOptions.forEach((defaultQualityOption) => {
			defaultQualityOption.addEventListener('click', function() {
				goodTube_defaultQuality_select(this.innerHTML.replace('p', ''));
			});
		});

		// Add close click event to overlay
		document.querySelector('.goodTube_defaultQualityModal .goodTube_defaultQualityModal_overlay').addEventListener('click', function() {
			// Target the default quality modal
			let defaultQualityModal = document.querySelector('.goodTube_defaultQualityModal');

			// Hide it
			if (defaultQualityModal.classList.contains('goodTube_defaultQualityModal_visible')) {
				defaultQualityModal.classList.remove('goodTube_defaultQualityModal_visible');
			}
		});

		// Esc keypress to close
		document.addEventListener('keydown', function(event) {
			if (event.keyCode == 27) {
				// Target the default quality modal
				let defaultQualityModal = document.querySelector('.goodTube_defaultQualityModal');

				// Hide it
				if (defaultQualityModal.classList.contains('goodTube_defaultQualityModal_visible')) {
					defaultQualityModal.classList.remove('goodTube_defaultQualityModal_visible');
				}
			}
		}, true);
	}

	// Update default manifest quality menu
	function goodTube_defaultQuality_updateMenu() {
		// This stops this function from ever accidentially firing twice
		if (goodTube_updateManifestQualityTimeout) {
			clearTimeout(goodTube_updateManifestQualityTimeout);
		}

		// Find and click the default quality button (if it can't be found, this will call itself again until it works)
		let qualityButtons = document.querySelectorAll('.vjs-quality-selector');
		if (qualityButtons && typeof qualityButtons[1] !== 'undefined') {
			if (qualityButtons.length === 2) {
				// Show the correct quality menu item
				qualityButtons[0].style.display = 'none';
				qualityButtons[1].style.display = 'block';

				// Target the manifest quality menu
				let manifestQualityMenu = qualityButtons[1].querySelector('ul');

				// Check if the first menu item is "Select default quality"
				let firstMenuItem = manifestQualityMenu.querySelector('li.vjs-menu-item:first-child .vjs-menu-item-text');

				// If it's not populated yet, try again
				if (!firstMenuItem) {
					if (goodTube_updateManifestQualityTimeout) {
						clearTimeout(goodTube_updateManifestQualityTimeout);
					}

					goodTube_updateManifestQualityTimeout = setTimeout(goodTube_defaultQuality_updateMenu, 100);
					return;
				}

				// Does the 'Select default quality' menu item exist?
				let selectDefaultMenuItem = firstMenuItem;

				// If it does not
				if (firstMenuItem.innerHTML !== 'Select default quality') {
					// Add the 'always use max' menu item
					selectDefaultMenuItem = document.createElement('li');
					selectDefaultMenuItem.classList.add('vjs-menu-item');
					selectDefaultMenuItem.classList.add('select-default');
					selectDefaultMenuItem.innerHTML = `
						<span class="vjs-menu-item-text">Select default quality</span>
						<span class="vjs-control-text" aria-live="polite"></span>
					`;
					selectDefaultMenuItem.addEventListener('click', goodTube_defaultQuality_showModal);
					manifestQualityMenu.prepend(selectDefaultMenuItem);

					// Add a click action to all the other menu options (this turns off 'Select default quality')
					let otherMenuItems = manifestQualityMenu.querySelectorAll('li.vjs-menu-item:not(.select-default)');
					otherMenuItems.forEach((otherMenuItem) => {
						otherMenuItem.addEventListener('click', goodTube_defaultQuality_disable);

						// For some reason we need this to support mobile devices, but not for other event listeners here? Weird.
						otherMenuItem.addEventListener('touchstart', goodTube_defaultQuality_disable);
					});
				}

				// Get the default quality cookie
				let defaultQuality = goodTube_helper_getCookie('goodTube_selectDefaultNew');

				// If it's not set, use 1080p by default
				if (!defaultQuality) {
					goodTube_helper_setCookie('goodTube_selectDefaultNew', '1080');
					defaultQuality = '1080';
				}

				// Select the default quality
				goodTube_defaultQuality_select(defaultQuality);
			}
		}
		else {
			if (goodTube_updateManifestQualityTimeout) {
				clearTimeout(goodTube_updateManifestQualityTimeout);
			}

			goodTube_updateManifestQualityTimeout = setTimeout(goodTube_defaultQuality_updateMenu, 100);
			return;
		}
	}

	// Show the default quality modal
	function goodTube_defaultQuality_showModal() {
		// Target the default quality modal
		let defaultQualityModal = document.querySelector('.goodTube_defaultQualityModal');

		// Show it
		if (!defaultQualityModal.classList.contains('goodTube_defaultQualityModal_visible')) {
			defaultQualityModal.classList.add('goodTube_defaultQualityModal_visible');
		}
	}

	// Select the default manifest quality
	function goodTube_defaultQuality_select(defaultQuality) {
		// Set the cookie to remember the default quality
		goodTube_helper_setCookie('goodTube_selectDefaultNew', defaultQuality);

		// Target the default quality modal
		let defaultQualityModal = document.querySelector('.goodTube_defaultQualityModal');

		// Hide the modal if it's showing
		if (defaultQualityModal.classList.contains('goodTube_defaultQualityModal_visible')) {
			defaultQualityModal.classList.remove('goodTube_defaultQualityModal_visible');
		}

		// Select the modal option
		document.querySelector('.goodTube_defaultQualityModal_selected')?.classList.remove('goodTube_defaultQualityModal_selected');
		document.querySelector('#goodTube_defaultQualityModal_option_'+defaultQuality.toLowerCase())?.classList.add('goodTube_defaultQualityModal_selected');

		// Find the correct manifest quality menu item
		let defaultQualityButton = false;

		// Get the quality menu items
		let qualityMenuItems = document.querySelectorAll('.vjs-quality-selector li.vjs-menu-item');

		// For each quality menu item (this will be highest to lowest order)
		qualityMenuItems.forEach((qualityMenuItem) => {
			// Get the value of this quality menu item
			let value = qualityMenuItem.querySelector('.vjs-menu-item-text').innerHTML.replace('p', '');

			// If they selected 'auto' and the item is 'Auto'
			// OR
			// If the value is less than or equal to the default quality AND we haven't found one yet
			if ((value.toLowerCase() === 'auto' && defaultQuality.toLowerCase() === 'auto') || (parseFloat(value) <= parseFloat(defaultQuality) && !defaultQualityButton)) {
				// Target the default quality button
				defaultQualityButton = qualityMenuItem;
			}
		});

		// If we didn't find the quality menu item, just return - safety check
		if (!defaultQualityButton) {
			return;
		}

		// Click the quality menu item
		defaultQualityButton.click();

		// Debug message
		if (defaultQuality.toLowerCase() === 'auto') {
			console.log('[GoodTube] Setting default quality to '+defaultQuality[0].toUpperCase()+defaultQuality.slice(1));
		}
		else {
			console.log('[GoodTube] Selecting nearest default quality to '+defaultQuality+'p ('+defaultQualityButton.querySelector('.vjs-menu-item-text').innerHTML+')');
		}
	}

	// Turn off the default manifest quality option
	function goodTube_defaultQuality_disable() {
		// Find the manifest quality menu
		let qualityMenu = document.querySelectorAll('.vjs-quality-selector')[1];

		// Find the 'Select default quality' quality button
		let selectDefaultMenuItem = qualityMenu.querySelector('li.select-default');

		// Remove the selected class
		if (selectDefaultMenuItem.classList.contains('vjs-selected')) {
			selectDefaultMenuItem.classList.remove('vjs-selected');
		}

		// Remove any auto selected classes
		let autoSelectedItem = qualityMenu.querySelector('li.vjs-auto-selected');
		if (autoSelectedItem) {
			autoSelectedItem.classList.remove('vjs-auto-selected');
		}
	}


	/* Chapters
	------------------------------------------------------------------------------------------ */
	let goodTube_chapters_updateDisplayInterval = false;
	let goodTube_chapters_showTitleInterval = false;
	let goodTube_chapters_updateDataInterval = false;

	// Load chapters
	function goodTube_chapters_load(player, description, totalDuration, chaptersData) {
		// Clear any existing chapters
		goodTube_chapters_remove();

		// Create a variable to store the chapters
		let chapters = [];

		// If we don't have chapters data already
		if (!chaptersData) {
			// First up, try to get the chapters from the video description
			let lines = description.split("\n");
			let regex = /(\d{0,2}:?\d{1,2}:\d{2})/g;

			for (let line of lines) {
				const matches = line.match(regex);
				if (matches) {
					let ts = matches[0];
					let title = line
						.split(" ")
						.filter((l) => !l.includes(ts))
						.join(" ");

					chapters.push({
						time: ts,
						title: title,
					});
				}
			}

			// Ensure the first chapter is 0 (sometimes the video descriptions are off)
			if (!chapters.length || chapters.length <= 0 || chapters[0]['time'].split(':').reduce((acc,time) => (60 * acc) + +time) > 0) {
				chapters = [];
			}

			// If that didn't work, get them from the DOM (this works for desktop only)
			if ((!chapters.length || chapters.length <= 0) && !goodTube_mobile) {
				// Target the chapters in the DOM
				let uiChapters = Array.from(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));

				// If the chapters from the DOM change, reload the chapters. This is important because it's async data that changes.
				// ----------------------------------------
				if (goodTube_chapters_updateDataInterval) {
					clearInterval(goodTube_chapters_updateDataInterval);
				}

				let prevUIChapters = JSON.stringify(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));
				goodTube_chapters_updateDataInterval = setInterval(function() {
					let chaptersInnerHTML = JSON.stringify(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));

					if (chaptersInnerHTML !== prevUIChapters) {
						prevUIChapters = chaptersInnerHTML;
						goodTube_chapters_load(player, description, totalDuration);
					}
				}, 1000);
				// ----------------------------------------

				let withTitleAndTime = uiChapters.map((node) => ({
					title: node.querySelector(".macro-markers")?.textContent,
					time: node.querySelector("#time")?.textContent,
				}));

				let filtered = withTitleAndTime.filter(
					(element) =>
						element.title !== undefined &&
						element.title !== null &&
						element.time !== undefined &&
						element.time !== null
				);

				chapters = [
					...new Map(filtered.map((node) => [node.time, node])).values(),
				];
			}
		}
		// If we do have chapters data
		else {
			chapters = chaptersData;
		}

		// Ensure the first chapter is 0 (sometimes the video descriptions are off)
		let firstChapterTime = 0;

		if (chapters.length && chapters.length > 0) {
			firstChapterTime = chapters[0]['time'];

			if (typeof firstChapterTime !== 'number') {
				firstChapterTime = firstChapterTime.split(':').reduce((acc,time) => (60 * acc) + +time);
			}
		}

		if (!chapters.length || chapters.length <= 0 || firstChapterTime > 0) {
			chapters = [];
		}

		// If we found the chapters data
		if (chapters.length > 0) {
			// Load chapters into the player
			goodTube_chapters_add(player, chapters, totalDuration);
		}
		// Otherwise this video does not have chapters
		else {
			// Debug message
			console.log('[GoodTube] No chapters found');
		}
	}

	function goodTube_chapters_add(player, chapters, totalDuration) {
		// Create a container for our chapters
		let chaptersContainer = document.createElement('div');
		chaptersContainer.classList.add('goodTube_chapters');

		let markersContainer = document.createElement('div');
		markersContainer.classList.add('goodTube_markers');

		// For each chapter
		let i = 0;
		chapters.forEach((chapter) => {
			// Create a chapter element
			let chapterDiv = document.createElement('div');
			chapterDiv.classList.add('goodTube_chapter');
			if (typeof chapters[i+1] !== 'undefined') {
				if (typeof chapters[i+1]['time'] === 'number') {
					chapterDiv.setAttribute('chapter-time', chapters[i+1]['time']);
				}
				else {
					chapterDiv.setAttribute('chapter-time', chapters[i+1]['time'].split(':').reduce((acc,time) => (60 * acc) + +time));
				}
			}


			// Create a marker element
			let markerDiv = document.createElement('div');
			markerDiv.classList.add('goodTube_marker');
			if (typeof chapters[i+1] !== 'undefined') {
				if (typeof chapters[i+1]['time'] === 'number') {
					markerDiv.setAttribute('marker-time', chapters[i+1]['time']);
				}
				else {
					markerDiv.setAttribute('marker-time', chapters[i+1]['time'].split(':').reduce((acc,time) => (60 * acc) + +time));
				}
			}

			// Add a hover action to show the title in the tooltip (desktop only)
			if (!goodTube_mobile) {
				chapterDiv.addEventListener('mouseover', function() {
					document.querySelector('#goodTube_playerWrapper .vjs-progress-control .vjs-mouse-display .vjs-time-tooltip')?.setAttribute('chapter-title', chapter['title']);
				});
			}

			// Position the chapter with CSS
			// ------------------------------

			// Convert the timestamp (HH:MM:SS) to seconds
			let time = 0;
			if (typeof chapter['time'] === 'number') {
				time = chapter['time'];
			}
			else {
				time = chapter['time'].split(':').reduce((acc,time) => (60 * acc) + +time);
			}

			// Get time as percentage. This is the starting point of this chapter.
			let startingPercentage = (time / totalDuration) * 100;

			// Set the starting point
			chapterDiv.style.left = startingPercentage+'%';

			// Get the starting point of the next chapter (HH:MM:SS) and convert it to seconds
			// If there's no next chapter, use 100%
			let nextChapterStart = totalDuration;
			if (typeof chapters[i+1] !== 'undefined') {
				if (typeof chapters[i+1]['time'] === 'number') {
					nextChapterStart = chapters[i+1]['time'];
				}
				else {
					nextChapterStart = chapters[i+1]['time'].split(':').reduce((acc,time) => (60 * acc) + +time);
				}
			}

			// Get the starting point of the next chapter as percentage. This is the starting point of this chapter.
			let endingPercentage = (nextChapterStart / totalDuration) * 100;

			// Set the width to be the ending point MINUS the starting point (difference between them = length)
			chapterDiv.style.width = (endingPercentage - startingPercentage)+'%';

			// Position the marker
			markerDiv.style.left = endingPercentage+'%';

			// ------------------------------


			// Add the chapter to the chapters container
			chaptersContainer.appendChild(chapterDiv);

			// Add the marker to the markers container
			markersContainer.appendChild(markerDiv);

			// Increment the loop
			i++;
		});

		// Add an action to show the chapter title next to the time duration (mobile only)
		if (goodTube_mobile) {
			goodTube_chapters_showTitleInterval = setInterval(function() {
				let currentPlayerTime = parseFloat(player.currentTime);
				let currentChapterTitle = false;
				chapters.forEach((chapter) => {
					let chapterTime = false;

					if (typeof chapter['time'] === 'number') {
						chapterTime = chapter['time'];
					}
					else {
						chapterTime = chapter['time'].split(':').reduce((acc,time) => (60 * acc) + +time);
					}

					if (parseFloat(currentPlayerTime) >= parseFloat(chapterTime)) {
						currentChapterTitle = chapter['title'];
					}
				});

				if (currentChapterTitle) {
					document.querySelector('#goodTube_playerWrapper .vjs-time-control .vjs-duration-display')?.setAttribute('chapter-title', '· '+currentChapterTitle);
				}
			}, 100);
		}

		// Add the chapters container to the player
		document.querySelector('#goodTube_playerWrapper .vjs-progress-control')?.appendChild(chaptersContainer);

		// Add the markers container to the player
		document.querySelector('#goodTube_playerWrapper .vjs-progress-control .vjs-play-progress')?.appendChild(markersContainer);

		// Add chapters class to the player
		if (!document.querySelector('#goodTube_playerWrapper').classList.contains('goodTube_hasChapters')) {
			document.querySelector('#goodTube_playerWrapper').classList.add('goodTube_hasChapters');
		}

		// Update the chapters display as we play the video
		goodTube_chapters_updateDisplayInterval = setInterval(function() {
			// Hide markers that are before the current play position / red play bar
			let markerElements = document.querySelectorAll('.goodTube_markers .goodTube_marker');

			markerElements.forEach((element) => {
				if (element.getAttribute('marker-time')) {
					if (parseFloat(player.currentTime) >= parseFloat(element.getAttribute('marker-time'))) {
						if (!element.classList.contains('goodTube_showMarker')) {
							element.classList.add('goodTube_showMarker')
						}
					}
					else {
						if (element.classList.contains('goodTube_showMarker')) {
							element.classList.remove('goodTube_showMarker')
						}
					}
				}
			});

			// Make chapter hover RED for chapters that are before the current play position / red play bar
			let chapterElements = document.querySelectorAll('.goodTube_chapters .goodTube_chapter');

			chapterElements.forEach((element) => {
				if (element.getAttribute('chapter-time')) {
					if (parseFloat(player.currentTime) >= parseFloat(element.getAttribute('chapter-time'))) {
						if (!element.classList.contains('goodTube_redChapter')) {
							element.classList.add('goodTube_redChapter')
						}
					}
					else {
						if (element.classList.contains('goodTube_redChapter')) {
							element.classList.remove('goodTube_redChapter')
						}
					}
				}
			});

		}, 100);

		// Debug message
		console.log('[GoodTube] Chapters loaded');
	}

	function goodTube_chapters_remove() {
		// Remove timeouts and intervals
		if (goodTube_chapters_updateDisplayInterval) {
			clearInterval(goodTube_chapters_updateDisplayInterval);
			goodTube_chapters_updateDisplayInterval = false;
		}

		if (goodTube_chapters_showTitleInterval) {
			clearInterval(goodTube_chapters_showTitleInterval);
			goodTube_chapters_showTitleInterval = false;
		}

		if (goodTube_chapters_updateDataInterval) {
			clearInterval(goodTube_chapters_updateDataInterval);
			goodTube_chapters_updateDataInterval = false;
		}

		// Remove interface elements
		document.querySelector('#goodTube_playerWrapper .vjs-time-control .vjs-duration-display')?.setAttribute('chapter-title', '');
		document.querySelector('.goodTube_chapters')?.remove();
		document.querySelector('.goodTube_markers')?.remove();
		if (document.querySelector('#goodTube_playerWrapper').classList.contains('goodTube_hasChapters')) {
			document.querySelector('#goodTube_playerWrapper').classList.remove('goodTube_hasChapters');
		}
	}


	/* Subtitles
	------------------------------------------------------------------------------------------ */
	// Load subtitles
	function goodTube_subtitles_load(player, subtitleData) {
		// If subtitle data is set to false (so we always do it for Piped servers), or if it exists for an invidious server
		if (!subtitleData || subtitleData.length > 0) {
			// Debug message
			console.log('[GoodTube] Loading subtitles...');

			// If there's no subtitle data, start with the first fallback server (Piped)
			if (!subtitleData) {
				goodTube_storyboardSubtitleServers_subtitleIndex = 1;
			}
			// Otherwise start with your current server (Invidious)
			else {
				goodTube_storyboardSubtitleServers_subtitleIndex = 0;
			}

			// Check the subtitle server works
			goodTube_subtitles_checkServer(player, subtitleData, goodTube_videoServer_url);
		}
	}

	// Check the subtitle server
	function goodTube_subtitles_checkServer(player, subtitleData, subtitleApi) {
		// If our selected index is greater than 0, the first selected server failed to load the subtitles
		// So we use the next configured fallback server
		if (goodTube_storyboardSubtitleServers_subtitleIndex > 0) {
			// If we're out of fallback servers, show an error
			if (typeof goodTube_storyboardSubtitleServers[(goodTube_storyboardSubtitleServers_subtitleIndex-1)] === 'undefined') {
				// Debug message
				console.log('[GoodTube] Subtitles could not be loaded');

				return;
			}

			// Otherwise select the next fallback server
			subtitleApi = goodTube_storyboardSubtitleServers[(goodTube_storyboardSubtitleServers_subtitleIndex-1)];

			// Re fetch the video data for this server (always invidious)

			// Call the API (die after 5s)
			fetch(subtitleApi+"/api/v1/videos/"+goodTube_getParams['v'], {
				signal: AbortSignal.timeout(5000)
			})
			.then(response => response.text())
			.then(data => {
				// Turn video data into JSON
				let videoData = JSON.parse(data);

				// Get the subtitle data
				let subtitleData = videoData['captions'];

				// If there are subtitles
				if (subtitleData && subtitleData.length > 0) {
					// Get the subtitle (die after 5s)
					fetch(subtitleApi+subtitleData[0]['url'], {
						signal: AbortSignal.timeout(5000)
					})
					.then(response => response.text())
					.then(data => {
						// If the data wasn't right, try the next fallback server
						if (data.substr(0,6) !== 'WEBVTT') {
							goodTube_subtitles_checkServer(player, subtitleData, subtitleApi);
						}
						// If the data was good, load the subtitles
						else {
							goodTube_subtitles_add(player, subtitleData, subtitleApi);
						}
					})
					// If the fetch failed, try the next fallback server
					.catch((error) => {
						goodTube_subtitles_checkServer(player, subtitleData, subtitleApi);
					});
				}
				else {
					// Debug message
					console.log('[GoodTube] This video does not have subtitles');

					return;
				}
			})
			// If the fetch failed, try the next fallback server
			.catch((error) => {
				goodTube_subtitles_checkServer(player, subtitleData, subtitleApi);
			});


		}
		// If our selected index is 0, just use the data from the current subtitle server (Invidious)
		else {
			// Get the subtitle (die after 5s)
			fetch(subtitleApi+subtitleData[0]['url'], {
				signal: AbortSignal.timeout(5000)
			})
			.then(response => response.text())
			.then(data => {
				// If the data wasn't right, try the next fallback server
				if (data.substr(0,6) !== 'WEBVTT') {
					goodTube_subtitles_checkServer(player, subtitleData, subtitleApi);
				}
				// If the data was good, load the subtitles
				else {
					goodTube_subtitles_add(player, subtitleData, subtitleApi);
				}
			})
			// If the fetch failed, try the next fallback server
			.catch((error) => {
				goodTube_subtitles_checkServer(player, subtitleData, subtitleApi);
			});
		}

		goodTube_storyboardSubtitleServers_subtitleIndex++;
	}

	// Add the subtitles into the player
	function goodTube_subtitles_add(player, subtitleData, subtitleApi) {
		// For each subtitle
		let previous_subtitle = false;
		subtitleData.forEach((subtitle) => {
			// Format the data
			let subtitle_url = false;
			let subtitle_label = false;

			subtitle_url = subtitleApi+subtitle['url'];
			subtitle_label = subtitle['label'];

			// Ensure we have all the subtitle data AND don't load a subtitle with the same label twice (this helps Piped to load actual captions over auto-generated captions if both exist)
			if (subtitle_url && subtitle_label && subtitle_label !== previous_subtitle) {
				previous_subtitle = subtitle_label;

				// Capitalise the first letter of the label, this looks a bit better
				subtitle_label = subtitle_label[0].toUpperCase() + subtitle_label.slice(1);

				// Add the subtitle to videojs
				goodTube_videojs_player.addRemoteTextTrack({
					kind: 'captions',
					language: subtitle_label,
					src: subtitle_url
				}, false);
			}
		});

		// Debug message
		console.log('[GoodTube] Subtitles loaded');
	}


	/* Storyboards
	------------------------------------------------------------------------------------------ */
	let goodTube_storyboard_vttThumbnailsFunction = false;
	let goodTube_storyboard_loaded = false;

	// Load storyboard
	function goodTube_storyboard_load(player, storyboardData, fallbackServerIndex) {
		// If our storyboard has already loaded, just return.
		if (goodTube_storyboard_loaded) {
			return;
		}

		// If we're out of fallback servers, show an error
		if (typeof goodTube_storyboardSubtitleServers[fallbackServerIndex] === 'undefined') {
			// Debug message
			console.log('[GoodTube] Storyboard could not be loaded');
			return;
		}


		// If we're using Piped, then we need to fetch the storyboard data from a fallback server before checking anything
		if (goodTube_videoServer_type === 3) {
			let apiEndpoint = goodTube_storyboardSubtitleServers[fallbackServerIndex]+"/api/v1/videos/"+goodTube_getParams['v'];

			// Get the video data (die after 5s)
			fetch(apiEndpoint, {
				signal: AbortSignal.timeout(5000)
			})
			.then(response => response.text())
			.then(data => {
				// If our storyboard has already loaded, just return.
				if (goodTube_storyboard_loaded) {
					return;
				}

				// Turn video data into JSON
				let videoData = JSON.parse(data);

				// Check the storyboard data is all good, if not try the next fallback server
				if (typeof videoData['storyboards'] === 'undefined') {
					fallbackServerIndex++;
					goodTube_storyboard_load(player, storyboardData, fallbackServerIndex);
				}
				// Otherwise get the storyboard data and check the server works
				else {
					storyboardData = videoData['storyboards'];
					goodTube_storyboard_checkServer(player, storyboardData, goodTube_storyboardSubtitleServers[fallbackServerIndex]);
				}
			})
			// If the fetch failed, try the next fallback server
			.catch((error) => {
				fallbackServerIndex++;
				goodTube_storyboard_load(player, storyboardData, fallbackServerIndex);
			});
		}


		// Otherwise for Invidious, check straight away
		else {
			// Check the storyboard server works
			goodTube_storyboardSubtitleServers_storyboardIndex = 0;
			goodTube_storyboard_checkServer(player, storyboardData, goodTube_videoServer_url);
		}
	}

	// Check the storyboard server
	function goodTube_storyboard_checkServer(player, storyboardData, storyboardApi) {
		// If our storyboard has already loaded, just return.
		if (goodTube_storyboard_loaded) {
			return;
		}

		// If our selected index is greater than 0, the first selected server failed to load the storyboard
		// So we use the next configured fallback server
		if (goodTube_storyboardSubtitleServers_storyboardIndex > 0) {
			// If we're out of fallback servers, show an error
			if (typeof goodTube_storyboardSubtitleServers[(goodTube_storyboardSubtitleServers_storyboardIndex-1)] === 'undefined') {
				// Debug message
				console.log('[GoodTube] Storyboard could not be loaded');
				return;
			}

			// Otherwise select the next fallback server
			storyboardApi = goodTube_storyboardSubtitleServers[(goodTube_storyboardSubtitleServers_storyboardIndex-1)];
		}
		goodTube_storyboardSubtitleServers_storyboardIndex++;

		// If there's no storyboard data, try the next fallback server
		if (!storyboardData.length || storyboardData.length <= 0) {
			goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
		}
		// Otherwise we have data, so check the storyboard returned actually loads
		else {
			// Call the API (die after 5s)
			fetch(storyboardApi+storyboardData[0]['url'], {
				signal: AbortSignal.timeout(5000)
			})
			.then(response => response.text())
			.then(data => {
				// If our storyboard has already loaded, just return.
				if (goodTube_storyboard_loaded) {
					return;
				}

				// If it failed to get WEBVTT format, try the next fallback server
				if (data.substr(0,6) !== 'WEBVTT') {
					goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
				}
				// If it got WEBVTT format, find the URL of the first storyboard image inside that data (we've got to fish this out of a plain text return)
				else {
					let gotTheUrl = false;
					let storyboardUrl = false;
					let items = data.split('\n\n');
					if (items.length && items.length > 1) {
						let itemBits = items[1].split('\n');

						if (itemBits.length && itemBits.length > 1) {
							storyboardUrl = itemBits[1];

							if (storyboardUrl.indexOf('https') !== -1) {
								gotTheUrl = true;
							}
						}
					}

					// If we found the URL of the first storyboard image, check it loads
					if (gotTheUrl) {
						// Call the API (die after 5s)
						fetch(storyboardUrl, {
							signal: AbortSignal.timeout(5000)
						})
						.then(response => response.text())
						.then(data => {
							// If our storyboard has already loaded, just return.
							if (goodTube_storyboard_loaded) {
								return;
							}

							// Check the data returned, it should be an image not a HTML document (this often comes back when it fails to load)
							if (data.indexOf('<html') === -1) {
								// All good, load the storyboard
								goodTube_storyboard_add(player, storyboardData, storyboardApi);
							}
							// It's a HTML document and not an image, so try the next fallback server
							else {
								goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
							}
						})
						// If the fetch failed, try the next fallback server
						.catch((error) => {
							goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
						});
					}
					// Otherwise we didn't find the URL of the first storyboard image, so try the next fallback server
					else {
						goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
					}
				}
			})
			// If the fetch failed, try the next fallback server
			.catch((error) => {
				goodTube_storyboard_checkServer(player, storyboardData, storyboardApi);
			});
		}
	}

	// Load the storyboard into the player after checking the server
	function goodTube_storyboard_add(player, storyboardData, storyboardApi) {
		// If our storyboard has already loaded, just return.
		if (goodTube_storyboard_loaded) {
			return;
		}

		// Go through each storyboard and find the highest quality (up to max 100px in height, this helps to speed up the preview time)
		let highestQualityStoryboardUrl = false;
		let highestQualityStoryboardWidth = 0;
		storyboardData.forEach((storyboard) => {
			if (parseFloat(storyboard['width']) > highestQualityStoryboardWidth && parseFloat(storyboard['height']) < 100) {
				highestQualityStoryboardUrl = storyboard['url'];
				highestQualityStoryboardWidth = parseFloat(storyboard['width']);
			}
		});

		// If we have a storyboard to load
		if (highestQualityStoryboardUrl) {
			// Store the core vttThumbnails function so we can call it again, because this plugin overwrites it's actual function once loaded!
			if (typeof goodTube_videojs_player.vttThumbnails === 'function') {
				goodTube_storyboard_vttThumbnailsFunction = goodTube_videojs_player.vttThumbnails;
			}

			// Restore the core function
			goodTube_videojs_player.vttThumbnails = goodTube_storyboard_vttThumbnailsFunction;

			// Load the highest quality storyboard
			goodTube_videojs_player.vttThumbnails({
				src: storyboardApi+highestQualityStoryboardUrl
			});

			goodTube_storyboard_loaded = true;

			// Debug message
			console.log('[GoodTube] Storyboard loaded');
		}
	}


	/* Picture in picture
	------------------------------------------------------------------------------------------ */
	let goodTube_pip = false;
	function goodTube_pip_init() {
		// If we leave the picture in picture
		addEventListener('leavepictureinpicture', (event) => {
			// If we're not viewing a video
			if (typeof goodTube_getParams['v'] === 'undefined') {
				// Pause the player
				goodTube_player_pause(goodTube_player);
			}

			goodTube_pip = false;
		});

		// If we enter the picture in picture
		addEventListener('enterpictureinpicture', (event) => {
			goodTube_pip = true;
		});
	}

	function goodTube_pip_update() {
		if (!goodTube_pip) {
			return;
		}

		// Support play and pause (but only attach these events once!)
		if ("mediaSession" in navigator) {
			// Play
			navigator.mediaSession.setActionHandler("play", () => {
				goodTube_player_play(goodTube_player);
			});

			// Pause
			navigator.mediaSession.setActionHandler("pause", () => {
				goodTube_player_pause(goodTube_player);
			});

			// Next track
			if (goodTube_nav_nextButton) {
				navigator.mediaSession.setActionHandler("nexttrack", () => {
					goodTube_nav_next(true);
				});
			}
			else {
				navigator.mediaSession.setActionHandler('nexttrack', null);
			}

			// Prev track
			if (goodTube_nav_prevButton) {
				navigator.mediaSession.setActionHandler("previoustrack", () => {
					goodTube_nav_prev();
				});
			}
			else {
				navigator.mediaSession.setActionHandler('previoustrack', null);
			}
		}
	}

	function goodTube_pip_showHide() {
		if (goodTube_pip) {
			document.exitPictureInPicture();
			goodTube_pip = false;
		}
		else {
			goodTube_player.requestPictureInPicture();
			goodTube_pip = true;

			// If the miniplayer is open, remove it
			if (goodTube_miniplayer) {
				goodTube_miniplayer_showHide();
			}
		}
	}


	/* Miniplayer
	------------------------------------------------------------------------------------------ */
	let goodTube_miniplayer = false;
	let goodTube_miniplayer_video = false;
	function goodTube_miniplayer_update() {
		if (!goodTube_miniplayer) {
			return;
		}

		// This is needed to show it differently when we're off a video page (desktop only)
		if (!goodTube_mobile) {
			let youtube_wrapper = document.querySelector('ytd-watch-flexy');

			if (youtube_wrapper) {
				if (typeof goodTube_getParams['v'] !== 'undefined') {
					youtube_wrapper.classList.remove('goodTube_miniplayer');
				}
				else {
					youtube_wrapper.classList.add('goodTube_miniplayer');
				}
			}
		}

		// Set the video id, this is used for the expand button
		if (typeof goodTube_getParams['v'] !== 'undefined') {
			goodTube_miniplayer_video = goodTube_getParams['v'];
		}
	}

	function goodTube_miniplayer_showHide() {
		// If we have real picture in picture, use that instead!
		if (document.pictureInPictureEnabled) {
			goodTube_pip_showHide();
			return;
		}

		let goodTube_wrapper = document.querySelector('#goodTube_playerWrapper');

		if (goodTube_miniplayer) {
			goodTube_wrapper.classList.remove('goodTube_miniplayer');
			goodTube_miniplayer = false;

			// If we're not viewing a video, clear the player
			if (typeof goodTube_getParams['v'] === 'undefined') {
				goodTube_player_clear(goodTube_player);
			}
		}
		else {
			goodTube_wrapper.classList.add('goodTube_miniplayer');
			goodTube_miniplayer = true;
			goodTube_miniplayer_video = goodTube_getParams['v'];
		}
	}


	/* Error display
	------------------------------------------------------------------------------------------ */
	// Show an error on screen (or select next server if we're on automatic mode)
	function goodTube_error_show() {
		// Clear any buffering and loading timeouts
		if (goodTube_bufferingTimeout) {
			clearTimeout(goodTube_bufferingTimeout);
		}
		if (goodTube_bufferCountTimeout) {
			clearTimeout(goodTube_bufferCountTimeout);
		}
		if (goodTube_loadingTimeout) {
			clearTimeout(goodTube_loadingTimeout);
		}

		// What api are we on?
		let selectedApi = goodTube_helper_getCookie('goodTube_videoServer_withauto');

		// Are we out of automatic servers?
		let showNoServersError = false;
		if (typeof goodTube_videoServers[goodTube_videoServer_automaticIndex] === 'undefined') {
			showNoServersError = true;
		}

		// If it's automatic and we're out of servers
		if (selectedApi === 'automatic' && showNoServersError) {
			let player = document.querySelector('#goodTube_player');

			// Remove the loading state
			goodTube_player_removeLoadingState();

			// Clear the player
			goodTube_player_clear(goodTube_player);

			let error = document.createElement('div');
			error.setAttribute('id', 'goodTube_error');
			error.innerHTML = "Video could not be loaded. The servers are not responding :(<br><small>Please refresh the page / try again soon!</small>";
			player.appendChild(error);
		}


		// If it's automatic and we have more servers
		else if (selectedApi === 'automatic') {
			// Debug message
			console.log('[GoodTube] Video could not be loaded - selecting next video source...');

			// Set the player time to be restored when the new server loads
			if (goodTube_player.currentTime > 0) {
				goodTube_player_restoreTime = goodTube_player.currentTime;
			}

			// Select next server
			goodTube_player_selectVideoServer('automatic', true);
		}


		// If it's manual
		else {
			// Debug message
			console.log('[GoodTube] Video could not be loaded - selecting next video source...');

			// Set the player time to be restored when the new server loads
			if (goodTube_player.currentTime > 0) {
				goodTube_player_restoreTime = goodTube_player.currentTime;
			}

			// Go to automatic mode
			goodTube_videoServer_automaticIndex = 0;
			goodTube_player_selectVideoServer('automatic', true);
		}
	}

	// Hide an error on screen
	function goodTube_error_hide() {
		let error = document.querySelector('#goodTube_error');
		if (error) {
			error.remove();
		}
	}


	/* Load assets
	------------------------------------------------------------------------------------------ */
	let goodTube_assets = [
		goodTube_github+'/js/assets.min.js',
		goodTube_github+'/css/assets.min.css'
	];
	let goodTube_assets_loaded = 0;
	let goodTube_assets_loadAttempts = 0;

	// Load assets
	function goodTube_assets_init() {
		// Debug message
		console.log('[GoodTube] Loading player assets...');

		// Load the first asset, this will then load the others sequentially
		goodTube_assets_loadAttempts = 0;
		goodTube_assets_loadAsset(goodTube_assets[goodTube_assets_loaded]);
	}

	function goodTube_assets_loadAsset(asset) {
		// Only re-attempt to load the video data max configured retry attempts
		goodTube_assets_loadAttempts++;
		if (goodTube_assets_loadAttempts > goodTube_retryAttempts) {

			// Debug message
			console.log('[GoodTube] Player assets could not be loaded');

			return;
		}

		fetch(asset)
		.then(response => response.text())
		.then(data => {
			let asset_element = false;

			if (asset.indexOf('/js/') !== -1) {
				asset_element = document.createElement('script');
			}
			else if (asset.indexOf('/css/') !== -1) {
				asset_element = document.createElement('style');
			}

			asset_element.innerHTML = data;
			document.head.appendChild(asset_element);

			goodTube_assets_loaded++;

			// If we've loaded all the assets
			if (goodTube_assets_loaded >= goodTube_assets.length) {
				// Debug message
				console.log('[GoodTube] Player assets loaded');
			}
			// Otherwise load the next asset
			else {
				goodTube_assets_loadAttempts = 0;
				goodTube_assets_loadAsset(goodTube_assets[goodTube_assets_loaded]);
			}
		})
		.catch((error) => {
			if (typeof goodTube_pendingRetry['loadAsset'] !== 'undefined') {
				clearTimeout(goodTube_pendingRetry['loadAsset']);
			}

			goodTube_pendingRetry['loadAsset'] = setTimeout(function() {
				goodTube_assets_loadAsset(asset);
			}, goodTube_retryDelay);
		});
	}


	/* Core functions
	------------------------------------------------------------------------------------------ */
	// This targets our HTML <video> element
	let goodTube_player = false;

	// Are we on mobile?
	let goodTube_mobile = false;

	// This holds the GET params
	let goodTube_getParams = false;

	// Actions
	let goodTube_previousUrl = false;
	let goodTube_previousPlaylist = false;
	function goodTube_actions() {
		// If the assets are loaded AND the player is loaded
		if (goodTube_assets_loaded >= goodTube_assets.length && goodTube_videojs_player_loaded) {
			// Get the previous and current URL

			// Remove hashes, these mess with things sometimes
			// ALso remove "index="
			let previousUrl = goodTube_previousUrl;
			if (previousUrl) {
				previousUrl = previousUrl.split('#')[0];
				previousUrl = previousUrl.split('index=')[0];
			}

			let currentUrl = window.location.href;
			if (currentUrl) {
				currentUrl = currentUrl.split('#')[0];
				currentUrl = currentUrl.split('index=')[0];
			}

			// If the URL hasn't changed, don't do anything (this does not apply to first page load)
			if (previousUrl === currentUrl) {
				return;
			}

			// The URL has changed, so setup our player
			// ----------------------------------------------------------------------------------------------------

			// Setup GET parameters
			goodTube_getParams = goodTube_helper_setupGetParams();

			// If we're viewing a video
			if (typeof goodTube_getParams['v'] !== 'undefined') {
				// Debug message
				console.log('\n-------------------------\n\n');

				// Setup the previous button history
				goodTube_nav_setupPrevHistory();

				// Reset the load video attempts
				goodTube_player_loadVideoDataAttempts = 0;

				// Remove the "restore to" time
				goodTube_player_restoreTime = 0;

				// Select the server if we're on automatic
				if (goodTube_helper_getCookie('goodTube_videoServer_withauto') === 'automatic') {
					// Get the current playlist (if we're on one)
					let currentPlaylist = false;
					if (typeof goodTube_getParams['list'] !== 'undefined') {
						currentPlaylist = goodTube_getParams['list'];
					}

					// Reset to first server for automatic, only if we've changed playlist.
					if (!currentPlaylist || goodTube_previousPlaylist !== currentPlaylist) {
						goodTube_videoServer_automaticIndex = 0;
					}
					else if (goodTube_videoServer_automaticIndex > 0) {
						// Otherwise stay on the same server
						goodTube_videoServer_automaticIndex--;
					}

					// Select the automatic server
					goodTube_player_selectVideoServer('automatic', false);
				}

				// Debug message
				console.log('[GoodTube] Loading video data from '+goodTube_videoServer_name+'...');

				// Load the video
				goodTube_video_load(goodTube_player);

				// Usage stats
				goodTube_stats_video();
			}
			// Otherwise we're not viewing a video, and we're not in the miniplayer or pip
			else if (!goodTube_miniplayer && !goodTube_pip) {
				// Clear the player
				goodTube_player_clear(goodTube_player);

				// Empty the previous video history
				goodTube_nav_prevVideo = [];

				// Clear any pending retry attempts
				for (let key in goodTube_pendingRetry) {
					if (goodTube_pendingRetry.hasOwnProperty(key)) {
						clearTimeout(goodTube_pendingRetry[key]);
					}
				}
			}

			// ----------------------------------------------------------------------------------------------------

			// Set the previous playlist
			if (typeof goodTube_getParams['list'] !== 'undefined') {
				goodTube_previousPlaylist = goodTube_getParams['list'];
			}
			else {
				goodTube_previousPlaylist = false;
			}

			// Set the previous URL (which pauses this function until the URL changes again)
			goodTube_previousUrl = window.location.href;
		}
	}

	// Init
	function goodTube_init() {
		/* General setup
		---------------------------------------------------------------------------------------------------- */
		// Define if we're on mobile or not
		if (window.location.href.indexOf('m.youtube') !== -1) {
			goodTube_mobile = true;
		}

		// Setup GET parameters
		goodTube_getParams = goodTube_helper_setupGetParams();

		// Check for custom video servers
		goodTube_server_custom(0);

		// Check for a local video server
		goodTube_server_local();

		// If there's a cookie for our previously chosen API, select it
		let goodTube_videoServer_cookie = goodTube_helper_getCookie('goodTube_videoServer_withauto');
		if (goodTube_videoServer_cookie) {
			goodTube_videoServers.forEach((api) => {
				if (api['url'] === goodTube_videoServer_cookie) {
					goodTube_videoServer_type = api['type'];
					goodTube_videoServer_proxy = api['proxy'];
					goodTube_videoServer_url = api['url'];
					goodTube_videoServer_name = api['name'];
				}
			});
		}

		// Ensure that if they close the window in the middle of downloads, we reset the last download time
		window.addEventListener("beforeunload", (event) => {
			goodTube_helper_setCookie('goodTube_lastDownloadTimeSeconds', (new Date().getTime() / 1000));
		});


		/* Disable Youtube
		---------------------------------------------------------------------------------------------------- */
		// Add CSS to hide ads, shorts, etc
		goodTube_youtube_hideAdsShortsEtc();

		// Add CSS classes to hide elements (without Youtube knowing)
		goodTube_helper_hideElement_init();

		// Mute, pause and skip ads
		goodTube_youtube_mutePauseSkipAds();
		setInterval(goodTube_youtube_mutePauseSkipAds, 1);

		// Hide the youtube players
		goodTube_youtube_hidePlayers();
		setInterval(goodTube_youtube_hidePlayers, 1);

		// Make the youtube player the lowest quality to save on bandwidth
		setInterval(goodTube_youtube_lowestQuality, 1000);

		// Turn off autoplay
		setInterval(goodTube_youtube_turnOffAutoplay, 1000);

		// Hide shorts
		setInterval(goodTube_youtube_hideShorts, 100);


		/* Load GoodTube
		---------------------------------------------------------------------------------------------------- */
		// Load required assets
		goodTube_assets_init();

		// Init our player (after DOM is loaded)
		document.addEventListener("DOMContentLoaded", goodTube_player_init);

		// Also check if the DOM is already loaded, as if it is, the above event listener will not trigger.
		if (document.readyState === "interactive" || document.readyState === "complete") {
			goodTube_player_init();
		}

		// Usage stats
		goodTube_stats_user();
	}


	/* Start GoodTube
	------------------------------------------------------------------------------------------ */
	goodTube_init();


})();
