/*! For license information please see goodtube.min.user.js.LICENSE.txt */
// ==UserScript==
// @name         Goodtube
// @namespace    https://github.com/goodtube4u/goodtube
// @description  Loads Youtube videos from different sources. Also removes ads, shorts, etc
// @match        https://gitlab.com/*/pipeline_schedules*
// @match        https://*.gitlab.com/*/pipeline_schedules*
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://github.com/goodtube4u/goodtube/-/raw/main/dist/goodtube.min.user.js
// @downloadURL  https://github.com/goodtube4u/goodtube/-/raw/main/dist/goodtube.min.user.js
// @supportURL   https://github.com/goodtube4u/goodtube/issues
// @license      ISC
// @author       goodtube4u
// @version      1721141568018
// ==/UserScript==
(()=>{"use strict";var n=[function(n,o,e){var t=this&&this.__awaiter||function(n,o,e,t){return new(e||(e=Promise))((function(r,i){function c(n){try{u(t.next(n))}catch(n){i(n)}}function s(n){try{u(t.throw(n))}catch(n){i(n)}}function u(n){var o;n.done?r(n.value):(o=n.value,o instanceof e?o:new e((function(n){n(o)}))).then(c,s)}u((t=t.apply(n,o||[])).next())}))};Object.defineProperty(o,"__esModule",{value:!0});const r=e(1);t(void 0,void 0,void 0,(function*(){try{t(void 0,void 0,void 0,(function*(){const n=window.location.href;GM_addStyle(r.css),console.log("GoodTube: Running script on",n)}))}catch(n){console.error(n)}}))},(n,o)=>{Object.defineProperty(o,"__esModule",{value:!0}),o.css=void 0,o.css="\n# Implement your styles here !\n"}],o={};(function e(t){var r=o[t];if(void 0!==r)return r.exports;var i=o[t]={exports:{}};return n[t].call(i.exports,i,i.exports,e),i.exports})(0)})();