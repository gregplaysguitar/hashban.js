# hashban.js - ajax page transitions, simplified

hashban.js is a plugin to streamline the addition of ajax-style page transitions
to a website. You specify which links to "hijack" and how to find your site's 
content (e.g. the part that changes on page load) and hashban.js does the rest.

Browsers which don't support the history api continue to work as usual, without
transitions but with the *exact same urls* as the history-enabled ones.

### Example usage:

    $(function() {
        if (Modernizr.history) {
            var hashban = Hashban({
                contentWrapSelector: '#mycontent'
            });
            hashban.hijack($('#header nav'));
            hashban.bind();
        }
    });

### What doesn't it do?

hashban.js does not, and won't ever, fall back to hash or hashbang (#!) urls.
The hash is for identifying page fragments, not for navigating from page to
page. Also, doing this would lead to users getting a different url scheme
depending on their browser, which is [not cool.](http://www.w3.org/Provider/Style/URI.html)

### Requirements

* jquery 1.5.1 or later
* (optional) Modernizr.js, to detect history api support. Here's a minimal custom build:
  http://modernizr.com/download/#-history

### Advanced example

Let's say we have our content in the #content element, global site nav in the #nav 
element, and also a #crumbtrail in the header which needs to change on page load. 
The following config demonstrates a custom sliding transition, and how to update
the #crumbtrail element on page load.

    var hashban;
    function setup() {
        // called on actual load
        
        if (Modernizr.history) {
            hashban = Hashban({
                // applies the plugin to newly-loaded content 
                content_init: init,
                
                // null since we're doing everything in transition_in
                transition_out: null,
                
                // all the grunt work happens here
                transition_in: function(new_content, old_content, data) {
                    // if reverse direction, slide from the top instead of 
                    // bottom
                    if (data.direction === -1) {
                        new_content.insertBefore(old_content);
                    }
                    
                    // slide up the old content then remove it
                    old_content.slideUp(function() {
                        old_content.remove();
                    });
                    
                    // slide the new content into place
                    new_content.slideDown();
                    
                    // find the new crumbtrail content, and insert it into the page
                    var crumbs = data.contentBody.find('#crumbtrail').html();
                    $('#crumbtrail').html(crumbs);
                }
            });
            
            // apply the plugin to the site nav, only on initial load since it doesn't change
            hashban.hijack($('#nav'));
        }                    
    };
    
    function init() {
        // called each time a new page is loaded, ajax or otherwise
        
        if (Modernizr.history) {
            hashban.hijack($('#content, #crumbtrail'));
        }
    };
    
    $(function() {
        setup();
        init();
    });


## Options
    
#### contentWrapSelector
Selector to find the site's content container. Defaults to '#content'

#### content_init: function(new_content)
Function to perform any required initialisation on newly loaded content.

#### duration
Default transition duration in ms. Defaults to 500

#### link_order
List of urls used to determine the direction of the transition.

#### loaderTimeout
Delay in ms before showing the loader. Used to avoid the loader 
flashing on fast loads. Default is 300.

#### loader: function(show)
Function which toggles the loading state based on the argument. If
creating an actual element on the page, it should return this element,
and reuse it (i.e. don't create a new one each time). Defaults 
to `$.hashban.loader`, which creates an element with the class
'hashban-loader' - if an element with this class already exists in
the html, it will use that.

#### transition_out: function(endfade, old_content, data)
Function to transition old content off the page. Must call endfade
callback once done. This option may be null; in that case the
endfade function is called automatically. Default is to fade out old
content. The data dict contains the direction, to and from urls, and state
data for the popstate event if it exists.

#### transition_in: function (new_content, old_content, data)
Function to transition new content onto the page. Default is to fade in new 
content. 

* The direction argument can be used to do sliding transitions through
  a site.
* The contentBody argument provides the entire retrieved document, and can 
  be used to extract extra content out of the site header and footer, for
  example.
* The data argument is the same as that for `transition_out` with the addition
  of contentBody (the html returned by the ajax call)


## API

### Initialisation

#### Hashban(user_options)
Factory function returning a Hashban instance. Takes an object containing plugin options.

### Instance methods:

#### hashban(link_collection)
Hijacks a specific set of links, eg. `hashban_instance.hashban($('a'));`

#### hijack(el, link_filter)
Finds suitable links within the el (a jquery collection), and binds their click event so
they will load via hashban. `link_filter` can be used to exclude links, if needed. 
eg. `hashban_instance.hijack($('#container'), ':not(.external)');`

#### loadPage(url, push_state)
Load the page at url, changing the page state if push_state is true.


### Events

#### hashban-unload
Triggered during page load, before any new content is added to the document.

#### hashban-load
Triggered after new content has been added to the document.


## Todo

- Detect middle-click, ⌘+click (Mac) and ctrl+click (Win); use default click behaviour in
  these cases.
- Expose a method for updating the cached page content, so ajax page updates 
  can be remembered if the user goes back to the page.)
- Handle # in urls (scroll to the element)
- Prevent/handle simultaneous transitions? (or does this belong in the 
  transition_in method?)
- Remember page scroll position and return to it on back (?)
- Figure out a way to have multiple Hashban instances handling their own transitions. Maybe
  needs some sort of global register? Maybe a separate object/function with definable rules
  for delegating transitions to different instances?

