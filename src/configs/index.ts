// Set your github location for loading assets, etc
export const goodTube_github = 'https://raw.githubusercontent.com/goodtube4u/GoodTube/main';
// Select how long to wait before trying to load something again (in milliseconds)
export const goodTube_retryDelay = 500;
// Select how many times to try and load something again
export const goodTube_retryAttempts = 3;
// Enable debug console messages
export const goodTube_debug = true;

/* GoodTube general functions
------------------------------------------------------------------------------------------ */
let goodTube_stopUpdates = false;
let goodTube_previousUrl = false;
let goodTube_previousPlaylist = false;
let goodTube_player = false;
let goodTube_getParams = false;
let goodTube_downloadTimeouts: any[] = [];
let goodTube_pendingDownloads: any[] = [];
let goodTube_mobile = false;
let goodTube_clickedPlaylistOpen = false;
export const goodTube: any = {
	goodTube_stopUpdates,
	goodTube_previousUrl,
	goodTube_previousPlaylist,
	goodTube_player,
	goodTube_getParams,
	goodTube_downloadTimeouts,
	goodTube_pendingDownloads,
	goodTube_mobile,
	goodTube_clickedPlaylistOpen
};


/* Player functions
	------------------------------------------------------------------------------------------ */
let goodTube_pendingRetry: any[] = [];
let goodTube_player_restoreTime = 0;
let goodTube_player_assets = [
	// Unminified
	// goodTube_github+'/js/video.min.js',
	// goodTube_github+'/js/videojs-hls-quality-selector.js',
	// goodTube_github+'/js/videojs-vtt-thumbnails.js',
	// goodTube_github+'/js/videojs-quality-selector.js',
	// goodTube_github+'/css/videojs-core.css',
	// goodTube_github+'/css/videojs-vtt-thumbnails.css'

	// Minified
	goodTube_github + '/js/assets.min.js',
	goodTube_github + '/css/assets.min.css'
];
let goodTube_player_loadedAssets = 0;
let goodTube_player_loadAssetAttempts = 0;
let goodTube_player_loadVideoDataAttempts = 0;
let goodTube_player_loadChaptersAttempts = 0;
let goodTube_player_vttThumbnailsFunction = false;
let goodTube_player_reloadVideoAttempts = 1;
let goodTube_player_ended = false;
let goodTube_player_pip = false;
let goodTube_player_miniplayer = false;
let goodTube_player_miniplayer_video = false;
let goodTube_player_highestQuality = false;
let goodTube_player_selectedQuality = false;
let goodTube_player_manuallySelectedQuality = false;
let goodTube_updateChapters = false;
let goodTube_chapterTitleInterval = false;
let goodTube_chaptersChangeInterval = false;
let goodTube_updateManifestQualityTimeout = false;
export const goodTube_playerConfigs: any = {
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
};
