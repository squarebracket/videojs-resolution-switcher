/*! videojs-resolution-switcher - v0.0.0 - 2015-7-26
 * Copyright (c) 2015 Kasper Moskwiak
 * Modified by Pierre Kraft
 * Licensed under the Apache-2.0 license. */
(function(window, videojs) {
  'use strict';

  var defaults = {},
      videoJsResolutionSwitcher;

  /**
   * Initialize the plugin.
   * @param options (optional) {object} configuration for the plugin
   */
  videoJsResolutionSwitcher = function(options) {
    var settings = videojs.mergeOptions(defaults, options),
        player = this,
        label = document.createElement('span');

    label.classList.add('vjs-resolution-button-label');

    /*
     * Resolution menu item
     */
    var MenuItem = videojs.getComponent('MenuItem');
    var ResolutionMenuItem = videojs.extend(MenuItem, {
      constructor: function(player, options){

        MenuItem.call(this, player, options);
        this.src = options.src;

        this.on('click', this.onClick);
        this.on('touchstart', this.onClick);
      },
      onClick: function(){
        // Hide bigPlayButton
        player.bigPlayButton.hide();
        // Remember player state
        var currentTime = player.currentTime();
        var isPaused = player.paused();
        // Change menu button label
        label.innerHTML = this.options_.label;
        // Change player source and wait for loadeddata event, then play video
        // loadedmetadata doesn't work right now for flash.
        // Probably because of https://github.com/videojs/video-js-swf/issues/124
        setSourceSanitized(this.src).one( 'loadeddata', function() {
          player.currentTime(currentTime);
          if(!isPaused){ player.play(); }
          player.trigger('resolutionchange');
        });
      }
    });

    function setSourceSanitized(sources) {
      return player.src(sources.map(function(src) {
        return {src: src.src, type: src.type, res: src.res};
      }));
    }

   /*
    * Resolution menu button
    */
    var MenuButton = videojs.getComponent('MenuButton');
    var ResolutionMenuButton = videojs.extend(MenuButton, {
      constructor: function(player, options){
        this.sources = options.sources;
        MenuButton.call(this, player, options);
        this.controlText('Quality');

        if(settings.dynamicLabel){
          this.el().appendChild(label);
        }else{
          var staticLabel = document.createElement('span');
          staticLabel.classList.add('vjs-resolution-button-staticlabel');
          this.el().appendChild(staticLabel);
        }
      },
      createItems: function(){
        var menuItems = [];
        var labels = (this.sources && this.sources.label) || {};
        for (var key in labels) {
          if (labels.hasOwnProperty(key)) {
            menuItems.push(new ResolutionMenuItem(player, {
              label: key,
              src: labels[key]
            }));
          }
        }
        return menuItems;
      }
    });


    player.updateSrc = function(src){
      //Return current src if src is not given
      if(!src){ return player.src(); }
      // Dispose old resolution menu button before adding new sources
      if(player.controlBar.resolutionSwitcher){
        player.controlBar.resolutionSwitcher.dispose();
        delete player.controlBar.resolutionSwitcher;
      }
      //Sort sources
      src = src.sort(compareResolutions);
      var groupedSrc = bucketSources(src);
      var menuButton = new ResolutionMenuButton(player, { sources: groupedSrc });
      menuButton.el().classList.add('vjs-resolution-button');
      player.controlBar.resolutionSwitcher = player.controlBar.addChild(menuButton);
      var newSource = chooseSrc(src, groupedSrc);
      label.innerHTML = newSource.label;
      return setSourceSanitized(newSource);
    };

    /**
     * Method used for sorting list of sources
     * @param   {Object} a source object with res property
     * @param   {Object} b source object with res property
     * @returns {Number} result of comparation
     */
    function compareResolutions(a, b){
      if(!a.res || !b.res){ return 0; }
      return (+b.res)-(+a.res);
    }

    /**
     * Group sources by label, resolution and type
     * @param   {Array}  src Array of sources
     * @returns {Object} grouped sources: { label: { key: [] }, res: { key: [] }, type: { key: [] } }
     */
    function bucketSources(src){
      var resolutions = {
        label: {},
        res: {},
        type: {}
      };
      src.map(function(source) {
        initResolutionKey(resolutions, 'label', source);
        initResolutionKey(resolutions, 'res', source);
        initResolutionKey(resolutions, 'type', source);

        appendSourceToKey(resolutions, 'label', source);
        appendSourceToKey(resolutions, 'res', source);
        appendSourceToKey(resolutions, 'type', source);
      });
      return resolutions;
    }

    function initResolutionKey(resolutions, key, source) {
      if(resolutions[key][source[key]] == null) {
        resolutions[key][source[key]] = [];
      }
    }

    function appendSourceToKey(resolutions, key, source) {
      resolutions[key][source[key]].push(source);
    }

    /**
     * Choose src if option.default is specified
     * @param   {Array}  src Array of sources
     * @param   {Object} groupedSrc {res: { key: [] }}
     * @returns {Array} one or many source objects. As array for convenience
     */
    function chooseSrc(src, groupedSrc){
      if(settings.default === 'low'){ return [src[src.length - 1]]; }
      if(settings.default === 'high'){ return [src[0]]; }
      if(groupedSrc.res[settings.default]){ return groupedSrc.res[settings.default]; }
      return [src[src.length - 1]];
    }

    // Create resolution switcher for videos form <source> tag inside <video>
    if(player.options_.sources.length > 1){
      player.updateSrc(player.options_.sources);
    }

  };

  // register the plugin
  videojs.plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
})(window, window.videojs);
