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
        commandControl: {
          type: 'object',
          title: 'PGN 126208 - Command Group Function with PGN 127500 or 127501',
          properties: {
            enable: {
              type: 'boolean',
              title: 'Enable Command Group Logs'
            }
          }
        },
        switchControl: {
          type: 'object',
          title: 'PGN 127502 - Switch Bank Control',
          properties: {
            enable: {
              type: 'boolean',
              title: 'Enable Switch Bank Control Logs'
            }
          }
        },
        binaryStatus: {
          type: 'object',
          title: 'PGN 127501 - Binary Status Report',
          properties: {
            enable: {
              type: 'boolean',
              title: 'Enable Binary Status Report Logs'
            },
            instances: {
              type: 'array',
              title: 'Instances to Log',
              items: {
                type: 'object',
                properties: {
                  instance: {
                    type: "number",
                    title: "Instance",
                    description: "0-255 are allowed",
                    pattern: "^([0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])$"
                  }
                }
              }
            }
          }
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

        if ((loggerOptions.switchControl.enable && msg.pgn == 127502) ||
          (loggerOptions.commandControl.enable && msg.pgn == 126208 && fields['Function Code'] == 'Command' && (fields['PGN'] == 127500 || fields['PGN'] == 127501)) ||
          (loggerOptions.binaryStatus.enable && loggerOptions.binaryStatus.instances.find(instance => instance.instance === msg.fields.Instance))) {

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
      case 127501:
        action = getBinaryStatusAction(msg)
        break
      case 127502:
        action = getSwitchControlAction(msg)
        break
      case 126208:
        action = getCommandAction(msg)
        break
    }

    if (action) {
      let device = findDeviceInfo(msg.src)
      let productName = device ? device.productName : 'Unknown'
      let logmsg = `NMEA Action Log: Source: ${msg.src}, Product Name: ${productName}, Destination: ${msg.dst}, PGN: ${msg.pgn}, Instance: ${action.instance}, Switch: ${action.switchNum}, State: ${action.value}`
      console.log(logmsg)
    }
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
        action.value = msg.fields['list'][1].Value === 0 ? 'Off' : 'On'
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

  function getBinaryStatusAction(msg) {
    let action = {}

    action.instance = msg.fields['Instance']
    action.switchNum = Object.keys(msg.fields).find(key => msg.fields[key] === 'On')
    action.value = msg.fields[action.switchNum]

    //if no switch is On, then return null
    return action.switchNum ? action : null
  }

  function getSwitchControlAction(msg) {
    let action = {}

    action.instance = msg.fields['Switch Bank Instance']
    let key = Object.keys(msg.fields).filter((key) => /Switch\d+/.test(key)).toString()
    action.switchNum = key.match(/\d+/g).map(Number)
    action.value = msg.fields[key]

    return action
  }

  return plugin;
};
