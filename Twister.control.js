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
    8,  // tracks
    0,  // sends
    8); // scenes
  setupSelectLaunchInGrid(midiIn, trackBank);
  setupPlaybackListeners(midiOut, trackBank);
}

function setupSelectLaunchInGrid(midiIn, trackBank) {
  midiIn.setMidiCallback(function(status, cc, note) {
    if (status === CHANNEL_2 && note === ON) {
      var index = ccTrackScene(cc);
      var track = trackBank.getItemAt(index.track)
      var channel = track.clipLauncherSlotBank();
      var slot = channel.getItemAt(index.scene);

      // Exclusive arm
      track.arm().set(true);
      unArmByColor(trackBank, index.track, track.color());

      // Launch/Stop
      (slot.isPlaybackQueued().get() || slot.isRecordingQueued().get())
        ? channel.stop() : slot.launch();
    }
  });
}

function unArmByColor(trackBank, trackIndex, trackColor) {
  for (var otherTrackIndex = 0; otherTrackIndex < 8; otherTrackIndex++) {
    var otherTrack = trackBank.getItemAt(otherTrackIndex);
    if (trackIndex !== otherTrackIndex
      && otherTrack.color().red() === trackColor.red()
      && otherTrack.color().green() === trackColor.green()
      && otherTrack.color().blue() === trackColor.blue()) { otherTrack.arm().set(false) }
  }
}

function setupPlaybackListeners(midiOut, trackBank) {
  for (var trackIndex = 0; trackIndex < 8; trackIndex++) {
    var track = trackBank.getItemAt(trackIndex);
    var channel = track.clipLauncherSlotBank();
    track.color().markInterested();
    clearColors(midiOut, trackIndex, channel);
    setupColorPlaybackOnTrack(midiOut, trackIndex, channel);
    for (var sceneIndex = 0; sceneIndex < 8; sceneIndex++) {
      var slot = channel.getItemAt(sceneIndex);
      slot.isPlaybackQueued().markInterested();
      slot.isRecordingQueued().markInterested();
    }
  }
}

function clearColors(midiOut, trackIndex, channel) {
  for (var sceneIndex = 0; sceneIndex < 8; sceneIndex++) {
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
  return trackIndex % 4 +             // x-axis
    4 * (sceneIndex % 4) +            // y-axis
    16 * Math.floor(trackIndex / 4) + // x-axis, bank 2|4
    32 * Math.floor(sceneIndex / 4);  // y-axis, bank 3|4
}

function ccTrackScene(cc) {
  var offset = ccBankOffset(cc);
  offset.track += Math.floor(cc % 4);
  offset.scene += Math.floor(cc / 4) % 4;
  return offset;
}

function ccBankOffset(cc) {
  switch (Math.floor(cc / 16)) {
    case 0: return { scene: 0, track: 0 };
    case 1: return { scene: 0, track: 4 };
    case 2: return { scene: 4, track: 0 };
    case 3: return { scene: 4, track: 4 };
  }
}
