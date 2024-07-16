// Load assets
function goodTube_player_loadAssets() {
	// Debug message
	if (goodTube_debug) {
		console.log('[GoodTube] Loading player assets...');
	}

	// Load the first asset, this will then load the others sequentially
	goodTube_player_loadAssetAttempts = 0;
	goodTube_player_loadAsset(goodTube_player_assets[goodTube_player_loadedAssets]);
}
