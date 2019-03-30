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
  var userControls = host.createUserControls(64);
  var trackBank = host.createMainTrackBank(
    8,  // tracks
    0,  // sends
    8); // scenes
  setupSelectLaunchInGrid(midiIn, trackBank, userControls);
  setupPlaybackListeners(midiOut, trackBank);
  setupEncoderControls(midiOut, userControls);
}

function setupSelectLaunchInGrid(midiIn, trackBank, userControls) {
  midiIn.setMidiCallback(function(status, cc, note) {
    if (status === CHANNEL_1) {
      userControls.getControl(cc).set(note, 128);

    } else if (status === CHANNEL_2 && note === ON) {
      var index = ccToTrackScene(cc);
      var track = trackBank.getItemAt(index.track)
      var channel = track.clipLauncherSlotBank();
      var slot = channel.getItemAt(index.scene);

      // Exclusive arm
      track.arm().set(true);
      unArmByColor(trackBank, index.track, track.color());

      // Launch || Stop
      checkStops(slot, function(x) { return x.get() }) ? channel.stop() : slot.launch();
    }
  });
}

function unArmByColor(trackBank, trackIndex, trackColor) {
  for (var otherTrackIndex = 0; otherTrackIndex < 8; otherTrackIndex++) {
    var otherTrack = trackBank.getItemAt(otherTrackIndex);
    if (trackIndex !== otherTrackIndex && colorEq(otherTrack.color(), trackColor)) {
      otherTrack.arm().set(false);
    }
  }
}

function setupPlaybackListeners(midiOut, trackBank) {
  for (var trackIndex = 0; trackIndex < 8; trackIndex++) {
    var track = trackBank.getItemAt(trackIndex);
    var channel = track.clipLauncherSlotBank();

    // colors
    clearColors(midiOut, trackIndex, channel);
    setupColorPlaybackOnTrack(midiOut, trackIndex, channel);

    // mark interested
    track.color().markInterested();
    for (var sceneIndex = 0; sceneIndex < 8; sceneIndex++) {
      checkStops(channel.getItemAt(sceneIndex), function(x) { x.markInterested() });
    }
  }
}

function clearColors(midiOut, trackIndex, channel) {
  for (var sceneIndex = 0; sceneIndex < 8; sceneIndex++) {
    var cc = trackSceneToCc(trackIndex, sceneIndex);
    sendColor(midiOut, false, cc, OFF, OFF);
  }
}

function setupColorPlaybackOnTrack(midiOut, trackIndex, channel) {
  channel.addPlaybackStateObserver(function(sceneIndex, state, queued) {
    var cc = trackSceneToCc(trackIndex, sceneIndex);
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

function setupEncoderControls(midiOut, userControls) {
  for (var controlIndex = 0; controlIndex < 64; controlIndex++) {
    userControls
      .getControl(controlIndex)
      .value()
      .addValueObserver(128, setEncoder(midiOut, controlIndex));
  }
}

function setEncoder(midiOut, cc) {
  return function(value) { midiOut.sendMidi(CHANNEL_1, cc, value) };
}

function trackSceneToCc(trackIndex, sceneIndex) {
  return trackIndex % 4 +             // x-axis
    4 * (sceneIndex % 4) +            // y-axis
    16 * Math.floor(trackIndex / 4) + // x-axis, bank 2|4
    32 * Math.floor(sceneIndex / 4);  // y-axis, bank 3|4
}

function ccToTrackScene(cc) {
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

function colorEq(a, b) {
  return a.red() === b.red()
    && a.green() === b.green()
    && a.blue() === b.blue();
}


function checkStops(slot, check) {
  if (check(slot.isPlaying()))         return true;
  if (check(slot.isPlaybackQueued()))  return true;
  if (check(slot.isRecordingQueued())) return true;
  return false;
}

