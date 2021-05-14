const _ = require('lodash')

const PLUGIN_ID = 'signalk-nmea-action-log'
const PLUGIN_NAME = 'NMEA 2000 Action Log'

module.exports = function(app) {
  var plugin = {};
  var n2kCallback
  var loggerOptions

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'Log actions taken by devices on the NMEA network.';

  plugin.schema = function() {
    var schema = {
      type: "object",
      properties: {
        commandPGN: {
          type: 'boolean',
          title: 'PGN 126208 - Command Group Function with PGN 127500 or 127501'
        },
        switchControlPGN: {
          type: 'boolean',
          title: 'PGN 127502 - Switch Bank Control'
        },
        binaryStatusPGN: {
          type: 'boolean',
          title: 'PGN 127501 - Binary Status Report'
        }
      }
    }

    return schema
  }

  plugin.start = function(options, restartPlugin) {
    loggerOptions = options

    n2kCallback = (msg) => {
      try {
        var fields = msg['fields']

        if (loggerOptions.switchControlPGN && msg.pgn == 127502 ||
          (loggerOptions.commandPGN && msg.pgn == 126208 && fields['Function Code'] == 'Command' &&
            (fields['PGN'] == 127500 || fields['PGN'] == 127501))) {

          app.debug('Received a NMEA update to log.')
          app.debug('msg: ' + JSON.stringify(msg))

          logAction(msg)
        }
      } catch (e) {
        console.error(e)
      }
    }
    app.on("N2KAnalyzerOut", n2kCallback)
  }

  plugin.stop = function() {
    if (n2kCallback) {
      app.removeListener("N2KAnalyzerOut", n2kCallback)
      n2kCallback = undefined
    }

    app.debug('Plugin stopped.')
  }

  function logAction(msg) {

    let action = {}
    switch (msg.pgn) {
      case 127502:
        action.instance = msg.fields['Switch Bank Instance']
        let key = Object.keys(msg.fields).filter((key) => /Switch\d+/.test(key)).toString()
        action.switchNum = key.match(/\d+/g).map(Number)
        action.value = msg.fields[key]
        break
      case 126208:
        action = getCommandAction(msg)
        break
    }

    let device = findDeviceInfo(msg.src)
    let productName = device ? device.productName : 'Unknown'
    let logmsg = `NMEA Action Log: Source: ${msg.src}, Product Name: ${productName}, Destination: ${msg.dst}, PGN: ${msg.pgn}, Instance: ${action.instance}, Switch: ${action.switchNum}, State: ${action.value}`
    console.log(logmsg)
  }

  function findDeviceInfo(source) {
    const sources = app.getPath('/sources')

    let device = null
    if (sources) {
      _.values(sources).forEach(v => {
        if (typeof v === 'object') {
          _.keys(v).forEach(id => {
            if (v[id] && v[id].n2k && v[id].n2k.src === source.toString()) {
              device = v[id].n2k
            }
          })
        }
      })
    }
    return device
  }

  function getCommandAction(msg) {
    let pgn = msg.fields['PGN']
    let action = {}

    switch (pgn) {
      case 127500:
        let device = findDeviceInfo(msg.dst)
        action.instance = device ? device.deviceInstance : 'Unknown'
        action.switchNum = msg.fields['list'][0].Value
        action.switchNum++
        action.value = msg.fields['list'][1].Value
        break
      case 127501:
        action.instance = msg.fields['list'][0].Value
        action.switchNum = msg.fields['list'][1].Parameter
        action.switchNum--
        action.value = msg.fields['list'][1].Value
        break
      default:
        action = null
    }
    return action
  }

  return plugin;
};
