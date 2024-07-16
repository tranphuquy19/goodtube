import videojs from 'video.js';

import {
	goodTube_debug,
	goodTube_github,
	goodTube_retryAttempts,
	goodTube_retryDelay,

	goodTube,

	goodTube_playerConfigs,
} from '@/configs';
import {
	// Helper functions
	goodTube_helper_getCookie, goodTube_helper_hideElement, goodTube_helper_hideElement_init, goodTube_helper_iOS, goodTube_helper_padNumber, goodTube_helper_parseGetParams, goodTube_helper_setCookie, goodTube_helper_showElement,

	// Youtube functions
	goodTube_youtube_hideAdsShortsEtc_init, goodTube_youtube_hideAdsShortsEtc_realTime,
	goodTube_youtube_areYouStillWatching,
	goodTube_youtube_timestampLinks,
	goodTube_youtube_lowestQuality,

	// Player functions
	goodTube_player_skipTo

} from '@/shared';
import { css, style1, style2 } from '@/styles';

const main = async () => {
	const url = window.location.href;

	GM_addStyle(css);

	// Hide all Youtube players
	function goodTube_youtube_hidePlayers() {
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
			autoplayButton = document.querySelector<HTMLElement>('.ytm-autonav-toggle-button-container[aria-pressed="true"]');

			// Turn off the youtube autoplay button
			if (autoplayButton instanceof HTMLElement) {
				autoplayButton.click();
			}
			// Click the player a bit, this helps to actually make the autoplay button show (after ads)
			else {
				document.querySelector<HTMLElement>('#player .html5-video-player')?.click();
				document.querySelector<HTMLElement>('#player')?.click();
				document.querySelector<HTMLElement>('.ytp-unmute')?.click();
			}
		}
	}

	// Mute, pause and skip ads on all Youtube videos
	function goodTube_youtube_mutePauseSkipAds() {
		// Mute the youtube player and make it 16x playback speed via JS
		let youtubeVideo = document.querySelector<HTMLVideoElement>('#movie_player video');
		if (youtubeVideo) {
			youtubeVideo.muted = true;
			youtubeVideo.volume = 0;

			if (!goodTube_youtube_syncing) {
				youtubeVideo.pause();
			}
		}

		// Mute the youtube player and make it 16x playback speed via the frame API
		let youtubeFrameApi = document.querySelector('#movie_player') as any;
		if (youtubeFrameApi) {
			if (typeof youtubeFrameApi.mute === 'function') {
				youtubeFrameApi.mute();
			}

			if (typeof youtubeFrameApi.setVolume === 'function') {
				youtubeFrameApi.setVolume(0);
			}

			if (!goodTube_youtube_syncing && typeof youtubeFrameApi.pauseVideo === 'function') {
				youtubeFrameApi.pauseVideo();
			}
		}

		// Always skip the ads as soon as possible by clicking the skip button
		let skipButton = document.querySelector<HTMLElement>('.ytp-skip-ad-button');
		if (skipButton) {
			skipButton.click();
		}

		// Also pause and mute all other HTML videos on the page
		let youtubeVideos = document.querySelectorAll<HTMLVideoElement>('video:not(#goodTube_player):not(#goodTube_player_html5_api)');
		youtubeVideos.forEach((element) => {
			// Don't touch the thumbnail hover player
			if (!element.closest('#inline-player') && !element.closest('#movie_player')) {
				element.muted = true;
				element.volume = 0;
				element.pause();
			}
		});
	}

	// Sync players
	let goodTube_youtube_syncing = true;
	let goodTube_youtube_previousSyncTime = 0;
	function goodTube_youtube_syncPlayers() {
		let youtubeVideo = document.querySelector<HTMLVideoElement>('#movie_player video');

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
			let youtubeFrameApi = document.querySelector('#movie_player') as any;
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
			setTimeout(function () {
				goodTube_youtube_syncing = false;
			}, 10);
		}
	}


	/* Player functions
	------------------------------------------------------------------------------------------ */
	let {
		goodTube_pendingRetry,
		goodTube_player_restoreTime,
		goodTube_player_assets,
		goodTube_player_loadedAssets,
		goodTube_player_loadAssetAttempts,
		goodTube_player_loadVideoDataAttempts,
		goodTube_player_loadChaptersAttempts,
		goodTube_player_vttThumbnailsFunction,
		goodTube_player_reloadVideoAttempts,
		goodTube_player_ended,
		goodTube_player_pip,
		goodTube_player_miniplayer,
		goodTube_player_miniplayer_video,
		goodTube_player_highestQuality,
		goodTube_player_selectedQuality,
		goodTube_player_manuallySelectedQuality,
		goodTube_updateChapters,
		goodTube_chapterTitleInterval,
		goodTube_chaptersChangeInterval,
		goodTube_updateManifestQualityTimeout
	} = goodTube_playerConfigs;

	// Init
	function goodTube_player_init() {
		// If the target Youtube page element does not exist OR the assets are not loaded, call this function again next drawframe
		let youtubePageElement: Element | null = null;
		// Desktop
		if (!goodTube_mobile) {
			youtubePageElement = document.getElementById('below');
		}
		// Mobile
		else {
			youtubePageElement = document.querySelector('body');
		}

		if (!youtubePageElement || goodTube_player_loadedAssets < goodTube_player_assets.length) {
			setTimeout(function () {
				goodTube_player_init();
			}, 0);

			return;
		}

		// Add CSS styles for the player
		let style = document.createElement('style');
		style.textContent = style1;
		document.head.appendChild(style);

		// Setup player layout
		let player_wrapper1 = document.createElement('div');
		player_wrapper1.id = 'goodTube_player_wrapper1';

		let player_wrapper2 = document.createElement('div');
		player_wrapper2.id = 'goodTube_player_wrapper2';

		let player_wrapper3 = document.createElement('div');
		player_wrapper3.id = 'goodTube_player_wrapper3';

		// Add player to the page

		// Desktop
		if (!goodTube_mobile) {
			youtubePageElement.before(player_wrapper1);

			// Offset top of stuff when in theater mode
			setInterval(function () {
				let offsetElements = document.querySelectorAll<HTMLElement>('ytd-watch-flexy[theater] #below, ytd-watch-flexy[theater] #secondary');
				offsetElements.forEach((element: HTMLElement) => {
					element.style.marginTop = player_wrapper1.offsetHeight + 'px';
				});
			}, 1);
		}
		// Mobile
		else {
			player_wrapper1.classList.add('goodTube_mobile');
			youtubePageElement.appendChild(player_wrapper1);

			setInterval(function () {
				window.requestAnimationFrame(function () {
					if (typeof goodTube_getParams['v'] !== 'undefined') {
						// Match width and height of mobile player
						let youtubeSize_element = document.querySelector<HTMLElement>('.player-size.player-placeholder');
						if (youtubeSize_element) {
							if (youtubeSize_element.offsetHeight > 0) {
								player_wrapper1.style.height = youtubeSize_element.offsetHeight + 'px';
								player_wrapper1.style.width = youtubeSize_element.offsetWidth + 'px';
							}
							else {
								youtubeSize_element = document.querySelector<HTMLElement>('#player');
								if (youtubeSize_element && youtubeSize_element.offsetHeight > 0) {
									player_wrapper1.style.height = youtubeSize_element.offsetHeight + 'px';
									player_wrapper1.style.width = youtubeSize_element.offsetWidth + 'px';
								}
							}
						}

						// Match sticky mode of mobile player
						let youtubeSticky_element = document.querySelector('.player-container.sticky-player');
						if (youtubeSticky_element) {
							player_wrapper1.style.position = 'fixed';
						}
						else {
							player_wrapper1.style.position = 'absolute';
						}
					}
					else {
						player_wrapper1.style.height = '0';
						player_wrapper1.style.width = '0';
					}
				});
			}, 1);
		}

		player_wrapper1.appendChild(player_wrapper2);
		player_wrapper2.appendChild(player_wrapper3);

		// Add video
		let player = document.createElement('video');
		player.id = 'goodTube_player';
		player.classList.add('video-js');
		player.controls = true;
		player.setAttribute('tab-index', '1');
		player_wrapper3.appendChild(player);

		// Expose the player globally
		goodTube_player = player;

		// Init picture in picture
		goodTube_player_pipInit();

		// Init videojs
		goodTube_player_videojs();

		// Sync players every 10s
		setInterval(goodTube_youtube_syncPlayers, 10000);

		// Listen for keyboard shortcuts
		document.addEventListener('keydown', function (event) {
			// Don't do anything if we're holding control, or we're not viewing a video
			if (event.ctrlKey || typeof goodTube_getParams['v'] === 'undefined') {
				return;
			}

			// If we're not focused on a HTML form element
			let focusedElement = event.srcElement as HTMLElement;
			let focusedElement_tag = '';
			let focusedElement_id: string | null = null;
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
				let keyPressed = event.key.toLowerCase();

				// Speed up playback
				if (keyPressed === '>') {
					if (parseFloat(`${player.playbackRate}`) == .25) {
						player.playbackRate = .5;
					}
					else if (parseFloat(`${player.playbackRate}`) == .5) {
						player.playbackRate = .75;
					}
					else if (parseFloat(`${player.playbackRate}`) == .75) {
						player.playbackRate = 1;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1) {
						player.playbackRate = 1.25;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.25) {
						player.playbackRate = 1.5;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.5) {
						player.playbackRate = 1.75;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.75) {
						player.playbackRate = 2;
					}
				}

				// Slow down playback
				else if (keyPressed === '<') {
					if (parseFloat(`${player.playbackRate}`) == .5) {
						player.playbackRate = .25;
					}
					else if (parseFloat(`${player.playbackRate}`) == .75) {
						player.playbackRate = .5;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1) {
						player.playbackRate = .75;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.25) {
						player.playbackRate = 1;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.5) {
						player.playbackRate = 1.25;
					}
					else if (parseFloat(`${player.playbackRate}`) == 1.75) {
						player.playbackRate = 1.5;
					}
					else if (parseFloat(`${player.playbackRate}`) == 2) {
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
							document.querySelector('body')!.focus();
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
					if (keyPressed === ' ') {
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
						goodTube_player_miniplayerShowHide();
					}

					// Toggle fullscreen
					if (keyPressed === 'f') {
						document.querySelector<HTMLElement>('.vjs-fullscreen-control')?.click();
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

		// If we're on mobile, set the volume to 100%
		if (goodTube_mobile) {
			goodTube_player_volume(goodTube_player, 1);
		}
	}



	function goodTube_player_loadAsset(asset: any) {
		// Only re-attempt to load the video data max configured retry attempts
		goodTube_player_loadAssetAttempts++;
		if (goodTube_player_loadAssetAttempts > goodTube_retryAttempts) {

			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Player assets could not be loaded');
			}

			return;
		}

		fetch(asset)
			.then(response => response.text())
			.then(data => {
				let asset_element: HTMLElement | null = null;

				if (asset.indexOf('/js/') !== -1) {
					asset_element = document.createElement('script');
				}
				else if (asset.indexOf('/css/') !== -1) {
					asset_element = document.createElement('style');
				}

				if (!asset_element) return;
				asset_element.innerHTML = data;
				document.head.appendChild(asset_element);

				goodTube_player_loadedAssets++;

				// If we've loaded all the assets
				if (goodTube_player_loadedAssets >= goodTube_player_assets.length) {
					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Player assets loaded');
					}

					// Check for updates
					goodTube_checkForUpdates();
				}
				// Otherwise load the next asset
				else {
					goodTube_player_loadAssetAttempts = 0;
					goodTube_player_loadAsset(goodTube_player_assets[goodTube_player_loadedAssets]);
				}
			})
			.catch((error) => {
				if (typeof goodTube_pendingRetry['loadAsset'] !== 'undefined') {
					clearTimeout(goodTube_pendingRetry['loadAsset']);
				}

				goodTube_pendingRetry['loadAsset'] = setTimeout(function () {
					goodTube_player_loadAsset(asset);
				}, goodTube_retryDelay);
			});
	}

	// Select API
	let goodTube_automaticServerIndex = 0;

	// Pause
	function goodTube_player_pause(player: any) {
		player.pause();
	}

	// Play
	function goodTube_player_play(player: any) {
		player.play();
	}

	// Volume
	function goodTube_player_volume(player: any, volume: any) {
		player.volume = volume;
	}

	// Skip to
	function goodTube_player_skipTo(player: any, time: any) {
		player.currentTime = time;
	}

	// Load video
	function goodTube_player_loadVideo(player: any) {
		// If we're not viewing a video
		if (typeof goodTube_getParams['v'] === 'undefined') {
			// Empty the previous video history
			goodTube_videojs_previousVideo = [];

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
			goodTube_player_videojs_handleError();

			return;
		}

		// Remove any existing video sources
		let videoSources_existing = player.querySelectorAll('source');
		videoSources_existing.forEach((videoSource: any) => {
			videoSource.remove();
		});

		// Setup API endpoint to get video data from
		let apiEndpoint = '';

		// Invidious (360p / HD)
		if (goodTube_api_type === 1 || goodTube_api_type === 2) {
			apiEndpoint = goodTube_api_url + "/api/v1/videos/" + goodTube_getParams['v'];
		}
		// Piped (HD)
		else if (goodTube_api_type === 3) {
			apiEndpoint = goodTube_api_url + "/streams/" + goodTube_getParams['v'];
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
				let sourceData: any[] = [];
				let subtitleData = false;
				let storyboardData = false;
				let chaptersData: any[] = [];
				let videoDescription = false;
				let videoDuration = false;

				// Below populates the source data - but first, if there's any issues with the source data, try again (after configured delay time)
				let retry = false;

				// Invidious (360p)
				if (goodTube_api_type === 1) {
					if (typeof videoData['formatStreams'] === 'undefined') {
						retry = true;
					}
					else {
						sourceData = videoData['formatStreams'];
						subtitleData = videoData['captions'];
						storyboardData = videoData['storyboards'];
						videoDescription = videoData['description'];
						videoDuration = videoData['lengthSeconds'];
						chaptersData = [];
					}
				}
				// Invidious (HD)
				else if (goodTube_api_type === 2) {
					if (typeof videoData['dashUrl'] === 'undefined' && typeof videoData['hlsUrl'] === 'undefined') {
						retry = true;
					}
					else {
						sourceData = [];
						subtitleData = videoData['captions'];
						storyboardData = videoData['storyboards'];
						videoDescription = videoData['description'];
						videoDuration = videoData['lengthSeconds'];
						chaptersData = [];
					}
				}
				// Piped (HD)
				else if (goodTube_api_type === 3) {
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
							videoData['chapters'].forEach((chapter: any) => {
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

					goodTube_pendingRetry['loadVideoData'] = setTimeout(function () {
						goodTube_player_loadVideo(player);
					}, goodTube_retryDelay);

					// Add the loading state
					goodTube_player_addLoadingState();

					return;
				}
				// Otherwise the data was all good so load the sources
				else {
					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Video data loaded');
					}

					// Invidious (360p)
					if (goodTube_api_type === 1) {
						// If we've manually selected a quality, and it exists for this video, select it
						if (goodTube_player_manuallySelectedQuality && player.querySelector('.goodTube_source_' + goodTube_player_manuallySelectedQuality)) {
							player.querySelector('.goodTube_source_' + goodTube_player_manuallySelectedQuality).setAttribute('selected', true);

							// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
							goodTube_player_selectedQuality = goodTube_player_manuallySelectedQuality;
						}
						// Otherwise select the highest quality source
						else {
							player.querySelector('.goodTube_source_' + goodTube_player_highestQuality)?.setAttribute('selected', true);

							// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
							goodTube_player_selectedQuality = goodTube_player_highestQuality;
						}

						// Add audio only source
						let audio_element = document.createElement('source');
						audio_element.setAttribute('src', goodTube_api_url + "/watch?v=" + goodTube_getParams['v'] + '&raw=1&listen=1');
						audio_element.setAttribute('type', 'audio/mp3');
						audio_element.setAttribute('label', 'Audio');
						audio_element.setAttribute('video', 'true');
						audio_element.setAttribute('class', 'goodTube_source_audio');
						player.appendChild(audio_element);

						// For each source
						let i = 0;
						goodTube_player_highestQuality = false;
						sourceData.forEach((source) => {
							// Format the data correctly
							let source_src = '';
							let source_type = false;
							let source_label = '';
							let source_quality = 0;

							source_src = goodTube_api_url + '/latest_version?id=' + goodTube_getParams['v'] + '&itag=' + source['itag'];
							if (goodTube_api_proxy) {
								source_src = source_src + '&local=true';
							}

							source_type = source['type'];
							source_label = parseFloat(source['resolution'].replace('p', '').replace('hd', '')) + 'p';
							source_quality = parseFloat(source['resolution'].replace('p', '').replace('hd', ''));

							// Only add the source to the player if the data is populated
							if (source_src && source_type && source_label) {

								// Add video
								if (`${source_type}`.toLowerCase().indexOf('video') !== -1) {
									let video_element = document.createElement('source');
									video_element.setAttribute('src', source_src);
									video_element.setAttribute('type', `${source_type}`);
									video_element.setAttribute('label', source_label);
									video_element.setAttribute('video', 'true');
									video_element.setAttribute('class', 'goodTube_source_' + source_quality);
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
						if (goodTube_player_manuallySelectedQuality && player.querySelector('.goodTube_source_' + goodTube_player_manuallySelectedQuality)) {
							player.querySelector('.goodTube_source_' + goodTube_player_manuallySelectedQuality).setAttribute('selected', true);

							// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
							goodTube_player_selectedQuality = goodTube_player_manuallySelectedQuality;
						}
						// Otherwise select the highest quality source
						else {
							player.querySelector('.goodTube_source_' + goodTube_player_highestQuality)?.setAttribute('selected', true);

							// Save the currently selected quality, this is used when we change quality to know weather or not the new quality has been manually selected
							goodTube_player_selectedQuality = goodTube_player_highestQuality;
						}


						// Enable the videojs quality selector
						let qualities: any = [];
						player.querySelectorAll('source[video=true]').forEach((quality: any) => {
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
					else if (goodTube_api_type === 2) {
						// Format manifest source data
						let manifestUrl = false;
						let manifestType = false;

						// Add manifest source
						let proxyUrlPart = 'false';
						if (goodTube_api_proxy) {
							proxyUrlPart = 'true';
						}

						// HLS stream
						if (typeof videoData['hlsUrl'] !== 'undefined' && videoData['hlsUrl']) {
							manifestUrl = videoData['hlsUrl'] + '?local=' + proxyUrlPart + '&amp;unique_res=1';
							manifestType = 'application/x-mpegURL';
						}
						// DASH stream
						else if (typeof videoData['dashUrl'] !== 'undefined' && videoData['dashUrl']) {
							manifestUrl = videoData['dashUrl'] + '?local=' + proxyUrlPart + '&amp;unique_res=1';
							manifestType = 'application/dash+xml';
						}

						// Does the manifest URL start with a slash?
						if (manifestUrl && manifestUrl[0] === '/') {
							// If this happens, prepend the API url to make the link whole.
							manifestUrl = goodTube_api_url + manifestUrl;
						}

						// Add the HLS or DASH source
						goodTube_videojs_player.src({
							src: manifestUrl,
							type: manifestType
						});

						// Update manifest quality menu
						goodTube_player_updateManifestQualityMenu();
					}

					// Piped (HD)
					else if (goodTube_api_type === 3) {
						// Format manifest source data
						let manifestUrl = false;
						let manifestType = false;

						// Add manifest source
						let proxyUrlPart = 'false';
						if (goodTube_api_proxy) {
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
							manifestUrl = goodTube_api_url + manifestUrl;
						}

						// Add the HLS or DASH source
						goodTube_videojs_player.src({
							src: manifestUrl,
							type: manifestType
						});

						// Update manifest quality menu
						goodTube_player_updateManifestQualityMenu();
					}


					// Play the video
					setTimeout(function () {
						goodTube_player_play(player);
					}, 1);

					// Load the subtitles into the player
					goodTube_player_loadSubtitles(player, subtitleData);

					// Load the chapters into the player
					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Loading chapters...');
					}

					goodTube_player_loadChapters(player, videoDescription, videoDuration, chaptersData);

					// Load storyboards into the player (desktop only)
					if (!goodTube_mobile) {
						// Debug message
						if (goodTube_debug) {
							console.log('[GoodTube] Loading storyboard...');
						}

						goodTube_player_loadStoryboard(player, storyboardData, 0);
					}
				}
			})
			// If there's any issues loading the video data, try again (after configured delay time)
			.catch((error) => {
				if (typeof goodTube_pendingRetry['loadVideoData'] !== 'undefined') {
					clearTimeout(goodTube_pendingRetry['loadVideoData']);
				}

				goodTube_pendingRetry['loadVideoData'] = setTimeout(function () {
					goodTube_player_loadVideo(player);
				}, goodTube_retryDelay);

				// Add the loading state
				goodTube_player_addLoadingState();
			});
	}

	// Update manifest quality menu
	function goodTube_player_updateManifestQualityMenu() {
		// This stops this function from ever accidentially firing twice
		if (goodTube_updateManifestQualityTimeout) {
			clearTimeout(goodTube_updateManifestQualityTimeout);
		}

		// Find and click the highest quality button (if it can't be found, this will call itself again until it works)
		let qualityButtons = document.querySelectorAll('.vjs-quality-selector');
		if (qualityButtons && typeof qualityButtons[1] !== 'undefined') {
			if (qualityButtons.length === 2) {
				// Show the correct quality menu item
				qualityButtons[0].style.display = 'none';
				qualityButtons[1].style.display = 'block';

				// Target the manifest quality menu
				let manifestQualityMenu = qualityButtons[1].querySelector('ul');

				// Check if the first menu item is "Always use max"
				let firstMenuItem = manifestQualityMenu.querySelector('li.vjs-menu-item:first-child .vjs-menu-item-text');

				// If it's not populated yet, try again
				if (!firstMenuItem) {
					if (goodTube_updateManifestQualityTimeout) {
						clearTimeout(goodTube_updateManifestQualityTimeout);
					}

					goodTube_updateManifestQualityTimeout = setTimeout(goodTube_player_updateManifestQualityMenu, 100);
					return;
				}

				// Does the 'always use max' menu item exist?
				let alwaysMaxMenuItem = firstMenuItem;

				// If not
				if (firstMenuItem.innerHTML !== 'Always use max') {
					// Add the 'always use max' menu item
					alwaysMaxMenuItem = document.createElement('li');
					alwaysMaxMenuItem.classList.add('vjs-menu-item');
					alwaysMaxMenuItem.classList.add('always-max');
					alwaysMaxMenuItem.innerHTML = `
						<span class="vjs-menu-item-text">Always use max</span>
						<span class="vjs-control-text" aria-live="polite"></span>
					`;
					alwaysMaxMenuItem.addEventListener('click', goodTube_player_selectHighestManifestQuality);
					manifestQualityMenu.prepend(alwaysMaxMenuItem);

					// Add a click action to all the other menu options (this turns off 'always use max')
					let otherMenuItems = manifestQualityMenu.querySelectorAll('li.vjs-menu-item:not(.always-max)');
					otherMenuItems.forEach((otherMenuItem) => {
						otherMenuItem.addEventListener('click', goodTube_player_turnOffHighestManifestQuality);

						// For some reason we need this to support mobile devices, but not for other event listeners here? Weird.
						otherMenuItem.addEventListener('touchstart', goodTube_player_turnOffHighestManifestQuality);
					});
				}

				// Check the cookie, are we always using max?
				let alwaysUseMax = goodTube_helper_getCookie('goodTube_alwaysUseMax');

				// If we are, then select the highest quality
				if (alwaysUseMax && alwaysUseMax === 'true') {
					goodTube_player_selectHighestManifestQuality();
				}
			}
		}
		else {
			if (goodTube_updateManifestQualityTimeout) {
				clearTimeout(goodTube_updateManifestQualityTimeout);
			}

			goodTube_updateManifestQualityTimeout = setTimeout(goodTube_player_updateManifestQualityMenu, 100);
			return;
		}
	}

	// Select the highest manifest quality
	let goodTube_dontTurnOffMaxFromClick = false;
	function goodTube_player_selectHighestManifestQuality() {
		// Set the cookie to remember this
		goodTube_helper_setCookie('goodTube_alwaysUseMax', 'true');

		// Find the manifest quality menu
		let qualityMenu = document.querySelectorAll('.vjs-quality-selector')[1];

		// Find the highest quality button (second in the list)
		let highestQualityButton = qualityMenu.querySelectorAll('li.vjs-menu-item')[1];

		// Ensure the click doesn't turn off the max option
		goodTube_dontTurnOffMaxFromClick = true;

		// Click it
		highestQualityButton.click();

		// Add an auto selected class (half white)
		highestQualityButton.classList.add('vjs-auto-selected');

		// Deselect it
		highestQualityButton.classList.remove('vjs-selected');

		// Select the 'Always use max option'
		qualityMenu.querySelector('li.always-max').classList.add('vjs-selected');

		// Debug message
		if (goodTube_debug) {
			console.log('[GoodTube] Selecting highest quality - ' + highestQualityButton.querySelector('.vjs-menu-item-text').innerHTML);
		}
	}

	// Turn off the highest manifest quality option
	function goodTube_player_turnOffHighestManifestQuality() {
		// Allow this once only, so the max quality selection doesn't turn itself off!
		if (goodTube_dontTurnOffMaxFromClick) {
			goodTube_dontTurnOffMaxFromClick = false;
			return;
		}

		// Set the cookie to remember this
		goodTube_helper_setCookie('goodTube_alwaysUseMax', 'false');

		// Find the manifest quality menu
		let qualityMenu = document.querySelectorAll('.vjs-quality-selector')[1];

		// Find the 'always use max' quality button
		let alwaysMaxMenuItem = qualityMenu.querySelector('li.always-max');

		// Remove the selected class
		if (alwaysMaxMenuItem.classList.contains('vjs-selected')) {
			alwaysMaxMenuItem.classList.remove('vjs-selected');
		}

		// Remove any auto selected classes
		let autoSelectedItem = qualityMenu.querySelector('li.vjs-auto-selected')
		if (autoSelectedItem) {
			autoSelectedItem.classList.remove('vjs-auto-selected');
		}
	}

	// Load chapters
	function goodTube_player_loadChapters(player, description, totalDuration, chaptersData) {
		// Clear any existing chapters
		goodTube_player_clearChapters();

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
			if (!chapters.length || chapters.length <= 0 || chapters[0]['time'].split(':').reduce((acc, time) => (60 * acc) + +time) > 0) {
				chapters = [];
			}

			// If that didn't work, get them from the DOM (this works for desktop only)
			if ((!chapters.length || chapters.length <= 0) && !goodTube_mobile) {
				// Target the chapters in the DOM
				let uiChapters = Array.from(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));

				// If the chapters from the DOM change, reload the chapters. This is important because it's async data that changes.
				// ----------------------------------------
				if (goodTube_chaptersChangeInterval) {
					clearInterval(goodTube_chaptersChangeInterval);
				}

				let prevUIChapters = JSON.stringify(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));
				goodTube_chaptersChangeInterval = setInterval(function () {
					let chaptersInnerHTML = JSON.stringify(document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer:nth-child(2) #content ytd-macro-markers-list-renderer #contents ytd-macro-markers-list-item-renderer #endpoint #details"));

					if (chaptersInnerHTML !== prevUIChapters) {
						prevUIChapters = chaptersInnerHTML;
						goodTube_player_loadChapters(player, description, totalDuration);
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
				firstChapterTime = firstChapterTime.split(':').reduce((acc, time) => (60 * acc) + +time);
			}
		}

		if (!chapters.length || chapters.length <= 0 || firstChapterTime > 0) {
			chapters = [];
		}

		// If we found the chapters data
		if (chapters.length > 0) {
			// Load chapters into the player
			goodTube_player_loadChaptersFromData(player, chapters, totalDuration);
		}
		// Otherwise this video does not have chapters
		else {
			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] No chapters found');
			}
		}
	}

	function goodTube_player_loadChaptersFromData(player, chapters, totalDuration) {
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
			if (typeof chapters[i + 1] !== 'undefined') {
				if (typeof chapters[i + 1]['time'] === 'number') {
					chapterDiv.setAttribute('chapter-time', chapters[i + 1]['time']);
				}
				else {
					chapterDiv.setAttribute('chapter-time', chapters[i + 1]['time'].split(':').reduce((acc, time) => (60 * acc) + +time));
				}
			}


			// Create a marker element
			let markerDiv = document.createElement('div');
			markerDiv.classList.add('goodTube_marker');
			if (typeof chapters[i + 1] !== 'undefined') {
				if (typeof chapters[i + 1]['time'] === 'number') {
					markerDiv.setAttribute('marker-time', chapters[i + 1]['time']);
				}
				else {
					markerDiv.setAttribute('marker-time', chapters[i + 1]['time'].split(':').reduce((acc, time) => (60 * acc) + +time));
				}
			}

			// Add a hover action to show the title in the tooltip (desktop only)
			if (!goodTube_mobile) {
				chapterDiv.addEventListener('mouseover', function () {
					document.querySelector('#goodTube_player_wrapper1 .vjs-progress-control .vjs-mouse-display .vjs-time-tooltip')?.setAttribute('chapter-title', chapter['title']);
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
				time = chapter['time'].split(':').reduce((acc, time) => (60 * acc) + +time);
			}

			// Get time as percentage. This is the starting point of this chapter.
			let startingPercentage = (time / totalDuration) * 100;

			// Set the starting point
			chapterDiv.style.left = startingPercentage + '%';

			// Get the starting point of the next chapter (HH:MM:SS) and convert it to seconds
			// If there's no next chapter, use 100%
			let nextChapterStart = totalDuration;
			if (typeof chapters[i + 1] !== 'undefined') {
				if (typeof chapters[i + 1]['time'] === 'number') {
					nextChapterStart = chapters[i + 1]['time'];
				}
				else {
					nextChapterStart = chapters[i + 1]['time'].split(':').reduce((acc, time) => (60 * acc) + +time);
				}
			}

			// Get the starting point of the next chapter as percentage. This is the starting point of this chapter.
			let endingPercentage = (nextChapterStart / totalDuration) * 100;

			// Set the width to be the ending point MINUS the starting point (difference between them = length)
			chapterDiv.style.width = (endingPercentage - startingPercentage) + '%';

			// Position the marker
			markerDiv.style.left = endingPercentage + '%';

			// ------------------------------


			// Add the chapter to the chapters container
			chaptersContainer.appendChild(chapterDiv);

			// Add the marker to the markers container
			markersContainer.appendChild(markerDiv);

			// Increment the loop
			i++;
		});

		// Add an action to show the title next to the time duration (mobile only)
		if (goodTube_mobile) {
			goodTube_chapterTitleInterval = setInterval(function () {
				let currentPlayerTime = parseFloat(player.currentTime);
				let currentChapterTitle = false;
				chapters.forEach((chapter) => {
					let chapterTime = false;

					if (typeof chapter['time'] === 'number') {
						chapterTime = chapter['time'];
					}
					else {
						chapterTime = chapter['time'].split(':').reduce((acc, time) => (60 * acc) + +time);
					}

					if (parseFloat(currentPlayerTime) >= parseFloat(chapterTime)) {
						currentChapterTitle = chapter['title'];
					}
				});

				if (currentChapterTitle) {
					document.querySelector('#goodTube_player_wrapper1 .vjs-time-control .vjs-duration-display')?.setAttribute('chapter-title', '· ' + currentChapterTitle);
				}
			}, 10);
		}

		// Add the chapters container to the player
		document.querySelector('#goodTube_player_wrapper1 .vjs-progress-control')?.appendChild(chaptersContainer);

		// Add the markers container to the player
		document.querySelector('#goodTube_player_wrapper1 .vjs-progress-control .vjs-play-progress')?.appendChild(markersContainer);

		// Add chapters class to the player
		if (!document.querySelector('#goodTube_player_wrapper1').classList.contains('goodTube_hasChapters')) {
			document.querySelector('#goodTube_player_wrapper1').classList.add('goodTube_hasChapters');
		}

		// Update the chapters display as we play the video
		goodTube_updateChapters = setInterval(function () {
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

		}, 10);

		// Debug message
		if (goodTube_debug) {
			console.log('[GoodTube] Chapters loaded');
		}
	}

	function goodTube_player_clearChapters() {
		// Remove timeouts and intervals
		if (goodTube_updateChapters) {
			clearInterval(goodTube_updateChapters);
			goodTube_updateChapters = false;
		}

		if (goodTube_chapterTitleInterval) {
			clearInterval(goodTube_chapterTitleInterval);
			goodTube_chapterTitleInterval = false;
		}

		if (goodTube_chaptersChangeInterval) {
			clearInterval(goodTube_chaptersChangeInterval);
			goodTube_chaptersChangeInterval = false;
		}

		// Remove interface elements
		document.querySelector('#goodTube_player_wrapper1 .vjs-time-control .vjs-duration-display')?.setAttribute('chapter-title', '');
		document.querySelector('.goodTube_chapters')?.remove();
		document.querySelector('.goodTube_markers')?.remove();
		if (document.querySelector('#goodTube_player_wrapper1').classList.contains('goodTube_hasChapters')) {
			document.querySelector('#goodTube_player_wrapper1').classList.remove('goodTube_hasChapters');
		}
	}

	// Load subtitles
	function goodTube_player_loadSubtitles(player, subtitleData) {
		// If subtitle data is set to false (so we always do it for Piped servers), or if it exists for an invidious server
		if (!subtitleData || subtitleData.length > 0) {
			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Loading subtitles...');
			}

			// If there's no subtitle data, start with the first fallback server (Piped)
			if (!subtitleData) {
				goodTube_otherDataServersIndex_subtitles = 1;
			}
			// Otherwise start with your current server (Invidious)
			else {
				goodTube_otherDataServersIndex_subtitles = 0;
			}

			// Check the subtitle server works
			goodTube_player_checkSubtitleServer(player, subtitleData, goodTube_api_url);
		}
	}

	function goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi) {
		// If our selected index is greater than 0, the first selected server failed to load the subtitles
		// So we use the next configured fallback server
		if (goodTube_otherDataServersIndex_subtitles > 0) {
			// If we're out of fallback servers, show an error
			if (typeof goodTube_otherDataServers[(goodTube_otherDataServersIndex_subtitles - 1)] === 'undefined') {
				// Debug message
				if (goodTube_debug) {
					console.log('[GoodTube] Subtitles could not be loaded');
				}

				return;
			}

			// Otherwise select the next fallback server
			subtitleApi = goodTube_otherDataServers[(goodTube_otherDataServersIndex_subtitles - 1)];

			// Re fetch the video data for this server (always invidious)

			// Call the API (die after 5s)
			fetch(subtitleApi + "/api/v1/videos/" + goodTube_getParams['v'], {
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
						fetch(subtitleApi + subtitleData[0]['url'], {
							signal: AbortSignal.timeout(5000)
						})
							.then(response => response.text())
							.then(data => {
								// If the data wasn't right, try the next fallback server
								if (data.substr(0, 6) !== 'WEBVTT') {
									goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi);
								}
								// If the data was good, load the subtitles
								else {
									goodTube_player_loadSubtitlesAfterCheck(player, subtitleData, subtitleApi);
								}
							})
							// If the fetch failed, try the next fallback server
							.catch((error) => {
								goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi);
							});
					}
					else {
						// Debug message
						if (goodTube_debug) {
							console.log('[GoodTube] This video does not have subtitles');
						}

						return;
					}
				})
				// If the fetch failed, try the next fallback server
				.catch((error) => {
					goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi);
				});


		}
		// If our selected index is 0, just use the data from the current subtitle server (Invidious)
		else {
			// Get the subtitle (die after 5s)
			fetch(subtitleApi + subtitleData[0]['url'], {
				signal: AbortSignal.timeout(5000)
			})
				.then(response => response.text())
				.then(data => {
					// If the data wasn't right, try the next fallback server
					if (data.substr(0, 6) !== 'WEBVTT') {
						goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi);
					}
					// If the data was good, load the subtitles
					else {
						goodTube_player_loadSubtitlesAfterCheck(player, subtitleData, subtitleApi);
					}
				})
				// If the fetch failed, try the next fallback server
				.catch((error) => {
					goodTube_player_checkSubtitleServer(player, subtitleData, subtitleApi);
				});
		}

		goodTube_otherDataServersIndex_subtitles++;
	}

	function goodTube_player_loadSubtitlesAfterCheck(player, subtitleData, subtitleApi) {
		// For each subtitle
		let previous_subtitle = false;
		subtitleData.forEach((subtitle) => {
			// Format the data
			let subtitle_url = false;
			let subtitle_label = false;

			subtitle_url = subtitleApi + subtitle['url'];
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
		if (goodTube_debug) {
			console.log('[GoodTube] Subtitles loaded');
		}
	}

	// Load storyboard
	function goodTube_player_loadStoryboard(player, storyboardData, fallbackServerIndex) {
		// If we're out of fallback servers, show an error
		if (typeof goodTube_otherDataServers[fallbackServerIndex] === 'undefined') {
			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Storyboard could not be loaded');
			}

			return;
		}


		// If we're using Piped, then we need to fetch the storyboard data from a fallback server before checking anything
		if (goodTube_api_type === 3) {
			let apiEndpoint = goodTube_otherDataServers[fallbackServerIndex] + "/api/v1/videos/" + goodTube_getParams['v'];

			// Get the video data (die after 5s)
			fetch(apiEndpoint, {
				signal: AbortSignal.timeout(5000)
			})
				.then(response => response.text())
				.then(data => {
					// Turn video data into JSON
					let videoData = JSON.parse(data);

					// Check the storyboard data is all good, if not try the next fallback server
					if (typeof videoData['storyboards'] === 'undefined') {
						fallbackServerIndex++;
						goodTube_player_loadStoryboard(player, storyboardData, fallbackServerIndex);
					}
					// Otherwise get the storyboard data and check the server works
					else {
						storyboardData = videoData['storyboards'];
						goodTube_player_checkStoryboardServer(player, storyboardData, goodTube_otherDataServers[fallbackServerIndex]);
					}
				})
				// If the fetch failed, try the next fallback server
				.catch((error) => {
					fallbackServerIndex++;
					goodTube_player_loadStoryboard(player, storyboardData, fallbackServerIndex);
				});
		}


		// Otherwise for Invidious, check straight away
		else {
			// Check the storyboard server works
			goodTube_otherDataServersIndex_storyboard = 0;
			goodTube_player_checkStoryboardServer(player, storyboardData, goodTube_api_url);
		}
	}

	function goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi) {
		// If our selected index is greater than 0, the first selected server failed to load the storyboard
		// So we use the next configured fallback server
		if (goodTube_otherDataServersIndex_storyboard > 0) {
			// If we're out of fallback servers, show an error
			if (typeof goodTube_otherDataServers[(goodTube_otherDataServersIndex_storyboard - 1)] === 'undefined') {
				// Debug message
				if (goodTube_debug) {
					console.log('[GoodTube] Storyboard could not be loaded');
				}

				return;
			}

			// Otherwise select the next fallback server
			storyboardApi = goodTube_otherDataServers[(goodTube_otherDataServersIndex_storyboard - 1)];
		}
		goodTube_otherDataServersIndex_storyboard++;

		// If there's no storyboard data, try the next fallback server
		if (!storyboardData.length || storyboardData.length <= 0) {
			goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
		}
		// Otherwise we have data, so check the storyboard returned actually loads
		else {
			// Call the API (die after 5s)
			fetch(storyboardApi + storyboardData[0]['url'], {
				signal: AbortSignal.timeout(5000)
			})
				.then(response => response.text())
				.then(data => {
					// If it failed to get WEBVTT format, try the next fallback server
					if (data.substr(0, 6) !== 'WEBVTT') {
						goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
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
									// Check the data returned, it should be an image not a HTML document (this often comes back when it fails to load)
									if (data.indexOf('<html') === -1) {
										// All good, load the storyboard
										goodTube_player_loadStoryboardAfterCheck(player, storyboardData, storyboardApi);
									}
									// It's a HTML document and not an image, so try the next fallback server
									else {
										goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
									}
								})
								// If the fetch failed, try the next fallback server
								.catch((error) => {
									goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
								});
						}
						// Otherwise we didn't find the URL of the first storyboard image, so try the next fallback server
						else {
							goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
						}
					}
				})
				// If the fetch failed, try the next fallback server
				.catch((error) => {
					goodTube_player_checkStoryboardServer(player, storyboardData, storyboardApi);
				});
		}
	}

	function goodTube_player_loadStoryboardAfterCheck(player, storyboardData, storyboardApi) {
		// Go through each storyboard and find the highest quality
		let highestQualityStoryboardUrl = false;
		let highestQualityStoryboardWidth = 0;
		storyboardData.forEach((storyboard) => {
			if (storyboard['width'] > highestQualityStoryboardWidth) {
				highestQualityStoryboardUrl = storyboard['url'];
				highestQualityStoryboardWidth = parseFloat(storyboard['width']);
			}
		});

		// If we have a storyboard to load
		if (highestQualityStoryboardUrl) {
			// Store the core vttThumbnails function so we can call it again, because this plugin overwrites it's actual function once loaded!
			if (typeof goodTube_videojs_player.vttThumbnails === 'function') {
				goodTube_player_vttThumbnailsFunction = goodTube_videojs_player.vttThumbnails;
			}

			// Restore the core function
			goodTube_videojs_player.vttThumbnails = goodTube_player_vttThumbnailsFunction;

			// Load the highest quality storyboard
			goodTube_videojs_player.vttThumbnails({
				src: storyboardApi + highestQualityStoryboardUrl
			});

			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Storyboard loaded');
			}
		}
	}

	// Reload the video
	function goodTube_player_reloadVideo(player) {
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
			goodTube_player_videojs_handleError();

			return;
		}

		// Store the current video src
		let currentSrc = player.src;

		// Clear the player
		goodTube_player_clear(player);

		// Now use the next javascript animation frame (via set timeout so it still works when you're not focused on the tab) to load the actual video
		setTimeout(function () {
			player.setAttribute('src', currentSrc);
		}, 0);

		goodTube_player_reloadVideoAttempts++;
	}

	// Clear the player
	function goodTube_player_clear(player) {
		goodTube_player_ended = false;
		goodTube_player_videojs_hideError();
		player.classList.add('goodTube_hidden');
		player.currentTime = 0;
		// player.setAttribute('src', '');
		player.pause();

		// Clear any existing chapters
		goodTube_player_clearChapters();

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

	// Hide the player
	function goodTube_player_hide(player) {
		goodTube_helper_hideElement(player.closest('#goodTube_player_wrapper1'));
	}

	// Show the player
	function goodTube_player_show(player) {
		goodTube_helper_showElement(player.closest('#goodTube_player_wrapper1'));
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

	// Picture in picture
	function goodTube_player_pipInit() {
		// If we leave the picture in picture
		addEventListener('leavepictureinpicture', (event) => {
			// If we're not viewing a video
			if (typeof goodTube_getParams['v'] === 'undefined') {
				// Pause the player
				goodTube_player_pause(goodTube_player);
			}

			goodTube_player_pip = false;
		});

		// If we enter the picture in picture
		addEventListener('enterpictureinpicture', (event) => {
			goodTube_player_pip = true;
		});
	}

	function goodTube_player_pipUpdate() {
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
			if (goodTube_videojs_nextButton) {
				navigator.mediaSession.setActionHandler("nexttrack", () => {
					goodTube_nextVideo(true);
				});
			}
			else {
				navigator.mediaSession.setActionHandler('nexttrack', null);
			}

			// Prev track
			if (goodTube_videojs_prevButton) {
				navigator.mediaSession.setActionHandler("previoustrack", () => {
					goodTube_prevVideo();
				});
			}
			else {
				navigator.mediaSession.setActionHandler('previoustrack', null);
			}
		}
	}

	function goodTube_player_pipShowHide() {
		if (goodTube_player_pip) {
			document.exitPictureInPicture();
			goodTube_player_pip = false;
		}
		else {
			goodTube_player.requestPictureInPicture();
			goodTube_player_pip = true;

			// If the miniplayer is open, remove it
			if (goodTube_player_miniplayer) {
				goodTube_player_miniplayerShowHide();
			}
		}
	}

	// Miniplayer
	function goodTube_player_miniplayerUpdate() {
		// This is needed to show it differently when we're off a video page, desktop only
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

		// Set the video id if we can, used for the expand button
		if (typeof goodTube_getParams['v'] !== 'undefined') {
			goodTube_player_miniplayer_video = goodTube_getParams['v'];
		}
	}

	function goodTube_player_miniplayerShowHide() {
		// If we have real picture in picture, use that instead!
		if (document.pictureInPictureEnabled) {
			goodTube_player_pipShowHide();
			return;
		}

		let goodTube_wrapper = document.querySelector('#goodTube_player_wrapper1');

		if (goodTube_player_miniplayer) {
			goodTube_wrapper.classList.remove('goodTube_miniplayer');
			goodTube_player_miniplayer = false;

			// If we're not viewing a video, clear the player
			if (typeof goodTube_getParams['v'] === 'undefined') {
				goodTube_player_clear(goodTube_player);
			}
		}
		else {
			goodTube_wrapper.classList.add('goodTube_miniplayer');
			goodTube_player_miniplayer = true;
			goodTube_player_miniplayer_video = goodTube_getParams['v'];
		}
	}


	/* Video JS functions
	------------------------------------------------------------------------------------------ */
	let goodTube_videojs_player: any = null;
	let goodTube_videojs_player_loaded = false;
	let goodTube_videojs_previousVideo: any = [];
	let goodTube_videojs_prevButton = false;
	let goodTube_videojs_nextButton = true;
	let goodTube_videojs_tapTimer_backwards = false;
	let goodTube_videojs_tapTimer_forwards = false;
	let goodTube_videojs_fastForward = false;
	let goodTube_qualityApi = false;
	let goodTube_bufferingTimeout: NodeJS.Timeout | null = null;
	let goodTube_loadingTimeout: NodeJS.Timeout | null = null;
	let goodTube_seeking = false;
	let goodTube_bufferCount = 0;

	// Init video js
	function goodTube_player_videojs() {
		// Debug message
		if (goodTube_debug) {
			console.log('[GoodTube] Loading player...');
		}

		// Load the skin
		goodTube_player_videojs_loadSkin();

		// Setup GET params
		goodTube_getParams = goodTube_helper_parseGetParams();

		// Add custom MENU buttons
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

		// Add custom buttons
		const Button = videojs.getComponent("Button");

		class PrevButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_prevVideo();
			}
		}
		videojs.registerComponent('PrevButton', PrevButton);

		class NextButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_nextVideo(true);
			}
		}
		videojs.registerComponent('NextButton', NextButton);

		class MiniplayerButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_player_miniplayerShowHide();
			}
		}
		videojs.registerComponent('MiniplayerButton', MiniplayerButton);

		class TheaterButton extends Button {
			handleClick(event) {
				event.stopImmediatePropagation();
				goodTube_shortcut('theater');
			}
		}
		videojs.registerComponent('TheaterButton', TheaterButton);

		// Setup the API selection
		let apiList = [];

		goodTube_apis.forEach((api) => {
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
						goodTube_automaticServerIndex = 0;
					}

					// Set the player time to be restored when the new server loads
					if (goodTube_player.currentTime > 0) {
						goodTube_player_restoreTime = goodTube_player.currentTime;
					}

					// Set the new API
					goodTube_player_selectApi(menuItem.getAttribute('api'), true);
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
							className: 'goodTube_downloadPlaylist_cancel',
							label: "CANCEL ALL DOWNLOADS",
							clickHandler() {
								goodTube_downloadsCancel();
							},
						},
						{
							label: "Download video",
							clickHandler() {
								// Add to pending downloads
								goodTube_pendingDownloads[goodTube_getParams['v']] = true;

								// Download the video
								goodTube_queDownload(0, 'video', goodTube_getParams['v']);
							},
						},
						{
							label: "Download audio",
							clickHandler() {
								// Add to pending downloads
								goodTube_pendingDownloads[goodTube_getParams['v']] = true;

								// Download the audio
								goodTube_queDownload(0, 'audio', goodTube_getParams['v']);
							},
						},
						{
							className: 'goodTube_downloadPlaylist_video',
							label: "Download playlist (video)",
							clickHandler() {
								goodTube_downloadPlaylist('video');
							},
						},
						{
							className: 'goodTube_downloadPlaylist_audio',
							label: "Download playlist (audio)",
							clickHandler() {
								goodTube_downloadPlaylist('audio');
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
		videojs.hook('error', function () {
			if (typeof goodTube_pendingRetry['reloadVideo'] !== 'undefined') {
				clearTimeout(goodTube_pendingRetry['reloadVideo']);
			}

			goodTube_pendingRetry['reloadVideo'] = setTimeout(function () {
				goodTube_player_reloadVideo(goodTube_player);
			}, goodTube_retryDelay);

			// Add the loading state
			goodTube_player_addLoadingState();

			// Update the video js player
			goodTube_player_videojs_update();
		});

		// After video JS has loaded
		goodTube_videojs_player.on('ready', function () {
			goodTube_videojs_player_loaded = true;

			// Sync the Youtube player for watch history
			goodTube_youtube_syncPlayers();

			// Enable the qualities API
			goodTube_qualityApi = goodTube_videojs_player.hlsQualitySelector();

			// Add expand and close miniplayer buttons
			let goodTube_target = document.querySelector('#goodTube_player');

			if (goodTube_target) {
				let miniplayer_closeButton = document.createElement('div');
				miniplayer_closeButton.id = 'goodTube_miniplayer_closeButton';
				miniplayer_closeButton.onclick = function () {
					goodTube_player_miniplayerShowHide();
				};
				goodTube_target.appendChild(miniplayer_closeButton);

				let miniplayer_expandButton = document.createElement('div');
				miniplayer_expandButton.id = 'goodTube_miniplayer_expandButton';
				miniplayer_expandButton.onclick = function () {
					if (goodTube_player_miniplayer_video !== goodTube_getParams['v']) {
						window.location.href = '/watch?v=' + goodTube_player_miniplayer_video + '&t=' + parseFloat(goodTube_player.currentTime).toFixed(0) + 's';
					}
					else {
						goodTube_player_miniplayerShowHide();
					}
				};
				goodTube_target.appendChild(miniplayer_expandButton);
			}

			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Player loaded');
			}

			// Expose the goodTube player
			goodTube_player = document.querySelector('#goodTube_player video');

			// Attach mobile seeking events
			if (goodTube_mobile) {
				// Attach the backwards seek button
				let goodTube_seekBackwards = document.createElement('div');
				goodTube_seekBackwards.id = 'goodTube_seekBackwards';
				goodTube_target.append(goodTube_seekBackwards);

				// Double tap event to seek backwards
				goodTube_seekBackwards.onclick = function () {
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

				goodTube_seekForwards.onclick = function () {
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
				goodTube_target.addEventListener('touchstart', function (e) {
					// Start fast forward after 1 second
					goodTube_videojs_fastForward = setTimeout(function () {
						// Remove active state and hide overlays (so you can see the video properly)
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');

						// Set playback rate to 2x (fast forward)
						goodTube_player.playbackRate = 2;
					}, 1000);
				});

				// On touch move
				goodTube_target.addEventListener('touchmove', function (e) {
					// Remove any pending timeouts to fast forward
					if (goodTube_videojs_fastForward) {
						clearTimeout(goodTube_videojs_fastForward);
					}
					goodTube_videojs_fastForward = false;

					// Set the playback rate to 1x (normal)
					goodTube_player.playbackRate = 1;
				});

				// On touch end
				goodTube_target.addEventListener('touchend', function (e) {
					// Remove any pending timeouts to fast forward
					if (goodTube_videojs_fastForward) {
						clearTimeout(goodTube_videojs_fastForward);
					}
					goodTube_videojs_fastForward = false;

					// Set the playback rate to 1x (normal)
					goodTube_player.playbackRate = 1;
				});
			}

			// Double click to fullscreen (desktop only)
			if (!goodTube_mobile) {
				goodTube_target.addEventListener('dblclick', function (event) {
					document.querySelector('.vjs-fullscreen-control')?.click();
				});
			}

			// Position timestamp every 100ms (mobile only)
			if (goodTube_mobile) {
				setInterval(function () {
					let currentTime = document.querySelector('.vjs-current-time');
					let divider = document.querySelector('.vjs-time-divider');
					let duration = document.querySelector('.vjs-duration');

					if (currentTime && divider && duration) {
						let leftOffset = 16;
						let padding = 4;

						currentTime.style.left = leftOffset + 'px';
						divider.style.left = (leftOffset + currentTime.offsetWidth + padding) + 'px';
						duration.style.left = (leftOffset + currentTime.offsetWidth + divider.offsetWidth + padding + padding) + 'px';
					}
				}, 100);
			}

			// Active and inactive control based on mouse movement (desktop only)
			if (!goodTube_mobile) {
				// Mouse off make inactive
				goodTube_target.addEventListener('mouseout', function (event) {
					if (goodTube_target.classList.contains('vjs-user-active') && !goodTube_target.classList.contains('vjs-paused')) {
						goodTube_target.classList.remove('vjs-user-active');
						goodTube_target.classList.add('vjs-user-inactive');
					}
				});

				// Mouse over make active
				goodTube_target.addEventListener('mouseover', function (event) {
					if (goodTube_target.classList.contains('vjs-user-inactive') && !goodTube_target.classList.contains('vjs-paused')) {
						goodTube_target.classList.add('vjs-user-active');
						goodTube_target.classList.remove('vjs-user-inactive');
					}
				});

				// Click to play, don't make inactive (override video js default behavior)
				goodTube_target.addEventListener('click', function (event) {
					setTimeout(function () {
						if (goodTube_target.classList.contains('vjs-user-inactive') && !goodTube_target.classList.contains('vjs-paused')) {
							goodTube_target.classList.add('vjs-user-active');
							goodTube_target.classList.remove('vjs-user-inactive');

							// Set a timeout to make inactive (to replace video js default behavior)
							window.goodTube_inactive_timeout = setTimeout(function () {
								if (goodTube_target.classList.contains('vjs-user-active') && !goodTube_target.classList.contains('vjs-paused')) {
									goodTube_target.classList.remove('vjs-user-active');
									goodTube_target.classList.add('vjs-user-inactive');
								}
							}, 3000);
						}
					}, 1);
				});

				// If they move the mouse, remove our timeout to make inactive (return to video js default behavior)
				goodTube_target.addEventListener('mousemove', function (event) {
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
			// If autoplay cookie doesn't exist, turn autoplay on
			if (!goodTube_helper_getCookie('goodTube_autoplay')) {
				goodTube_helper_setCookie('goodTube_autoplay', 'on');
			}

			// Select the correct autoplay button
			let autoplayButton = document.querySelector('.vjs-autoplay-button');

			if (autoplayButton) {
				// Deselect all our autoplay menu items
				autoplayButton.querySelector('.vjs-menu .vjs-selected')?.classList.remove('vjs-selected');

				// Select the correct autoplay menu item
				let autoplay_menuItems = autoplayButton.querySelectorAll('.vjs-menu .vjs-menu-item') as NodeListOf<HTMLDivElement>;

				if (autoplay_menuItems.length > 0) {
					if (goodTube_helper_getCookie('goodTube_autoplay') === 'on') {
						autoplay_menuItems[autoplay_menuItems.length - 1]!.classList.add('vjs-selected');
					} else {
						autoplay_menuItems[0]!.classList.add('vjs-selected');
					}
				}
			}

			// Make mute button work
			let muteButton = document.querySelector<HTMLElement>('.vjs-mute-control');
			if (muteButton) {
				muteButton.onmousedown = function () {
					if (goodTube_player.muted) {
						goodTube_videojs_player.muted(false);
					}
					else {
						goodTube_videojs_player.muted(true);
					}
				}

				muteButton.ontouchstart = function () {
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
				playPauseButton.removeEventListener('click', goodTube_player_videojs_playPause, false);
				playPauseButton.addEventListener('click', goodTube_player_videojs_playPause, false);
			}

			// Click off close menu
			document.onmousedown = function (event) {
				if (event && event.target instanceof HTMLElement) {
					if (!event.target.closest('.vjs-menu') && !event.target.closest('.vjs-menu-button')) {
						let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

						openMenuButtons.forEach((openMenuButton) => {
							openMenuButton.classList.remove('vjs-menuOpen');
						});
					}
				}
			};



			document.ontouchstart = function (event) {
				if (event && event.target instanceof HTMLElement) {
					if (!event.target.closest('.vjs-menu') && !event.target.closest('.vjs-menu-button')) {
						let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

						openMenuButtons.forEach((openMenuButton) => {
							openMenuButton.classList.remove('vjs-menuOpen');
						});
					}
				}
			};


			// Make replay button work
			let playButton = document.querySelector('.vjs-control-bar .vjs-play-control') as any;
			if (playButton) {
				playButton.onclick = function () {
					if (goodTube_player.currentTime === 0) {
						goodTube_player.click();
					}
				}

				playButton.ontouchstart = function () {
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
					sourceMenuItem.setAttribute('api', goodTube_apis[i]['url']);
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
			goodTube_player_selectApi(goodTube_helper_getCookie('goodTube_api_withauto'), false);

			// Update the video js player
			goodTube_player_videojs_update();
		});

		// Seeking events
		goodTube_videojs_player.on('seeking', function () {
			goodTube_seeking = true;
		});

		goodTube_videojs_player.on('seeked', function () {
			goodTube_seeking = false;

			// Sync the Youtube player for watch history
			goodTube_youtube_syncPlayers();
		});

		// On buffering / loading
		goodTube_videojs_player.on('waiting', function () {
			if (goodTube_bufferingTimeout) {
				clearTimeout(goodTube_bufferingTimeout);
			}

			// If we're at the start of the video, don't do anything
			if (goodTube_player.currentTime <= 0) {
				return;
			}

			// If we're not seeking
			if (!goodTube_seeking) {
				// And we've had to wait for it to buffer 3 times, select the next server
				goodTube_bufferCount++;

				if (goodTube_bufferCount >= 3) {
					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Video buffering too often - selecting next video source...');
					}

					// Reset the buffer count
					goodTube_bufferCount = 0;

					// Set the player time to be restored when the new server loads
					goodTube_player_restoreTime = goodTube_player.currentTime;

					// Select the next server
					goodTube_player_selectApi('automatic', true);

					return;
				}
			}

			// Only do this for HD servers (Invidious and Piped)
			if ((goodTube_api_type === 2 || goodTube_api_type === 3)) {
				// Save the time we started buffering
				let bufferStartTime = goodTube_player.currentTime;

				// If we've been waiting more than 15s, select the next server
				goodTube_bufferingTimeout = setTimeout(function () {
					if (goodTube_player.currentTime === bufferStartTime) {
						// Debug message
						if (goodTube_debug) {
							console.log('[GoodTube] Video not loading fast enough - selecting next video source...');
						}

						// Set the player time to be restored when the new server loads
						goodTube_player_restoreTime = goodTube_player.currentTime;

						// Select the next server
						goodTube_player_selectApi('automatic', true);
					}
				}, 15000);
			}
		});

		// Esc keypress close menus
		document.addEventListener('keydown', function (event) {
			if (event.keyCode == 27) {
				let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');

				openMenuButtons.forEach((openMenuButton) => {
					openMenuButton.classList.remove('vjs-menuOpen');
				});
			}
		}, true);

		// Once the metadata has loaded
		goodTube_videojs_player.on('loadedmetadata', function () {
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
		goodTube_videojs_player.on('loadstart', function () {
			// Clear any loading timeouts
			if (goodTube_loadingTimeout) {
				clearTimeout(goodTube_loadingTimeout);
			}

			// If we've been waiting more than 15s, select the next server
			goodTube_loadingTimeout = setTimeout(function () {
				// Debug message
				if (goodTube_debug) {
					console.log('[GoodTube] Video not loading fast enough - selecting next video source...');
				}

				// Get the next server
				goodTube_player_selectApi('automatic', true);
			}, 15000);

			// Enable the player
			goodTube_player.classList.remove('goodTube_hidden');

			// Server 1 quality stuff
			if (goodTube_api_type === 1) {
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
				let goodTube_target = document.querySelector('#goodTube_player_wrapper3');

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
				if (goodTube_debug) {
					if (goodTube_player_reloadVideoAttempts <= 1) {
						console.log('[GoodTube] Loading quality ' + qualityLabel + '...');
					}
				}
			}


			// Server type 2 (dash) quality stuff
			else if (goodTube_api_type === 2 || goodTube_api_type === 3) {
				// Target the outer wrapper
				let goodTube_target = document.querySelector('#goodTube_player_wrapper3');

				// Remove any audio styles from the player
				if (goodTube_target.classList.contains('goodTube_audio')) {
					goodTube_target.classList.remove('goodTube_audio');
				}

				// Debug message
				if (goodTube_debug) {
					if (goodTube_player_reloadVideoAttempts <= 1) {
						console.log('[GoodTube] Loading qualities...');
					}
				}
			}
		});

		// Once loaded data
		goodTube_videojs_player.on('loadeddata', function () {
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
			if (goodTube_debug) {
				if (goodTube_api_type === 1) {
					console.log('[GoodTube] Quality loaded');
				}
				else if (goodTube_api_type === 2 || goodTube_api_type === 3) {
					console.log('[GoodTube] Qualities loaded');
				}
			}

			// Update the video js player
			goodTube_player_videojs_update();

			// Remove the loading state
			goodTube_player_removeLoadingState();
		});

		// Play next video this video has ended
		goodTube_videojs_player.on('ended', function () {
			goodTube_player_ended = true;
			goodTube_youtube_syncPlayers();
			goodTube_nextVideo();
		});

		// Save the volume you were last at in a cookie
		goodTube_videojs_player.on('volumechange', function () {
			let volume = goodTube_player.volume;
			if (goodTube_player.muted) {
				volume = 0;
			}

			goodTube_helper_setCookie('goodTube_volume', volume);
		});
	}

	// Load the skin
	function goodTube_player_videojs_loadSkin() {
		let style = document.createElement('style');
		style.textContent = style2;

		document.body.appendChild(style);
	}

	// Setup the previous button history
	function goodTube_player_videojs_setupPrevHistory() {
		// If we've hit the previous button
		if (goodTube_helper_getCookie('goodTube_previous') === 'true') {
			// Remove the last item from the previous video array
			goodTube_videojs_previousVideo.pop();

			goodTube_helper_setCookie('goodTube_previous', 'false');
		}
		// Otherwise it's a normal video load
		else {
			// Add this page to the previous video array
			goodTube_videojs_previousVideo.push(window.location.href);
		}
	}

	// Play / pause
	function goodTube_player_videojs_playPause() {
		let playPauseButton = document.querySelector<HTMLElement>('.vjs-play-control');

		if (playPauseButton && playPauseButton.classList.contains('vjs-playing')) {
			goodTube_player_play(goodTube_player);
		}
		else {
			goodTube_player_pause(goodTube_player);
		}
	}

	// Update the video js player
	function goodTube_player_videojs_update() {
		// Make menus work
		let menuButtons = document.querySelectorAll<HTMLElement>('.vjs-control-bar button');
		menuButtons.forEach((button) => {
			button.onclick = function () {
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

			button.ontouchstart = function () {
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

		const onClickOrTap = (element: any, handler: any) => {
			let touchMoveHappened = false;

			function touchstart() {
				touchMoveHappened = false;
			}

			function touchmove() {
				touchMoveHappened = true;
			}

			function touchend(e: any) {
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
			onClickOrTap(item, (_: any) => {
				let delay = 0;

				if (goodTube_mobile) {
					delay = 400;
				}

				setTimeout(function () {
					let openMenuButtons = document.querySelectorAll('.vjs-menuOpen');
					openMenuButtons.forEach((openMenuButton) => {
						openMenuButton.classList.remove('vjs-menuOpen');
					});
				}, delay);
			});
		});

		// Add a hover bar to the DOM if we haven't alread (desktop only)
		if (!goodTube_mobile) {
			let progressControl = document.querySelector('.video-js .vjs-progress-control');
			if (progressControl) {
				if (!progressControl.querySelector('.goodTube_hoverBar')) {
					let hoverBar = document.createElement('div');
					hoverBar.classList.add('goodTube_hoverBar');
					progressControl.appendChild(hoverBar);

					// Add actions to size the hover bar
					progressControl.addEventListener('mousemove', function (event) {
						window.requestAnimationFrame(function () {
							let mouseDisplay = progressControl.querySelector('.vjs-mouse-display');
							if (mouseDisplay instanceof HTMLElement) {
								hoverBar.style.width = mouseDisplay.style.left;
							}
						});
					});
				}
			}
		}

	}

	// Reload the video data
	function goodTube_player_reloadVideoData() {
		// Debug message
		if (goodTube_debug) {
			console.log('\n-------------------------\n\n');
			console.log('[GoodTube] Loading video data from ' + goodTube_api_name + '...');
		}

		let delay = 0;
		if (goodTube_mobile) {
			delay = 400;
		}

		setTimeout(function () {
			goodTube_player_loadVideoDataAttempts = 0;
			goodTube_player_loadVideo(goodTube_player);
		}, delay);
	}

	// Show an error on screen, or select next server if we're on automatic mode
	function goodTube_player_videojs_handleError() {
		// Clear any buffering and loading timeouts
		if (goodTube_bufferingTimeout) {
			clearTimeout(goodTube_bufferingTimeout);
		}
		if (goodTube_loadingTimeout) {
			clearTimeout(goodTube_loadingTimeout);
		}

		// What api are we on?
		let selectedApi = goodTube_helper_getCookie('goodTube_api_withauto');

		// Are we out of automatic servers?
		let showNoServersError = false;
		if (typeof goodTube_apis[goodTube_automaticServerIndex] === 'undefined') {
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
			if (goodTube_debug) {
				console.log('[GoodTube] Video could not be loaded - selecting next video source...');
			}

			// Set the player time to be restored when the new server loads
			if (goodTube_player.currentTime > 0) {
				goodTube_player_restoreTime = goodTube_player.currentTime;
			}

			// Select next server
			goodTube_player_selectApi('automatic', true);
		}


		// If it's manual
		else {
			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Video could not be loaded - selecting next video source...');
			}

			// Set the player time to be restored when the new server loads
			if (goodTube_player.currentTime > 0) {
				goodTube_player_restoreTime = goodTube_player.currentTime;
			}

			// Go to automatic mode
			goodTube_automaticServerIndex = 0;
			goodTube_player_selectApi('automatic', true);
		}
	}

	// Hide an error on screen
	function goodTube_player_videojs_hideError() {
		let error = document.querySelector('#goodTube_error');
		if (error) {
			error.remove();
		}
	}

	// Show downloading indicator
	function goodTube_player_videojs_showDownloading() {
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
	function goodTube_player_videojs_hideDownloading(hideMessage) {
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
		if (goodTube_debug && typeof hideMessage === 'undefined') {
			console.log('[GoodTube] Downloads finished');
		}
	}

	// Show or hide the download playlist buttons
	function goodTube_player_videojs_showHideDownloadPlaylistButtons() {
		// Target the playlist buttons
		let playlistButton_cancel = document.querySelector('.goodTube_downloadPlaylist_cancel');
		let goodTube_downloadPlaylist_video = document.querySelector('.goodTube_downloadPlaylist_video');
		let goodTube_downloadPlaylist_audio = document.querySelector('.goodTube_downloadPlaylist_audio');

		// Make sure the playlist buttons exist
		if (!playlistButton_cancel || !goodTube_downloadPlaylist_video || !goodTube_downloadPlaylist_audio) {
			return;
		}

		// If we're viewing a playlist
		if (typeof goodTube_getParams['i'] !== 'undefined' || typeof goodTube_getParams['index'] !== 'undefined' || typeof goodTube_getParams['list'] !== 'undefined') {
			// Show the download playlist buttons
			goodTube_helper_showElement(goodTube_downloadPlaylist_video);
			goodTube_helper_showElement(goodTube_downloadPlaylist_audio);
		}
		// If we're not viewing a playlist
		else {
			// Hide the download playlist buttons
			goodTube_helper_hideElement(goodTube_downloadPlaylist_video);
			goodTube_helper_hideElement(goodTube_downloadPlaylist_audio);
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

	// Show or hide the next and previous button
	function goodTube_player_videojs_showHideNextPrevButtons() {
		goodTube_videojs_prevButton = false;
		goodTube_videojs_nextButton = true;

		// Don't show next / prev in the miniplayer / pip unless we're viewing a video
		if ((goodTube_player_miniplayer || goodTube_player_pip) && typeof goodTube_getParams['v'] === 'undefined') {
			goodTube_videojs_prevButton = false;
			goodTube_videojs_nextButton = false;
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
					goodTube_videojs_prevButton = true;
				}
			}
			// Otherwise we're not in a playlist, so if a previous video exists
			else if (goodTube_videojs_previousVideo[goodTube_videojs_previousVideo.length - 2] && goodTube_videojs_previousVideo[goodTube_videojs_previousVideo.length - 2] !== window.location.href) {
				// Enable the previous button
				goodTube_videojs_prevButton = true;
			}
		}

		// Show or hide the previous button
		let prevButton = document.querySelector<HTMLElement>('.vjs-prev-button');
		if (prevButton) {
			if (!goodTube_videojs_prevButton) {
				goodTube_helper_hideElement(prevButton);
			}
			else {
				goodTube_helper_showElement(prevButton);
			}
		}

		// Show or hide the next button
		let nextButton = document.querySelector<HTMLElement>('.vjs-next-button');
		if (nextButton) {
			if (!goodTube_videojs_nextButton) {
				goodTube_helper_hideElement(nextButton);
			}
			else {
				goodTube_helper_showElement(nextButton);
			}
		}
	}


	/* GoodTube general functions
	------------------------------------------------------------------------------------------ */
	let {
		goodTube_stopUpdates,
		goodTube_previousUrl,
		goodTube_previousPlaylist,
		goodTube_player,
		goodTube_getParams,
		goodTube_downloadTimeouts,
		goodTube_pendingDownloads,
		goodTube_mobile,
		goodTube_clickedPlaylistOpen
	} = goodTube;

	// API subtitle / storyboard servers
	let goodTube_otherDataServersIndex_subtitles = 0;
	let goodTube_otherDataServersIndex_storyboard = 0;
	let goodTube_otherDataServers = [
		'https://yt.artemislena.eu',
		'https://invidious.perennialte.ch',
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

	// Download servers

	// We first try these servers, recommended by "ihatespawn".
	// As I understand it these are ok to use, not trying to step on anyone's toes here.
	// Any issues with this implementation, please contact me. I am happy to work with you, so long as we let people download from somewhere.
	let goodTube_downloadServers = [
		'https://dl01.yt-dl.click',
		'https://dl02.yt-dl.click',
		'https://dl03.yt-dl.click',
		'https://apicloud9.filsfkwtlfjas.xyz',
		'https://apicloud3.filsfkwtlfjas.xyz',
		'https://apicloud8.filsfkwtlfjas.xyz',
		'https://apicloud4.filsfkwtlfjas.xyz',
		'https://apicloud5.filsfkwtlfjas.xyz',
	];

	// Only if they fail; we then fallback to using community instances.
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

	// Combine the download servers
	goodTube_downloadServers = goodTube_downloadServers.concat(goodTube_downloadServers_community);

	// API Endpoints
	let goodTube_apis = [
		// AUTOMATIC OPTION
		// --------------------------------------------------------------------------------
		{
			'name': 'Automatic',
			'type': false,
			'proxy': true,
			'url': 'automatic'
		},

		// HD SERVERS
		// --------------------------------------------------------------------------------
		// FAST
		{
			'name': 'Anubis (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.r4fo.com'
		},
		// FAST
		{
			'name': 'Ra (US)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.us.projectsegfau.lt'
		},
		// FAST
		{
			'name': 'Hades (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.dedyn.io'
		},
		// FAST
		{
			'name': 'Rain (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.andreafortuna.org'
		},
		// FAST
		{
			'name': 'Serpent (US)',
			'type': 2,
			'proxy': true,
			'url': 'https://invidious.darkness.services'
		},
		// FAST
		{
			'name': 'Acid (US)',
			'type': 2,
			'proxy': true,
			'url': 'https://invidious.incogniweb.net'
		},
		// FAST
		{
			'name': 'Sphynx (JP)',
			'type': 2,
			'proxy': true,
			'url': 'https://invidious.jing.rocks'
		},

		// // FAST
		// {
		// 	'name': 'Obsidian (AT)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://pipedapi.leptons.xyz'
		// },
		// FAST
		{
			'name': 'Sphere (US)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.darkness.services'
		},
		// FAST
		{
			'name': 'Phoenix (US)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.drgns.space'
		},
		// // MEDIUM
		// {
		// 	'name': 'Hunter (NL)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://pipedapi.ducks.party'
		// },
		// MEDIUM
		{
			'name': 'Sapphire (IN)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.in.projectsegfau.lt'
		},
		// MEDIUM
		{
			'name': 'Space (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.smnz.de'
		},
		// MEDIUM
		{
			'name': 'Orchid (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://api.piped.yt'
		},
		// MEDIUM
		{
			'name': 'Emerald (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.phoenixthrush.com'
		},
		// MEDIUM
		{
			'name': '420 (FI)',
			'type': 2,
			'proxy': true,
			'url': 'https://invidious.privacyredirect.com'
		},
		// MEDIUM
		{
			'name': 'Onyx (FR)',
			'type': 2,
			'proxy': true,
			'url': 'https://invidious.fdn.fr'
		},
		// MEDIUM
		{
			'name': 'Indigo (FI)',
			'type': 2,
			'proxy': true,
			'url': 'https://iv.datura.network'
		},
		// MEDIUM
		{
			'name': 'Andromeda (FI)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi-libre.kavin.rocks'
		},
		// // MEDIUM
		// {
		// 	'name': 'Lilith (INT)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://pipedapi.syncpundit.io'
		// },
		// MEDIUM
		{
			'name': 'Basilisk (DE)',
			'type': 3,
			'proxy': true,
			'url': 'https://pipedapi.adminforge.de'
		},
		// MEDIUM
		{
			'name': 'Golem (AT)',
			'type': 3,
			'proxy': true,
			'url': 'https://schaunapi.ehwurscht.at'
		},

		// // SLOW
		// {
		// 	'name': 'Centaur (FR)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://api.piped.projectsegfau.lt'
		// },
		// // SLOW
		// {
		// 	'name': 'Cypher (FR)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://api.piped.privacydev.net'
		// },
		// // SLOW
		// {
		// 	'name': 'T800 (DE)',
		// 	'type': 2,
		// 	'proxy': true,
		// 	'url': 'https://invidious.protokolla.fi'
		// },
		// // SLOW
		// {
		// 	'name': 'Wasp (DE)',
		// 	'type': 2,
		// 	'proxy': true,
		// 	'url': 'https://iv.melmac.space'
		// },
		// // SLOW
		// {
		// 	'name': 'Platinum (TR)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://pipedapi.ngn.tf'
		// },
		// // SLOW
		// {
		// 	'name': 'Minotaur (NL)',
		// 	'type': 3,
		// 	'proxy': true,
		// 	'url': 'https://pipedapi.astartes.nl'
		// },

		// 360p SERVERS
		// --------------------------------------------------------------------------------
		{
			'name': '360p - Amethyst (DE)',
			'type': 1,
			'proxy': true,
			'url': 'https://yt.artemislena.eu'
		},
		{
			'name': '360p - Goblin (AU)',
			'type': 1,
			'proxy': false,
			'url': 'https://invidious.perennialte.ch'
		},
		// {
		// 	'name': '360p - Jade (SG)',
		// 	'type': 1,
		// 	'proxy': true,
		// 	'url': 'https://vid.lilay.dev'
		// },
		{
			'name': '360p - Nymph (AT)',
			'type': 1,
			'proxy': true,
			'url': 'https://invidious.private.coffee'
		},
		{
			'name': '360p - Raptor (US)',
			'type': 1,
			'proxy': true,
			'url': 'https://invidious.drgns.space'
		},
		// {
		// 	'name': '360p - Velvet (CL)',
		// 	'type': 1,
		// 	'proxy': true,
		// 	'url': 'https://inv.nadeko.net'
		// },
		// {
		// 	'name': '360p - Druid (DE)',
		// 	'type': 1,
		// 	'proxy': true,
		// 	'url': 'https://invidious.projectsegfau.lt'
		// }
	];

	// Set the starting server to automatic mode
	let goodTube_api_type = goodTube_apis[0]['type'];
	let goodTube_api_proxy = goodTube_apis[0]['proxy'];
	let goodTube_api_url = goodTube_apis[0]['url'];
	let goodTube_api_name = goodTube_apis[0]['name'];

	// Press shortcut
	function goodTube_shortcut(shortcut) {
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

			// Temp fix for theater mode shortcut
			let youtubeTheaterButton = document.querySelector('.ytp-size-button');
			if (youtubeTheaterButton) {
				youtubeTheaterButton.click();
				return;
			}

		}
		else if (shortcut === 'fullscreen') {
			theKey = 'f';
			keyCode = 70;
			shiftKey = false;
		}
		else {
			return;
		}

		let e : KeyboardEvent | null = null;
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

	// Generate playlist links
	function goodTube_generatePlaylistLinks() {
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

		// If we're not viewing a playlist, just return.
		if (typeof goodTube_getParams['i'] === 'undefined' && typeof goodTube_getParams['index'] === 'undefined' && typeof goodTube_getParams['list'] === 'undefined') {
			return;
		}

		// Otherwise we are viewing a playlist, so populate the playlist container
		let youtubeFrameAPI = document.getElementById('movie_player');

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

		// If we couldn't find the playlist items, retry (the DOM can take some time to load)
		if (!playlistLinks || !playlistLinks.length) {
			setTimeout(goodTube_generatePlaylistLinks, 100);
		}

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
			if (playlistItem.href.indexOf(goodTube_getParams['v']) !== -1) {
				playlistItemElement.classList.add('goodTube_selected');
			}

			// Add the item to the playlist container
			playlistContainer.appendChild(playlistItemElement);

			i++;
		});
	}

	// Play the previous video
	function goodTube_prevVideo() {
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
					let findUrl = '/watch' + bits[1];

					// Desktop
					if (!goodTube_mobile) {
						clickedPlaylistItem = true;
						document.querySelector('#playlist-items > a[href="' + findUrl + '"]')?.click();
					}
					// Mobile
					else {
						clickedPlaylistItem = true;
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="' + findUrl + '"]')?.click();
					}

					if (clickedPlaylistItem) {
						clickedPlaylistItem = true;

						// Double check that the playlist is open, if not - open it.
						let playlistContainer = document.querySelector('ytm-playlist-panel-renderer');
						if (!playlistContainer) {
							let openButton = document.querySelector('ytm-playlist-panel-entry-point');

							if (openButton && !goodTube_clickedPlaylistOpen) {
								goodTube_clickedPlaylistOpen = true;
								openButton.click();
								setTimeout(goodTube_prevVideo, 500);
							}

							return;
						}

						goodTube_clickedPlaylistOpen = false;

						// Click the matching playlist item
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="' + findUrl + '"]')?.click();
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
		if (!clickedPlaylistItem && goodTube_videojs_previousVideo[goodTube_videojs_previousVideo.length - 2] && goodTube_videojs_previousVideo[goodTube_videojs_previousVideo.length - 2] !== window.location.href) {
			// Debug message
			if (goodTube_debug) {
				console.log('[GoodTube] Playing previous video...');
			}

			// Go back to the previous video
			goodTube_helper_setCookie('goodTube_previous', 'true');
			window.history.go(-1);
		}
	}

	// Play the next video
	function goodTube_nextVideo(pressedButton = false) {
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
					let findUrl = '/watch' + bits[1];

					// Desktop
					if (!goodTube_mobile) {
						clickedPlaylistItem = true;
						document.querySelector('#playlist-items > a[href="' + findUrl + '"]')?.click();
					}
					// Mobile
					else {
						clickedPlaylistItem = true;

						// Double check that the playlist is open, if not - open it.
						let playlistContainer = document.querySelector('ytm-playlist-panel-renderer');
						if (!playlistContainer) {
							let openButton = document.querySelector('ytm-playlist-panel-entry-point');

							if (openButton && !goodTube_clickedPlaylistOpen) {
								goodTube_clickedPlaylistOpen = true;
								openButton.click();
								setTimeout(goodTube_nextVideo, 500);
							}

							return;
						}

						goodTube_clickedPlaylistOpen = false;

						// Click the matching playlist item
						document.querySelector('ytm-playlist-panel-renderer a.compact-media-item-image[href="' + findUrl + '"]')?.click();
					}

					if (clickedPlaylistItem) {
						// Debug message
						if (goodTube_debug) {
							console.log('[GoodTube] Playing next video in playlist...');
						}
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
			if (goodTube_debug) {
				console.log('[GoodTube] Autoplaying next video...');
			}
		}
	}

	// Que download video / audio for a specificed youtube ID
	function goodTube_queDownload(serverIndex, type, youtubeId, fileName, codec) {
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
			if (goodTube_debug) {
				if (typeof fileName !== 'undefined') {
					alert('[GoodTube] ' + type.charAt(0).toUpperCase() + type.slice(1) + ' - ' + fileName + ' could not be downloaded. Please try again soon.');
					console.log('[GoodTube] ' + type.charAt(0).toUpperCase() + type.slice(1) + ' - ' + fileName + ' could not be downloaded. Please try again soon.');
				}
				else {
					alert('[GoodTube] ' + type.charAt(0).toUpperCase() + type.slice(1) + ' could not be downloaded. Please try again soon.');
					console.log('[GoodTube] ' + type.charAt(0).toUpperCase() + type.slice(1) + ' could not be downloaded. Please try again soon.');
				}
			}

			// Hide the downloading indicator
			goodTube_player_videojs_hideDownloading();

			return;
		}

		// Show the downloading indicator
		goodTube_player_videojs_showDownloading();

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

		goodTube_downloadTimeouts[youtubeId] = setTimeout(function () {
			// Debug message
			if (goodTube_debug) {
				if (fileName !== '') {
					console.log('[GoodTube] Downloading ' + type + ' - ' + fileName + '...');
				}
				else {
					console.log('[GoodTube] Downloading ' + type + '...');
				}
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
				'url': 'https://www.youtube.com/watch?v=' + youtubeId,
				'vCodec': vCodec,
				'vQuality': 'max',
				'filenamePattern': 'basic',
				'isAudioOnly': isAudioOnly
			});

			// Call the API (die after 10s)
			fetch(goodTube_downloadServers[serverIndex] + '/api/json', {
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
						if (typeof goodTube_pendingRetry['download_' + youtubeId] !== 'undefined') {
							clearTimeout(goodTube_pendingRetry['download_' + youtubeId]);
						}

						goodTube_pendingRetry['download_' + youtubeId] = setTimeout(function () {
							goodTube_queDownload(serverIndex, type, youtubeId, fileName);
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
								if (typeof goodTube_pendingRetry['download_' + youtubeId] !== 'undefined') {
									clearTimeout(goodTube_pendingRetry['download_' + youtubeId]);
								}

								goodTube_pendingRetry['download_' + youtubeId] = setTimeout(function () {
									goodTube_queDownload(serverIndex, type, youtubeId, fileName, nextCodec);
								}, goodTube_retryDelay);

								return;
							}
							// Otherwise, there's no more codecs to try, so display an error
							else {
								// Debug message
								if (goodTube_debug) {
									console.log('[GoodTube] Could not download ' + type + ' - ' + fileName);
								}

								// Remove from pending downloads
								if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
									delete goodTube_pendingDownloads[youtubeId];
								}

								// Hide the downloading indicator
								setTimeout(function () {
									goodTube_player_videojs_hideDownloading();
								}, 1000);

								return;
							}
						}
						// All other errors, just try again
						else {
							if (typeof goodTube_pendingRetry['download_' + youtubeId] !== 'undefined') {
								clearTimeout(goodTube_pendingRetry['download_' + youtubeId]);
							}

							serverIndex++;

							goodTube_pendingRetry['download_' + youtubeId] = setTimeout(function () {
								goodTube_queDownload(serverIndex, type, youtubeId, fileName);
							}, goodTube_retryDelay);

							return;
						}
					}

					// If the data is all good
					else if (typeof data['status'] !== 'undefined' && typeof data['url'] !== 'undefined') {
						// Download the file
						goodTube_downloadFile(data['url'], type, fileName, youtubeId, serverIndex);
					}
				})
				// If anything went wrong, try again
				.catch((error) => {
					if (typeof goodTube_pendingRetry['download_' + youtubeId] !== 'undefined') {
						clearTimeout(goodTube_pendingRetry['download_' + youtubeId]);
					}

					serverIndex++;

					goodTube_pendingRetry['download_' + youtubeId] = setTimeout(function () {
						goodTube_queDownload(serverIndex, type, youtubeId, fileName);
					}, goodTube_retryDelay);
				});
		}, (delaySeconds * 1000));
	}

	// Download the entire playlist (currently only works on desktop cus frame API limitations)
	function goodTube_downloadPlaylist(type, noPrompt) {
		// Show a "are you sure cus it takes some time" sort of message
		if (typeof noPrompt === 'undefined' && !confirm("Are you sure you want to download this playlist (" + type + ")?\r\rYou can keep playing and downloading other videos, just don't close the tab :)")) {
			return;
		}

		// Debug message
		if (goodTube_debug && typeof noPrompt === 'undefined') {
			console.log('[GoodTube] Downloading ' + type + ' playlist...');
		}

		// Get the playlist items
		let playlistItems = document.querySelectorAll('#goodTube_playlistContainer a');

		// Make sure the data is all good
		if (playlistItems.length <= 0) {
			if (goodTube_debug) {
				console.log('[GoodTube] Downloading failed, could not find playlist data.');
			}

			return;
		}

		let track = 0;
		playlistItems.forEach((playlistItem) => {
			// Get playlist info
			let fileName = goodTube_helper_padNumber((track + 1), 2) + ' - ' + playlistItem.innerHTML.trim();
			let url = playlistItem.href;

			// Make sure the data is all good
			if (!fileName || !url) {
				if (goodTube_debug) {
					console.log('[GoodTube] Downloading failed, could not find playlist data.');
				}

				return;
			}

			let urlGet = url.split('?')[1];

			let getParams = {};
			urlGet.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
				function decode(s) {
					return decodeURIComponent(s.split("+").join(" "));
				}

				getParams[decode(arguments[1])] = decode(arguments[2]);
			});

			let id = getParams['v'];

			// Add to pending downloads
			goodTube_pendingDownloads[id] = true;

			// Download the video
			goodTube_queDownload(0, type, id, fileName);

			track++;
		});
	}

	// Download a file as blob (this allows us to name it - so we use it for playlists - but it's doesn't actually download the file until fully loaded in the browser, which is kinda bad UX - but for now, it works!)
	function goodTube_downloadFile(url, type, fileName, youtubeId, serverIndex) {
		// Stop if this is no longer a pending download
		if (typeof goodTube_pendingDownloads[youtubeId] === 'undefined') {
			return;
		}

		// Show the downloading indicator
		goodTube_player_videojs_showDownloading();

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
					a.download = fileName + fileExtension;
					document.body.appendChild(a);

					// Click the link to download
					a.click();

					// Remove the blob from memory
					window.URL.revokeObjectURL(blobUrl);

					// Remove the link
					a.remove();

					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Downloaded ' + type + ' - ' + fileName);
					}

					// Remove from pending downloads
					if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
						delete goodTube_pendingDownloads[youtubeId];
					}

					// Hide the downloading indicator
					goodTube_player_videojs_hideDownloading();
				})
				// If anything went wrong, try again (next download server)
				.catch((error) => {
					if (typeof goodTube_pendingRetry['download_' + youtubeId] !== 'undefined') {
						clearTimeout(goodTube_pendingRetry['download_' + youtubeId]);
					}

					serverIndex++;

					goodTube_pendingRetry['download_' + youtubeId] = setTimeout(function () {
						goodTube_queDownload(serverIndex, type, youtubeId, fileName);
					}, goodTube_retryDelay);
				});
		}
		// Just open the stream URL on mobile (or for single files without a filename)
		else {
			window.open(url, '_self');

			// Debug message
			if (goodTube_debug) {
				if (fileName !== '') {
					console.log('[GoodTube] Downloaded ' + type + ' - ' + fileName);
				}
				else {
					console.log('[GoodTube] Downloaded ' + type);
				}
			}

			// Remove from pending downloads
			if (typeof goodTube_pendingDownloads[youtubeId] !== 'undefined') {
				delete goodTube_pendingDownloads[youtubeId];
			}

			// Hide the downloading indicator
			setTimeout(function () {
				goodTube_player_videojs_hideDownloading();
			}, 1000);
		}
	}

	// Cancel all pending downloads
	function goodTube_downloadsCancel() {
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
		goodTube_player_videojs_hideDownloading(true);

		// Debug message
		if (goodTube_debug) {
			console.log('[GoodTube] Downloads cancelled');
		}
	}

	// Check for updates
	function goodTube_checkForUpdates() {
		if (goodTube_stopUpdates) {
			return;
		}

		const scriptUrl = goodTube_github + '/goodtube.user.js?i' + Date.now();

		// Debug message
		if (goodTube_debug) {
			console.log('[GoodTube] Checking for updates...');
		}

		fetch(scriptUrl)
			.then(response => response.text())
			.then(data => {
				// Extract version from the script on GitHub
				const match = data.match(/@version\s+(\d+\.\d+)/);

				// If we can't find the version, just return
				if (!match) {
					return;
				}

				const currentVersion = parseFloat(GM_info.script.version);
				const githubVersion = parseFloat(match[1]);

				// There's no updates, so just return
				if (githubVersion <= currentVersion) {
					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] No updates found');
					}
					return;
				}

				// If a version is skipped, don't show the update message again until the next version
				if (parseFloat(localStorage.getItem('goodTube_stopUpdates')) === githubVersion) {
					return;
				}

				// Style SweetAlert2
				let style = document.createElement('style');
				style.textContent = `
				html body .swal2-container {
					z-index: 2400;
				}

				html body .swal2-title {
					font-size: 18px;
				}

				html body .swal2-html-container {
					font-size: 14px;
					margin-top: 8px;
					margin-bottom: 12px;
				}

				html body .swal2-actions {
					margin: 0 !important;
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
				}

				html body .swal2-actions button {
					margin: 0 !important;
					font-size: 12px;
				}
			`;
				document.head.appendChild(style);

				// Show the update prompt
				Swal.fire({
					position: "top-end",
					backdrop: false,
					title: 'GoodTube: a new version is available.',
					text: 'Do you want to update?',
					showCancelButton: true,
					showDenyButton: true,
					confirmButtonText: 'Update',
					denyButtonText: 'Skip',
					cancelButtonText: 'Close'
				})
					.then((result) => {
						if (result.isConfirmed) {
							window.location = scriptUrl;
						}
						else if (result.isDenied) {
							localStorage.setItem('goodTube_stopUpdates', githubVersion);
						}
					});

				// Debug message
				if (goodTube_debug) {
					console.log('[GoodTube] New version found - ' + githubVersion);
				}
			})
			.catch(error => {
				goodTube_stopUpdates = true;
			});

		goodTube_stopUpdates = true;
	}

	// Actions
	function goodTube_actions() {
		// Hide youtube players
		goodTube_youtube_hidePlayers();

		// Make the youtube player the lowest quality to save on bandwidth
		goodTube_youtube_lowestQuality();

		// Hide ads, shorts, etc - real time
		goodTube_youtube_hideAdsShortsEtc_realTime();

		// Remove that annoying "Are you still watching" prompt
		goodTube_youtube_areYouStillWatching();

		// Support timestamp links in comments
		goodTube_youtube_timestampLinks();

		// Check that the assets are loaded AND the player is loaded before continuing
		let player = goodTube_player;
		if (goodTube_player_loadedAssets >= goodTube_player_assets.length && goodTube_videojs_player_loaded) {
			// Setup the previous and new URL

			// Remove hashes, these mess with things sometimes
			let prevURL = goodTube_previousUrl;
			if (prevURL) {
				prevURL = prevURL.split('#')[0];
			}

			let currentURL = window.location.href.split('#')[0];
			if (currentURL) {
				currentURL = currentURL.split('#')[0];
			}

			// If the URL has changed (or on first page load)
			if (prevURL !== currentURL) {
				// Setup GET params
				goodTube_getParams = goodTube_helper_parseGetParams();

				// If we're viewing a video
				if (typeof goodTube_getParams['v'] !== 'undefined') {
					// Show the player (mobile only)
					if (goodTube_mobile) {
						goodTube_player_show(player);
					}

					// Debug message
					if (goodTube_debug) {
						console.log('\n-------------------------\n\n');
					}

					// Setup the previous button history
					goodTube_player_videojs_setupPrevHistory();

					// Reset the load video attempts
					goodTube_player_loadVideoDataAttempts = 0;

					// Remove the "restore to" time
					goodTube_player_restoreTime = 0;

					// Setup the previous and new playlist (if we're on one)
					let prevPlaylist = goodTube_previousPlaylist;

					let currentPlaylist = false;
					if (typeof goodTube_getParams['list'] !== 'undefined') {
						currentPlaylist = goodTube_getParams['list'];
					}

					// Select the server if we're on automatic
					if (goodTube_helper_getCookie('goodTube_api_withauto') === 'automatic') {
						// Reset to first server for automatic, only if we've changed playlist.
						if (!currentPlaylist || prevPlaylist !== currentPlaylist) {
							goodTube_automaticServerIndex = 0;
						}
						else if (goodTube_automaticServerIndex > 0) {
							// Otherwise stay on the same server
							goodTube_automaticServerIndex--;
						}

						// Select the automatic server
						goodTube_player_selectApi('automatic', false);
					}

					// Debug message
					if (goodTube_debug) {
						console.log('[GoodTube] Loading video data from ' + goodTube_api_name + '...');
					}

					// Generate the playlist links
					goodTube_generatePlaylistLinks();

					// Load the video
					goodTube_player_loadVideo(player);

					// Usage stats
					goodTube_stats_video();
				}
				// Otherwise we're not viewing a video, and we're not in the miniplayer or pip
				else if (!goodTube_player_miniplayer && !goodTube_player_pip) {
					// Clear the player
					goodTube_player_clear(goodTube_player);

					// Hide the player (mobile only)
					if (goodTube_mobile) {
						goodTube_player_hide(player);
					}

					// Empty the previous video history
					goodTube_videojs_previousVideo = [];

					// Clear any pending retry attempts
					for (let key in goodTube_pendingRetry) {
						if (goodTube_pendingRetry.hasOwnProperty(key)) {
							clearTimeout(goodTube_pendingRetry[key]);
						}
					}
				}

				// Ok, we've done what we need to with our player

				// Set the previous playlist
				if (typeof goodTube_getParams['list'] !== 'undefined') {
					goodTube_previousPlaylist = goodTube_getParams['list'];
				}
				else {
					goodTube_previousPlaylist = false;
				}

				// Set the previous URL (which pauses this part of the loop until the URL changes again)
				goodTube_previousUrl = window.location.href;
			}
		}
	}

	/*
		Basic usage stats
		Don't worry everyone - this is just a counter that totals unique users / how many videos were played with GoodTube.
		It's only in here so I can have some fun and see how many people use this thing I made - no private info is tracked.
	*/
	function goodTube_stats_unique() {
		if (!goodTube_helper_getCookie('goodTube_unique_new2')) {
			fetch('https://api.counterapi.dev/v1/goodtube/users/up/');

			// No longer works :(
			// fetch("https://api.lyket.dev/v1/clap-buttons/goodtube/users/press", {
			// 	method: "PUT",
			// 	headers: {
			// 		"Content-Type": "application/json",
			// 		"Authorization": 'Bearer pt_aa32dfa6765c4ac49ae96f6a423b02'
			// 	}
			// });

			// Set a cookie to only count users once
			goodTube_helper_setCookie('goodTube_unique_new2', 'true');
		}
	}

	function goodTube_stats_video() {
		fetch('https://api.counterapi.dev/v1/goodtube/videos/up/');

		// No longer works :(
		// fetch("https://api.lyket.dev/v1/clap-buttons/goodtube/videos/press", {
		// 	method: "PUT",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 		"Authorization": 'Bearer pt_aa32dfa6765c4ac49ae96f6a423b02'
		// 	}
		// });
	}

	// Init
	function goodTube_init() {
		// Debug message
		if (goodTube_debug) {
			console.log('\n==================================================\n    ______                ________      __\n   / ____/___  ____  ____/ /_  __/_  __/ /_  ___\n  / / __/ __ \\/ __ \\/ __  / / / / / / / __ \\/ _ \\\n / /_/ / /_/ / /_/ / /_/ / / / / /_/ / /_/ /  __/\n \\____/\\____/\\____/\\____/ /_/  \\____/_____/\\___/\n\n==================================================');
			console.log('[GoodTube] Initiating...');
		}

		// Check if we're on mobile or not
		if (window.location.href.indexOf('m.youtube') !== -1) {
			goodTube_mobile = true;
		}

		// If there's a cookie for our previously chosen API, select it
		let goodTube_api_cookie = goodTube_helper_getCookie('goodTube_api_withauto');
		if (goodTube_api_cookie) {
			goodTube_apis.forEach((api) => {
				if (api['url'] === goodTube_api_cookie) {
					goodTube_api_type = api['type'];
					goodTube_api_proxy = api['proxy'];
					goodTube_api_url = api['url'];
					goodTube_api_name = api['name'];
				}
			});
		}

		// Ensure that if they close the window in the middle of downloads, we reset the last download time
		window.addEventListener("beforeunload", (event) => {
			goodTube_helper_setCookie('goodTube_lastDownloadTimeSeconds', (new Date().getTime() / 1000));
		});

		// Mute, pause and skip ads on all Youtube as much as possible
		setInterval(goodTube_youtube_mutePauseSkipAds, 1);

		// Run the GoodTube actions initally
		setInterval(goodTube_actions, 1);

		// Setup our next / prev buttons to show or hide every 100ms
		setInterval(goodTube_player_videojs_showHideNextPrevButtons, 100);

		// Setup our playlist buttons to show or hide every 100ms
		setInterval(goodTube_player_videojs_showHideDownloadPlaylistButtons, 100);

		// Sync pip properly
		setInterval(goodTube_player_pipUpdate, 100);

		// Sync miniplayer properly
		setInterval(goodTube_player_miniplayerUpdate, 100);

		// Hide ads, shorts, etc - init
		goodTube_youtube_hideAdsShortsEtc_init();

		// Support hiding elements without Youtube knowing
		goodTube_helper_hideElement_init();

		// Mute, pause and skip ads on all Youtube initally
		goodTube_youtube_mutePauseSkipAds();

		// Load required assets
		goodTube_player_loadAssets();

		// Init our player
		goodTube_player_init();

		// Usage stats
		goodTube_stats_unique();
	}


	/* Start GoodTube
	------------------------------------------------------------------------------------------ */
	goodTube_init();

};

(async () => {
	try {
		await main();
	} catch (error) {
		console.error(error);
	}
})();

export { };
