/*

hashban.js is a plugin to streamline the addition of ajax-style page transitions
to a website.

Example:

    var hashban = Hashban({
        contentWrapSelector: '#mycontent'
    });
    hashban.hijack($('#header nav'));
    hashban.bind();


Options/defaults:
    
    contentWrapSelector: '#content',
    duration: 500,
    transition_out: transition_out,
    transition_in: transition_in,
    loader: $.hashban.loader,
    link_order: [],
    link_filter: null,
    loaderTimeout: 300

*/


var Hashban = (function($) {
    
    function Hashban(user_options) {
        if (!(this instanceof Hashban)) return new Hashban(user_options);
        var that = this;
        
        function transition_out(endfade, old_content, direction, url) {
            // Default transition out: fade the old content out, and call
            // end_callback once the transition is done
            
            old_content.fadeOut(that.options.duration, endfade);
        };
        
        function transition_in(new_content, old_content, direction, contentBody) {
            // Default transition in: remove the old content (in case it's
            // still there) and fade the new content in.
            
            old_content.remove();
            new_content.fadeIn(that.options.duration);
        };
        
        function loader(visible) {
            // this function always returns the loader element,
            // creating it if necessary, and additionally shows
            // or hides the loader if the visible parameter is 
            // exactly true or false
            
            // TODO uid for loader class?
            
            var loading = $('.hashban-loader');
            if (!loading.length) {
                loading = $('<span>').addClass('hashban-loader').text('Loading').hide();
                $(that.options.contentWrapSelector).append(loading);
            }
            if (visible === true) {
                loading.show();
            }
            else if (visible === false) {
                loading.hide();
            }
            return loading;
        };
                
        this.CACHE = {};
        this.currentXHR = null;
        this.previous_url = window.location.pathname; 
        this.options = $.extend({
            contentWrapSelector: '#content',
            duration: 500,
            transition_out: transition_out,
            transition_in: transition_in,
            content_init: null,
            loader: loader,
            link_order: [],
            loaderTimeout: 300,
            uid: 'Hashban.js'
        }, user_options);
        
    };

    Hashban.prototype.bind = function(){
        var that = this;

        $(window).bind('popstate', function(e) {
            if (e.originalEvent.state && 
                e.originalEvent.state['handler'] === that.options['uid']) {
                that.loadPage(window.location.pathname);
            }
        });
        
        // EXPERIMENTAL - needed for transition back to the initially-loaded page
        history.replaceState({
            handler: that.options['uid']
        }, null, window.location.pathname);
    };
    
    Hashban.prototype.hashban = function(links){
        // bind the given links (a jquery collection) to load via ajax
        
        var that = this;
        links.each(function() {
            var me = $(this),
                url = me.attr('href');
                
            // TODO uid here? can you bind two Hashbans to one link?
            
            if (!me.data('hashbanned')) {
                me.click(function() {
                    that.loadPage(url, true);
                    return false;
                });
                me.data('hashbanned', true);
            }
        });
        
    };
    
    Hashban.prototype.hijack = function(el, link_filter) {
        // find suitable links within the given element(s), and hijack them
        // to load via ajax
        
        var domain = getmatch(window.location.href, /[^\/]+\/\/[^\/]+/, 0),
            links = el.find('a:not([href^="http://"]), a[href^="' + domain + '"]')
                        .not('[href$=".xml"],[href$=".pdf"], [href$=".jpg"], [href$=".gif"], [href$=".png"], [href^="#"]');
        
        if (link_filter) {
            links = links.filter(link_filter);
        }
    
        this.hashban(links);
        
        return el;
    };
    
    Hashban.prototype.loadPage = function (url, push_state) {
        // Load the specified url, optionally changing the page state
        
        var that = this,
            contentWrap = $(this.options.contentWrapSelector),
            html,
            error,
            loaderTimer,
            faded = false,
            completed = false,
            direction = get_direction(this.previous_url, url, this.options.link_order);
    
        if (this.previous_url !== url) {
            this.previous_url = url;
            
            // Order of events       
            // 1. start loading
            // 2. transition out old content
            // 3. show spinner
            // 4. once load and transition out are both done, transition in
    
            function fadein() {
                var contentBody = Hashban.getBody(html),
                    bodyClass = contentBody.attr('class'),
                    contentEl = contentBody.find(that.options.contentWrapSelector),
                    title = getmatch(html, /<title>(.*?)<\/title>/, 1);
    
                if (contentEl.length) {
                    if (push_state) {
                        history.pushState({
                            handler: that.options['uid']
                        }, null, url);
                    }
                    document.title = $('<div>').html(title).text();
                                    
                    $('body').attr('class', bodyClass);
                    
                    clearTimeout(loaderTimer);
                    that.options.loader(false);
                    
                    var new_content = contentEl.children(),
                        old_content = contentWrap.children().not(that.options.loader());
                    
                    // trigger unload event here so that it won't effect any new content
                    // TODO uid here?
                    $(window).trigger('hashban-unload');
                    
                    new_content.appendTo(contentWrap).hide();
                    
                    that.options.transition_in(new_content, old_content, direction, contentBody);
                    
                    if (typeof that.options.content_init === 'function') {
                        that.options.content_init(new_content);
                    }
                    
                    // trigger load event here - assume that new content has been added in transition_in
                    // TODO uid here?
                    $(window).trigger('hashban-load');
    
                    // work around jquery's auto overflow switch - see http://goo.gl/V9UUw
                    contentWrap.css({
                        overflow: 'visible'
                    });
                    
                }
                else {
                    // reload the page to show the error
                    window.location.href = url;
                }
            
            };
                        
            function endfade() {
                if (!completed) {
                    completed = true;
                    if (html) {
                        fadein();
                    }
                    else {
                        loaderTimer = setTimeout(function() {
                            that.options.loader(true);
                        }, that.options.loaderTimeout);
                        faded = true;
                    }
                }
            };
            
            var old_content = $(this.options.contentWrapSelector).children().not(this.options.loader());
    
            if (this.CACHE[url]) {
                html = this.CACHE[url];
            }
            else {
                if (this.currentXHR) {
                    this.currentXHR.abort();
                }
                this.currentXHR = $.ajax(url, {
                    success: function(data) {
                        that.CACHE[url] = data;        
                        html = data;
                        if (faded) {
                            fadein();
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        html = jqXHR.responseText;
                        error = errorThrown;
                        if (faded) {
                            fadein();
                        }
                    }
                });
            }
            
            if (old_content.length && typeof this.options.transition_out === 'function') {
                this.options.transition_out(endfade, old_content, direction, url);
            }
            else {
                endfade();
            }
            
        }
    };
    
    // PUBLIC INSTANCE METHODS
    
    Hashban.prototype.bindUntilUnload = function (el, event, callback) {
        // bind event to el, and unbind when navigating away from the page
        
        // TODO - account for uid here
        
        el.on(event, callback);
        $(window).one('hashban-unload', function() {
            el.off(event, callback);
        });
    };
    
    Hashban.prototype.preload = function (url) {
        // preload a url to avoid transition delay
        var that = this;
        
        if (!this.CACHE[url]) {
            $.ajax(url, {
                success: function(data) {
                    that.CACHE[url] = data;        
                }
            });
        }
    };
    
    
    // PUBLIC UTILITIES
    
    Hashban.getBody = function (html) {
        // get wrapped body element from an html document
        
        return $('<div' + getmatch(html, /<body([^>]*>[\S\s]*)<\/body>/, 1) + '</div>');
    };


    
    // INTERNAL UTILITIES

    function getmatch(str, re, i) {
        // find and return the ith matched pattern in a regex, or 
        // return a blank string if not found
        
        var match = str.match(re);
        if (match) {
            return match[i];
        }
        else {
            return '';
        }
    };
    

    function get_direction(from, to, link_order) {
        // Returns 1 (forwards) or -1 (backwards) for a given transition.
        // 0 is returned when the direction cannot be inferred.
        // link_order should be a list of the site's top-level link urls, 
        // in order (see setup function).
        
        if (!link_order) {
            link_order = [];
        }
        
        if (to === from) {
            // this shouldn't really happen
            return 0;
        }
        else if (is_sublink(from, to)) {
            // if to is a child of from, go forward
            return 1;
        }
        else if (is_sublink(to, from)) {
            // if from is a child of to, go backwards
            return -1;
        }
        else {
            // otherwise, investigate the link_order setting to see
            // which way to go:
            var from_i = -1,
                to_i = -1;
            
            // first look for exact matches
            for (var i = 0; i < link_order.length; i++) {
                if (from_i === -1 && from === link_order[i]) {
                    from_i = i;
                }
                if (to_i === -1 && to === link_order[i]) {
                    to_i = i;
                }
            }
            if (from_i === -1 || to_i === -1) {
                // if no exact match, look for parent urls that match
                for (var i = 0; i < link_order.length; i++) {
                    if (from_i === -1 && is_sublink(link_order[i], from)) {
                        from_i = i;
                    }
                    if (to_i === -1 && is_sublink(link_order[i], to)) {
                        to_i = i;
                    }
                }
            }
            
            if (from_i === to_i || from_i === -1 || to_i === -1) {
                // can't determine a direction
                return 0;
            }
            else if (to_i < from_i) {
                // return backwards
                return -1;
            }
            else {
                // return forwards
                return 1;
            }
            
        }          
    }; 
        
    function is_sublink(link, possible_sublink) {
        // Determine whether possible_sublink is a child of 
        // link in the url tree. Returns false if the links
        // are the same.
        
        // add trailing slashes if they're missing, to ensure 
        // that is_sublink(/test', '/test-2') returns false,
        // but is_sublink(/test', '/test/2') returns true. 
        if (possible_sublink.slice(-1) !== '/') {
            possible_sublink += '/';
        }
        if (link.slice(-1) !== '/') {
            link += '/';
        }
        
        if (link !== possible_sublink && possible_sublink.indexOf(link) === 0) {
            return true;
        }
        else {
            return false;
        }
    };
    
    
    


    return Hashban;
    
})(jQuery);
