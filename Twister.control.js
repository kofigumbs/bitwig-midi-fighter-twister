// Midi Booleans
var OFF = 0;
var ON = 127;

// Midi Channels
var CHANNEL_1 = 176;
var CHANNEL_2 = 177;
var CHANNEL_3 = 178;

// Playback States
var STOPPED = 0;
var PLAYING = 1;
var RECORDING = 2;

// Color Animations
var FLASH = 6;  // 1/8
var PULSE = 16; // 1/8


/* SCRIPT BOILERPLATE */

loadAPI(8);
host.setShouldFailOnDeprecatedUse(true);
host.defineController("MidiFighter", "Twister", "0.1", "c19c8346-449e-4449-abaf-1a1eed8f8c29", "Kofi Gumbs");
host.defineMidiPorts(1, 1);

function exit() {}
function flush() {}


/* CONTROLLER STUFF */

function init() {
  var midiIn = host.getMidiInPort(0);
  var midiOut = host.getMidiOutPort(0);
  var trackBank = host.createMainTrackBank(
    4,  // tracks
    0,  // sends
    4); // scenes
  setupSelectLaunchInGrid(midiIn, trackBank);
  setupColorPlayback(midiOut, trackBank);
}

function setupSelectLaunchInGrid(midiIn, trackBank) {
  midiIn.setMidiCallback(function(status, data1, data2) {
    if (status === CHANNEL_2 && data2 === ON) {
      var sceneIndex = Math.floor(data1 / 4);
      var trackIndex = Math.floor(data1 % 4);
      var launcher = trackBank.getItemAt(trackIndex).clipLauncherSlotBank();
      launcher.select(sceneIndex);
      launcher.launch(sceneIndex);
    }
  });
}

function setupColorPlayback(midiOut, trackBank) {
  for (var trackIndex = 0; trackIndex < 4; trackIndex++) {
    var channel = trackBank.getItemAt(trackIndex).clipLauncherSlotBank();
    clearColors(midiOut, trackIndex, channel);
    setupColorPlaybackOnTrack(midiOut, trackIndex, channel);
  }
}

function clearColors(midiOut, trackIndex, channel) {
  for (var sceneIndex = 0; sceneIndex < 4; sceneIndex++) {
    var cc = trackSceneCc(trackIndex, sceneIndex);
    sendColor(midiOut, false, cc, OFF, OFF);
  }
}

function setupColorPlaybackOnTrack(midiOut, trackIndex, channel) {
  channel.addPlaybackStateObserver(function(sceneIndex, state, queued) {
    var cc = trackSceneCc(trackIndex, sceneIndex);
    switch(state) {
      case STOPPED:   return sendColor(midiOut, queued, cc, OFF, OFF);
      case PLAYING:   return sendColor(midiOut, queued, cc, ON,  OFF);
      case RECORDING: return sendColor(midiOut, queued, cc, ON,  FLASH);
    }
  });
}

function sendColor(midiOut, queued, cc, color, animation) {
  midiOut.sendMidi(CHANNEL_2, cc, color);
  midiOut.sendMidi(CHANNEL_3, cc, queued ? PULSE : animation);
}

function trackSceneCc(trackIndex, sceneIndex) {
    return trackIndex + 4 * sceneIndex;
}
