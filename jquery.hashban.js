/*

hashban.js is a plugin to streamline the addition of ajax-style page transitions
to a website.

Example:

    $.hashban.setup({
        contentWrapSelector: '#mycontent'
    });
    $('#header nav a').hashban();

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
(function($) {
    
    // PRIVATE METHODS
    
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
    
    function stripslashes(str) {
        // Remove slashes from the start and end of a string
        
        return str.replace(/^\/|\/$/g, '');
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
    

    function get_direction(from, to) {
        // Returns 1 (forwards) or -1 (backwards) for a given transition.
        // 0 is returned when the direction cannot be inferred.
        // link_order should be a list of the site's top-level link urls, 
        // in order (see setup function).
        
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
            for (var i = 0; i < options.link_order.length; i++) {
                if (from_i === -1 && from === options.link_order[i]) {
                    from_i = i;
                }
                if (to_i === -1 && to === options.link_order[i]) {
                    to_i = i;
                }
            }
            if (from_i === -1 || to_i === -1) {
                // if no exact match, look for parent urls that match
                for (var i = 0; i < options.link_order.length; i++) {
                    if (from_i === -1 && is_sublink(options.link_order[i], from)) {
                        from_i = i;
                    }
                    if (to_i === -1 && is_sublink(options.link_order[i], to)) {
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

    function transition_out(endfade, old_content, direction, url) {
        // Default transition out: fade the old content out, and call
        // end_callback once the transition is done
        
        old_content.fadeOut(options.duration, endfade);
    };
    
    function transition_in(new_content, old_content, direction, contentBody) {
        // Default transition in: remove the old content (in case it's
        // still there) and fade the new content in.
        
        old_content.remove();
        new_content.fadeIn(options.duration);
    };
    
    
    // PUBLIC METHODS
    
    $.fn.hashban = function(){
        // hijack the given links to load via ajax
        
        this.each(function() {
            var me = $(this),
                url = me.attr('href');
            
            if (!me.data('ajaxified')) {
                me.click(function() {
                    $.hashban.loadPage(url, true);
                    return false;
                });
                me.data('ajaxified', true);
            }
        });
    };
    
    $.hashban = {};

    $.hashban.loader = function(visible) {
        // this function should always return the loader element,
        // creating it if necessary, and additionally should show
        // or hide the loader if the visible parameter is exactly
        // true or false
        
        var loading = $('.hashban-loader');
        if (!loading.length) {
            loading = $('<span>').addClass('hashban-loader').text('Loading').hide();
            $(options.contentWrapSelector).append(loading);
        }
        if (visible === true) {
            loading.show();
        }
        else if (visible === false) {
            loading.hide();
        }
        return loading;
    };
    
    $.hashban.hijack = function(el) {
        // find suitable links within the given element(s), and hijack them
        // to load via ajax
        
        var domain = getmatch(window.location.href, /[^\/]+\/\/[^\/]+/, 0),
            links = el.find('a:not([href^="http://"]), a[href^="' + domain + '"]')
                        .not('[href$=".xml"],[href$=".pdf"], [href$=".jpg"], [href^="#"]');
        
        if (options.link_filter) {
            links = links.filter(options.link_filter);
        }

        links.hashban();
        
        return el;
    };
    
    var options = {
            contentWrapSelector: '#content',
            duration: 500,
            transition_out: transition_out,
            transition_in: transition_in,
            content_init: null,
            loader: $.hashban.loader,
            link_order: [],
            link_filter: null,
            loaderTimeout: 300
        },
        CACHE = {},
        currentXHR,
        previous_url = window.location.pathname;
    
    $.hashban.setup = function (user_options) {
        // Set up plugin options - must be called before loadPage, 
        // hijack or hashban
        
        options = $.extend(options, user_options);

        $(window).load(function() {
            setTimeout(function() {
                $(window).bind('popstate', function(e) {
                    $.hashban.loadPage(window.location.pathname);
                });
            }, 1);
        });    	
    };
        
    $.hashban.loadPage = function (url, push_state) {
        // Load the specified url, optionally changing the page state
        
        var contentWrap = $(options.contentWrapSelector),
            html,
            error,
            loaderTimer,
            faded = false,
            completed = false,
            direction = get_direction(previous_url, url);

        if (previous_url !== url) {
            previous_url = url;
            
            // Order of events       
            // 1. start loading
            // 2. transition out old content
            // 3. show spinner
            // 4. once load and transition out are both done, transition in

            function fadein() {
                var contentBody = $.hashban.getBody(html),
                    bodyClass = contentBody.attr('class'),
                    contentEl = contentBody.find(options.contentWrapSelector),
                    title = getmatch(html, /<title>(.*?)<\/title>/, 1);

                if (contentEl.length) {
                    if (push_state) {
                        history.pushState(null, null, url);
                    }
                    document.title = $('<div>').html(title).text();
                                    
                    $('body').attr('class', bodyClass);
                    
                    clearTimeout(loaderTimer);
                    options.loader(false);
                    
                    var new_content = contentEl.children(),
                        old_content = contentWrap.children().not(options.loader());
                    
                    // trigger unload event here so that it won't effect any new content
                    $(window).trigger('hashban-unload');
                    
                    new_content.appendTo(contentWrap).hide();
                    
                    options.transition_in(new_content, old_content, direction, contentBody);
                    
                    if (typeof options.content_init === 'function') {
                        options.content_init(new_content);
                    }
                    
                    // trigger load event here - assume that new content has been added in transition_in
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
                            options.loader(true);
                        }, options.loaderTimeout);
                        faded = true;
                    }
                }
            };
            
            var old_content = $(options.contentWrapSelector).children().not(options.loader());

            if (CACHE[url]) {
                html = CACHE[url];
            }
            else {
                if (currentXHR) {
                    currentXHR.abort();
                }
                currentXHR = $.ajax(url, {
                    success: function(data) {
                        CACHE[url] = data;        
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
            
            if (old_content.length && typeof options.transition_out === 'function') {
                options.transition_out(endfade, old_content, direction, url);
            }
            else {
                endfade();
            }
            
        }
    };
    
    $.hashban.preload = function (url) {
        // preload a url to avoid transition delay
        
        if (!CACHE[url]) {
            currentXHR = $.ajax(url, {
                success: function(data) {
                    CACHE[url] = data;        
                }
            });
        }
    };
    
    $.hashban.bindUntilUnload = function (el, event, callback) {
    	// bind event to el, and unbind when navigating away from the page
    	
    	el.on(event, callback);
        $(window).one('hashban-unload', function() {
            el.off(event, callback);
        });
    };

    $.hashban.getBody = function (html) {
    	// get wrapped "body" element from an html document
    	// jquery doesn't seem to like creating a <body> so use a div instead
    	
    	return $('<div' + getmatch(html, /<body([^>]*>[\S\s]*)<\/body>/, 1) + '</div>');
    };
    

})(jQuery);
