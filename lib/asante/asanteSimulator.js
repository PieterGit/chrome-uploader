/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 * 
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var _ = require('lodash');
var sundial = require('sundial');
var util = require('util');

var annotate = require('../eventAnnotations');

var twentyFourHours = 24 * 60 * 60 * 1000;

/**
 * Creates a new "simulator" for Asante SNAP data.  The simulator has methods for events like
 *
 * cbg(), smbg(), basal(), bolus(), settingsChange(), etc.
 *
 * This simulator exists as an abstraction over the Tidepool APIs.  It was written to simplify the conversion
 * of static, "retrospective" audit logs from devices into events understood by the Tidepool platform.
 *
 * On the input side, you have events extracted from an Insulet .ibf file.  They should be delivered to the simulator
 * in time order.
 *
 * Once all input activities are collected, the simulator will have accumulated events that the Tidepool Platform
 * will understand into a local "events" array.  You can retrieve the events by calling `getEvents()`
 *
 * @param config
 * @returns {*}
 */
exports.make = function(config){
  if (config == null) {
    config = {};
  }
  var settings = config.settings || null;
  var events = [];

  var currBasal = null;
  var currTimestamp = null;

  function setCurrBasal(basal) {
    currBasal = basal;
  }

  function ensureTimestamp(e){
    if (currTimestamp > e.time) {
      throw new Error(
        util.format('Timestamps must be in order.  Current timestamp was[%s], but got[%j]', currTimestamp, e)
      );
    }
    currTimestamp = e.time;
    return e;
  }

  function simpleSimulate(e) {
    ensureTimestamp(e);
    events.push(e);
  }

  return {
    alarm: function(event) {
      simpleSimulate(event);
    },
    basal: function(event) {
      ensureTimestamp(event);
      if (currBasal != null) {
        if (!currBasal.isAssigned('duration')) {
          currBasal.with_duration(Date.parse(event.time) - Date.parse(currBasal.time));
        }
        currBasal = currBasal.with_scheduleName('Unknown').done();
        event.previous = _.omit(currBasal, 'previous');
        events.push(currBasal);
      }
      setCurrBasal(event);
    },
    bolus: function(event) {
      simpleSimulate(event);
    },
    changeDeviceTime: function(event) {
      simpleSimulate(event);
    },
    changeReservoir: function(event) {
      simpleSimulate(event);
    },
    finalBasal: function() {
    },
    resume: function(event) {
      simpleSimulate(event);
    },
    settings: function(event) {
      simpleSimulate(event);
    },
    smbg: function(event) {
      simpleSimulate(event);
    },
    suspend: function(event) {
      simpleSimulate(event);
    },
    wizard: function(event) {
      simpleSimulate(event);
    },
    getEvents: function() {
      // because we have to wait for the *next* basal to determine the duration of a current
      // basal, basal events get added to `events` out of order wrt other events
      // (although within their own type all the basals are always in order)
      // end result: we have to sort events again before we try to upload them
      var orderedEvents = _.sortBy(_.filter(events, function(event) {
        if (event.type === 'bolus') {
          if (event.normal === 0 && !event.expectedNormal) {
            return false;
          }
          else {
            return true;
          }
        }
        else if (event.type === 'wizard') {
          var bolus = event.bolus || null;
          if (bolus != null) {
            if (bolus.normal === 0 && !bolus.expectedNormal) {
              return false;
            }
            else {
              return true;
            }
          }
        }
        return true;
      }), function(e) { return e.time; });
      
      return orderedEvents;
    }
  };
};