import { goodTube_debug } from "@/configs";

// Hide ads, shorts, etc - init
export function goodTube_youtube_hideAdsShortsEtc_init() {
	let style = document.createElement('style');
	style.textContent = `
		ytd-shelf-renderer,
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
		ytd-engagement-panel-section-list-renderer:not(.ytd-popup-container),
		ytd-compact-video-renderer:has(.goodTube_hidden),
		ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)
		.ytd-video-masthead-ad-v3-renderer,
		div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
		div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
		div#main-container.style-scope.ytd-promoted-video-renderer,
		div#player-ads.style-scope.ytd-watch-flexy,

		ytm-rich-shelf-renderer,
		ytm-shelf-renderer,
		ytm-button-renderer.icon-avatar_logged_out,
		ytm-companion-slot,
		ytm-shelf-renderer,
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
	if (goodTube_debug) {
		console.log('[GoodTube] Ads removed');
	}
}
