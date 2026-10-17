// Block AV1 — hides the AV1 codec so sites fall back to VP9/H.264.
//
// Derived from "Not yet, AV1" (https://github.com/Shimmermare/NotYetAV1),
// MIT, Copyright (c) 2015 erkserkserks. Ported to Manifest V3.
//
// Loaded via manifest "world": "MAIN" so the patch is visible to page code.
// An isolated-world content script cannot modify the page's own objects.

(function () {
    'use strict';

    // Any MIME type containing 'av01' is reported as unsupported.
    function isBlocked(type) {
        if (type === undefined || type === null) return true;
        return String(type).indexOf('av01') !== -1;
    }

    // 1) HTMLMediaElement.prototype.canPlayType()
    try {
        var origCanPlayType = HTMLMediaElement.prototype.canPlayType;
        HTMLMediaElement.prototype.canPlayType = function (type) {
            if (isBlocked(type)) return '';
            return origCanPlayType.call(this, type);
        };
    } catch (e) { /* keep going; the other patches still apply */ }

    // 2) HTMLVideoElement.prototype.canPlayType() — some callers check here
    try {
        var origVideoCanPlayType = HTMLVideoElement.prototype.canPlayType;
        HTMLVideoElement.prototype.canPlayType = function (type) {
            if (isBlocked(type)) return '';
            return origVideoCanPlayType.call(this, type);
        };
    } catch (e) { }

    // 3) MediaSource.isTypeSupported()
    try {
        if (window.MediaSource && MediaSource.isTypeSupported) {
            var origIsTypeSupported = MediaSource.isTypeSupported;
            MediaSource.isTypeSupported = function (type) {
                if (isBlocked(type)) return false;
                return origIsTypeSupported.call(this, type);
            };
        }
    } catch (e) { }

    // Diagnostic marker: proves this script ran in the page's main world.
    try { window.__blockAV1Active = '1.0.0'; } catch (e) { }

    // 4) navigator.mediaCapabilities.decodingInfo() — used by modern players
    try {
        if (navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
            var origDecodingInfo = navigator.mediaCapabilities.decodingInfo.bind(navigator.mediaCapabilities);
            navigator.mediaCapabilities.decodingInfo = function (config) {
                var codec = '';
                try {
                    codec = (config && config.video && config.video.contentType) || '';
                } catch (e) { }
                if (codec.indexOf('av01') !== -1) {
                    return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
                }
                return origDecodingInfo(config);
            };
        }
    } catch (e) { }
})();
