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
var React = require('react');
var repeat = require('../core/repeat');

var DETECT_DELAY = 200;
var DETECT_TIMEOUT = 5000;

var Devices = React.createClass({
  propTypes: {
    devices: React.PropTypes.array.isRequired,
    onDetectDevices: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
      scanning: true,
      error: null
    };
  },

  stopScanning: _.noop,

  componentDidMount: function() {
    this.startScanning();
  },

  componentWillUnmount: function() {
    this.stopScanning();
  },

  render: function() {
    return (
      <div>
        {this.renderScan()}
        {this.renderDevices()}
      </div>
    );
  },

  renderScan: function() {
    if (this.state.scanning) {
      return <p>Scanning for devices...</p>;
    }

    return <p><button onClick={this.startScanning}>Scan for devices</button></p>;
  },

  renderDevices: function() {
    var devices = _.map(this.props.devices, function(device, index){
      return <li key={index}>{device.driverId}</li>;
    });
    return (
      <ul>
        {devices}
      </ul>
    );
  },

  startScanning: function() {
    this.setState({
      scanning: true,
      error: null
    });

    var stop;
    var self = this;
    this.stopScanning = function(err) {
      stop();
      self.setState({
        scanning: false,
        error: err
      });
    };

    stop = repeat(
      this.detectDevices, DETECT_DELAY, DETECT_TIMEOUT, this.stopScanning
    );
  },

  detectDevices: function() {
    var self = this;
    this.props.onDetectDevices(function(err) {
      if (err) {
        self.stopScanning(err);
      }
    });
  }
});

module.exports = Devices;