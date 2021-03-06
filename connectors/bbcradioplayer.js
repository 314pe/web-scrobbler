/**
 * Connector for BBC RadioPlayer
 * Adapted from the RadioPlayer script by Jiminald
 * By gerjomarty
 */

// Used to remember last song title and not scrobble if it is the same
var lastArtist = '';
var lastTrack = '';

// As there is no time, we default to 90 seconds (Saves 2 alerts popping up on track change)
var DEFAULT_TIMEOUT = 90;

// Config for mutation observers
var config = {childList: true, subtree: true, attributes: true};

// BBC RadioPlayer stations show a Now Playing box inside the container
// The box becomes invisible when the track stops, so we need to check for visibility

var CONTAINER = '#programme-info';
var NP_ELEMENT = '#realtime:visible';
var ARTIST_ELEMENT = '#artists';

// Track names are usually just text, but if they are too long, the div contains child
// elements that include an ellipsis, which we want to remove.
var TRACK_ELEMENT = '#track';
var TRACK_CHILD_ELEMENT = ':not(.more-indicator)';

/**
 * Call the specified function when the container contents change.
 */
if ($(CONTAINER).length > 0) {
    var target = document.querySelector(CONTAINER);
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(updateTrack);
    });

    observer.observe(target, config);
}

/**
 * Reset the currently playing song if the window is unloaded.
 */
$(window).unload(function() {
    chrome.runtime.sendMessage({type: 'reset'});
    return true;
});

/**
 * Listen for requests from scrobbler.js
 */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.type) {
            // background calls this to see if the script is already injected
            case 'ping':
                sendResponse(true);
                break;
        }
    }
);

function updateTrack() {
    if ($(NP_ELEMENT).length > 0) {
        artist = $(ARTIST_ELEMENT).text();
        track = '';

        if ($(TRACK_ELEMENT).children().length > 0) {
            $(TRACK_ELEMENT).children().each(function() {
                if ($(this).is(TRACK_CHILD_ELEMENT)) {
                    track += $(this).text();
                }
            });
        } else {
            track = $(TRACK_ELEMENT).text();
        }

        scrobbleTrack($.trim(artist), $.trim(track), DEFAULT_TIMEOUT);
    } else {
        // Reset currently listening when the Now Playing box becomes invisible.
        chrome.runtime.sendMessage({type: 'reset'});
    }
}

function scrobbleTrack(artist, track, duration) {
    if (artist === '' || track === '' || (lastArtist === artist && lastTrack === track)) {
        // Don't scrobble if we have missing data, or if we've already scrobbled the track.
        return;
    }

    lastArtist = artist;
    lastTrack = track;

    chrome.runtime.sendMessage({type: 'validate', artist: artist, track: track}, function(response) {
        if (response !== false) {
            chrome.runtime.sendMessage({type: 'nowPlaying', artist: artist, track: track, duration: duration});
        }
    });
}
