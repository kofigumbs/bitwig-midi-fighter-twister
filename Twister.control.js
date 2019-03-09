var OFF = 0;
var ON = 127;
var KNOB_CHANNEL = 176;
var BUTTON_CHANNEL = 177;

loadAPI(8);
host.setShouldFailOnDeprecatedUse(true);
host.defineController("MidiFighter", "Twister", "0.1", "c19c8346-449e-4449-abaf-1a1eed8f8c29", "Kofi Gumbs");
host.defineMidiPorts(1, 1);

function exit() {}
function flush() {}
function onSysex0(data) {}

function init() {
  trackBank = host.createMainTrackBank(/* tracks */ 4, /* sends */ 0, /* scenes */ 4);
  host.getMidiInPort(0).setMidiCallback(onMidi0(trackBank));
  host.getMidiInPort(0).setSysexCallback(onSysex0);
}

function onMidi0(trackBank) {
  return function(status, data1, data2) {
    if (status === BUTTON_CHANNEL && data2 === ON) {
      var sceneIndex = Math.floor(data1 / 4);
      var trackIndex = Math.floor(data1 % 4);
      var launcher = trackBank.getChannel(trackIndex).clipLauncherSlotBank();
      launcher.select(sceneIndex);
      launcher.launch(sceneIndex);
    }
  }
}
