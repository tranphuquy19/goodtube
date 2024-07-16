export const css = `
# Implement your styles here !
`;

export const style1 = `
			/* Automatic server styling */
			#goodTube_player_wrapper1.goodTube_automaticServer #goodTube_player_wrapper2 .vjs-source-button ul li:first-child {
				background: #ffffff !important;
				color: #000000 !important;
			}

			#goodTube_player_wrapper1.goodTube_automaticServer .vjs-source-button ul li.vjs-selected {
				background-color: rgba(255, 255, 255, .2) !important;
				color: #ffffff !important;
			}


			/* Hide the volume tooltip */
			#goodTube_player_wrapper1 .vjs-volume-bar .vjs-mouse-display {
				display: none !important;
			}

			#contentContainer.tp-yt-app-drawer[swipe-open].tp-yt-app-drawer::after {
				display: none !important;
			}

			/* Live streams */
			#goodTube_player_wrapper1 .vjs-live .vjs-progress-control {
				display: block;
			}

			#goodTube_player_wrapper1 .vjs-live .vjs-duration-display,
			#goodTube_player_wrapper1 .vjs-live .vjs-time-divider {
				display: none !important;
			}

			/* Seek bar */
			#goodTube_player_wrapper1 .vjs-progress-control {
				position: absolute;
				bottom: 48px;
				left: 0;
				right: 0;
				width: 100%;
				height: calc(24px + 3px);
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider {
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

			#goodTube_player_wrapper1 .vjs-progress-control:hover .vjs-slider {
				pointer-events: none;
				height: 5px;
				bottom: 2px;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-load-progress {
				height: 100%;
				background: rgba(255, 255, 255, .2);
				transition: none;
				position: static;
				margin-bottom: -3px;
				transition: margin .1s linear;
			}

			#goodTube_player_wrapper1 .vjs-progress-control:hover .vjs-slider .vjs-load-progress {
				margin-bottom: -5px;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-load-progress .vjs-control-text {
				display: none;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-load-progress > div {
				background: transparent !important;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-play-progress {
				background: transparent;
				position: static;
				z-index: 1;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-play-progress::before {
				content: '';
				background: #ff0000;
				width: 100%;
				height: 100%;
				position: static;
				display: block;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-slider .vjs-play-progress::after {
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

			#goodTube_player_wrapper1 .vjs-progress-control:hover .vjs-slider .vjs-play-progress::after {
				opacity: 1;
				top: -9px;
			}


			/* Without chapters */
			#goodTube_player_wrapper1:not(.goodTube_hasChapters) .vjs-progress-control::before {
				content: '';
				position: absolute;
				bottom: 3px;
				left: 8px;
				right: 8px;
				height: 3px;
				background: rgba(255, 255, 255, .2);
				transition: height .1s linear, bottom .1s linear;
			}

			#goodTube_player_wrapper1:not(.goodTube_hasChapters) .vjs-progress-control:hover::before {
				height: 5px;
				bottom: 2px;
			}


			/* With chapters */
			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_chapters {
				position: absolute;
				top: 0;
				bottom: 0;
				left: 8px;
				right: 8px;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter {
				height: 100%;
				position: absolute;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter::before {
				content: '';
				background: rgba(255, 255, 255, .2);
				position: absolute;
				left: 0;
				right: 2px;
				bottom: 3px;
				height: 3px;
				transition: height .1s linear, bottom .1s linear, background .1s linear;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter.goodTube_redChapter::before {
				background: #ff0000 !important;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_chapters .goodTube_chapter:last-child::before {
				right: 0;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control:hover .goodTube_chapters .goodTube_chapter::before {
				height: 5px;
				bottom: 2px;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters:not(.goodTube_mobile) .vjs-progress-control .goodTube_chapters .goodTube_chapter:hover::before {
				height: 9px;
				bottom: 0;
				background: rgba(255, 255, 255, .4);
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_markers {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				pointer-events: none;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_marker {
				width: 2px;
				height: 100%;
				position: absolute;
				background: rgba(0, 0, 0, .2);
				margin-left: -2px;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_marker.goodTube_showMarker {
				background: rgba(0, 0, 0, .6);
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .goodTube_marker:last-child {
				display: none;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .vjs-mouse-display {
				background: transparent;
			}

			#goodTube_player_wrapper1.goodTube_hasChapters .vjs-progress-control .vjs-mouse-display .vjs-time-tooltip::before {
				content: attr(chapter-title);
				display: block;
				white-space: nowrap;
				margin-bottom: 4px;
			}

			#goodTube_player_wrapper1 .vjs-progress-control .goodTube_hoverBar {
				background: rgba(255, 255, 255, .4);
				position: absolute;
				bottom: 3px;
				left: 8px;
				height: 3px;
				opacity: 0;
				transition: height .1s linear, bottom .1s linear, opacity .1s linear;
			}

			#goodTube_player_wrapper1 .vjs-progress-control:hover .goodTube_hoverBar {
				height: 5px;
				bottom: 2px;
				opacity: 1;
			}

			#goodTube_player_wrapper1.goodTube_mobile .vjs-time-control .vjs-duration-display {
				white-space: nowrap;
			}

			#goodTube_player_wrapper1.goodTube_mobile .vjs-time-control .vjs-duration-display::after {
				content: attr(chapter-title);
				display: inline-block;
				color: #ffffff;
				margin-left: 3px;
			}

			#goodTube_player_wrapper1.goodTube_mobile .vjs-progress-control .vjs-slider,
			#goodTube_player_wrapper1.goodTube_mobile:not(.goodTube_hasChapters) .vjs-progress-control::before,
			#goodTube_player_wrapper1.goodTube_mobile.goodTube_hasChapters .vjs-progress-control .goodTube_chapters,
			#goodTube_player_wrapper1.goodTube_mobile .vjs-progress-control .goodTube_hoverBar {
				left: 16px;
				right: 16px;
			}


			/* Audio only view */
			#goodTube_player_wrapper3.goodTube_audio {
				background: #000000;
				position: relative;
			}

			#goodTube_player_wrapper3.goodTube_audio .video-js::after {
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
				#goodTube_player_wrapper3.goodTube_audio .video-js::after {
					font-size: 100px;
				}
			}

			#goodTube_player_wrapper1.goodTube_mobile #goodTube_player_wrapper3.goodTube_audio .video-js::after {
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

			/* Theater mode */
			ytd-watch-flexy[theater] #goodTube_player_wrapper1:not(.goodTube_mobile) {
				width: 100%;
				position: absolute;
				top: 56px;
				left: 0;
				right: 0;
				background: #000000;
				border-radius: 0;
			}

			ytd-watch-flexy:not(ytd-watch-flexy[theater]) #below,
			ytd-watch-flexy:not(ytd-watch-flexy[theater]) #secondary {
				margin-top: 0 !important;
			}

			ytd-watch-flexy[theater] #below {
				padding-top: 8px !important;
			}

			ytd-watch-flexy[theater] #secondary {
				padding-top: 16px !important;
			}

			ytd-watch-flexy[theater] #goodTube_player_wrapper1:not(.goodTube_mobile) {
				padding-top: min(var(--ytd-watch-flexy-max-player-height), (calc(var(--ytd-watch-flexy-height-ratio) / var(--ytd-watch-flexy-width-ratio) * 100%))) !important;
			}

			ytd-watch-flexy[theater] #goodTube_player_wrapper1:not(.goodTube_mobile) #goodTube_player_wrapper3,
			ytd-watch-flexy[theater] #goodTube_player_wrapper1:not(.goodTube_mobile) #goodTube_player_wrapper3 #goodTube_player {
				border-radius: 0;
			}

			/* Desktop */
			#goodTube_player_wrapper1:not(.goodTube_mobile) {
				position: relative;
				height: 0;
				padding-top: min(var(--ytd-watch-flexy-max-player-height), (calc(var(--ytd-watch-flexy-height-ratio) / var(--ytd-watch-flexy-width-ratio) * 100%))) !important;
				box-sizing: border-box;
				min-height: var(--ytd-watch-flexy-min-player-height);
			}

			#goodTube_player_wrapper1:not(.goodTube_mobile) #goodTube_player_wrapper2 {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				margin: 0 auto;
				min-height: 240px;
			}

			#goodTube_player_wrapper1:not(.goodTube_mobile) #goodTube_player_wrapper3 {
				box-sizing: border-box;
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				min-height: 240px;
			}

			#goodTube_player_wrapper1:not(.goodTube_mobile):not(.goodTube_miniplayer) #goodTube_player {
				border-radius: 12px;
			}

			#goodTube_player_wrapper1.goodTube_miniplayer.goodTube_mobile {
				position: absolute !important;
			}

			#goodTube_player_wrapper3 {
				overflow: hidden;
			}

			#goodTube_player_wrapper1:not(.goodTube_mobile) #goodTube_player_wrapper3 {
				border-radius: 12px;
			}

			/* Miniplayer */
			#goodTube_player_wrapper1.goodTube_miniplayer {
				z-index: 999 !important;
			}

			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js {
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
				border-radius: 12px;
				overflow: hidden;
			}

			#goodTube_player_wrapper1.goodTube_miniplayer.goodTube_mobile  #goodTube_player_wrapper3 .video-js {
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

			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js .vjs-source-button,
			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js .vjs-autoplay-button,
			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js .vjs-miniplayer-button,
			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js .vjs-theater-button {
				display: none !important;
			}

			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton {
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


			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::after {
				content: 'Close';
				right: 12px;
			}
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::after {
				content: 'Expand';
				left: 12px;
			}
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::after,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::after {
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
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton:hover::after,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton:hover::after {
				opacity: 1;
			}

			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton {
				right: 0;
				font-size: 24px;
			}
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_closeButton::before {
				content: "\\f119";
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}

			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton {
				left: 0;
				font-size: 18px;
			}
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js #goodTube_miniplayer_expandButton::before {
				content: "\\f128";
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}


			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-paused:not(.vjs-user-inactive) #goodTube_miniplayer_expandButton,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-user-active #goodTube_miniplayer_expandButton,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-paused:not(.vjs-user-inactive) #goodTube_miniplayer_closeButton,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-user-active #goodTube_miniplayer_closeButton {
				opacity: 1;
			}

			/* Mobile */
			html body #goodTube_player_wrapper1.goodTube_mobile {
				position: fixed;
				top: 48px;
				left: 0;
				right: 0;
				width: 100%;
				z-index: 1;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile #goodTube_player_wrapper2 {
				width: 100%;
				height: 100%;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile #goodTube_player_wrapper3 {
				width: 100%;
				height: 100%;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control.vjs-play-control,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-control.vjs-play-control {
				position: absolute;
				top: calc(50% - 48px);
				left: calc(50% - 32px);
				width: 64px;
				height: 64px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
			}
			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-play-control .vjs-icon-placeholder::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-play-control .vjs-icon-placeholder::before {
				font-size: 44px !important;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-prev-button,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-prev-button {
				position: absolute;
				top: calc(50% - 40px);
				left: calc(50% - 104px);
				width: 48px;
				height: 48px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
			}
			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-prev-button .vjs-icon-placeholder::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-prev-button .vjs-icon-placeholder::before {
				font-size: 32px !important;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-next-button,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-next-button {
				position: absolute;
				top: calc(50% - 40px);
				left: calc(50% + 56px);
				width: 48px;
				height: 48px;
				background: rgba(0, 0, 0, .3);
				border-radius: 50%;
				max-width: 999px !important;
			}
			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-next-button .vjs-icon-placeholder::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-next-button .vjs-icon-placeholder::before {
				font-size: 32px !important;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control-bar,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-control-bar {
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

				ytd-watch-flexy:not([theater]) #goodTube_player_wrapper1:not(.goodTube_mobile) .video-js .vjs-control-bar .vjs-button {
					zoom: .88;
				}
			}

			@media (max-width: 1016px) {
				ytd-watch-flexy:not([theater]) #primary {
					min-width: 0 !important;
				}

				ytd-watch-flexy:not([theater]) #goodTube_player_wrapper1:not(.goodTube_mobile) .video-js .vjs-control-bar .vjs-button {
					zoom: 1;
				}
			}

			@media (max-width: 786px) {
				ytd-watch-flexy:not([theater]) #goodTube_player_wrapper1:not(.goodTube_mobile) .video-js .vjs-control-bar .vjs-button {
					zoom: .9;
				}
			}

			@media (max-width: 715px) {
				ytd-watch-flexy:not([theater]) #goodTube_player_wrapper1:not(.goodTube_mobile) .video-js .vjs-control-bar .vjs-button {
					zoom: .85;
				}
			}

			@media (max-width: 680px) {
				ytd-watch-flexy:not([theater]) #goodTube_player_wrapper1:not(.goodTube_mobile) .video-js .vjs-control-bar .vjs-button {
					zoom: .8;
				}
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js {
				display: flex;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-source-button,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-source-button {
				margin-left: 0 !important;
			}

			@media (max-width: 480px) {
				html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-source-button .vjs-menu,
				html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-source-button .vjs-menu {
					left: 60px !important;
				}
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-loading-spinner,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js .vjs-loading-spinner {
				top: calc(50% - 16px);
			}

			html body #goodTube_player_wrapper1 .video-js.vjs-loading {
				background: #000000;
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js::before {
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

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js.vjs-paused::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-paused::before,
			html body #goodTube_player_wrapper1.goodTube_mobile .video-js.vjs-user-active::before,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-user-active::before {
				background: rgba(0,0,0,.6);
			}

			html body #goodTube_player_wrapper1.goodTube_mobile .video-js.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar,
			html body #goodTube_player_wrapper1.goodTube_miniplayer .video-js.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar {
				visibility: visible;
				opacity: 0;
				pointer-events: none;
			}

			#goodTube_player_wrapper1.goodTube_mobile #goodTube_player_wrapper3 .video-js .vjs-theater-button,
			#goodTube_player_wrapper1.goodTube_mobile #goodTube_player_wrapper3 .video-js .vjs-miniplayer-button {
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

			#goodTube_player_wrapper1.goodTube_mobile #goodTube_player,
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

export const style2 = `
			#goodTube_player_wrapper1:not(.goodTube_mobile) {
				border-radius: 12px;
			}

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
			html body #goodTube_player_wrapper1 .video-js .vjs-time-control {
				font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif !important;
				order: 4;
				font-size: 13.0691px !important;
				padding-top: 4px !important;
				color: rgb(221, 221, 221) !important;
				text-shadow: 0 0 2px rgba(0, 0, 0, .5) !important;
				min-width: 0 !important;
				z-index: 1;
			}

			html body #goodTube_player_wrapper1 .video-js .vjs-time-control * {
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

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-time-control {
				position: absolute;
				top: calc(100% - 98px);
				font-weight: 500;
				pointer-events: none;
			}

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-current-time {
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
			}

			.video-js .vjs-control-bar::before {
				content: '';
				position: absolute;
				left: 0;
				right: 0;
				bottom: 0;
				background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAD1CAYAAACRFp+GAAAAAXNSR0IArs4c6QAAASpJREFUOE9lyOlHGAAcxvHuY63Wta3WsdWqdaz7vtfduoyZSBLJmCSSSCaSSBJJJIkk0h+Z7/Pm59Hz4sP3SUh4tUSeIIkMkkmR4qSSIs1JJ4MMUmQ6b0iR5bwlg2xS5DjvSJHr5JFBPikKnEIyeE+KD85HUhQ5xWTwiRQlTikpypxyMvhMii9OBSkqna9kUEWKaqeGDL6RotapI0W900AG30nR6DSRotlpIYNWUrQ57aTocDrJoIsU3U4PKXqdPjLoJ8WAM0gGQ6QYdn6QYsQZJYMxUow7E6SYdKbIYJoUP50ZUsw6c2QwTy7AL/gNf2ARlmAZVmAV1mAd/sI/2IBN2IJt2IFd2IN9+A8HcAhHcAwncApncA4XcAlXcA03cAt3cA8P8AhP8PwCakcyvVVFagcAAAAASUVORK5CYII=");
				background-size: cover;
				background-repeat: repeat-x;
				background-position: bottom;
				background-size: contain;
				height: calc(var(--ytd-watch-flexy-max-player-height) / 2.5);
				pointer-events: none;
			}
			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control-bar::before {
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

			#goodTube_player_wrapper1:not(goodTube_mobile) .video-js .vjs-control-bar > .vjs-play-control {
				padding-left: 8px;
				box-sizing: content-box;
			}

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control:not(.vjs-progress-control) {
				min-width: 0 !important;
				flex-grow: 1 !important;
				max-width: 9999px !important;
				padding-left: 0 !important;
				padding-right: 0 !important;
			}

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control.vjs-volume-panel,
			#goodTube_player_wrapper1.goodTube_miniplayer #goodTube_player_wrapper3 .video-js .vjs-control.vjs-volume-panel {
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

			.video-js .vjs-menu-content {
				max-height: calc(var(--ytd-watch-flexy-panel-max-height) - 72px) !important;
			}

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-menu-content {
				max-height: 156px !important;
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

			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control-bar button.vjs-menu-button::before,
			#goodTube_player_wrapper1.goodTube_mobile .video-js .vjs-control-bar .vjs-button:not(.vjs-menu-button)::before {
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
