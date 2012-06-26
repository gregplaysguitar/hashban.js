# hashban.js - ajax page transitions made simple

hashban.js is a plugin to simplify the addition of ajax-style page transitions
to a website. You specify which links to "hijack" and how to find your site's 
content (e.g. the part that changes on page load) and hashban.js does the rest.

### Example usage:

    $(function() {
        var hashban_options = {
            contentWrapSelector: '#mycontent'
        };
        $.hashban.setup(hashban_options);
        $('#header nav a').hashban();
    });

### What doesn't it do?

hashban.js does not, and won't ever, fall back to hash or hashbang (#!) urls.
The hash is for identifying page fragments, not for navigating from page to
page. Also, doing this would lead to users getting a different url scheme
depending on their browser and this is [bad.](http://www.w3.org/Provider/Style/URI.html)



## Options
    
#### contentWrapSelector
Selector to find the site's content container. Defaults to '#content'

#### content_init: function(new_content)
Function to perform any required initialisation on newly loaded content.

#### duration
Default transition duration in ms. Defaults to 500

#### link_order
List of urls used to determine the direction of the transition.

#### loader_parent
When using the default loader, loader_parent is the element to which
it will be appended. Defaults to the document body.

#### loaderTimeout
Delay in ms before showing the loader. Used to avoid the loader 
flashing on fast loads. Default is 300.

#### loader: function(show)
Function which a) returns the loader element (creating if necessary) and 
b) shows or hides the element, if the argument is true or false. Defaults 
to $.hashban.loader

#### link_filter
Jquery selector to filter the links that are hijacked via the hashban 
function.

#### transition_out: function(endfade, old_content, direction, url)
Function to transition old content off the page. Must call endfade
callback once done. This option may be null; in that case the
endfade function is called automatically. Default is to fade out old
content.

#### transition_in: function (new_content, old_content, direction, contentBody)
Function to transition new content onto the page. Default is to fade in new 
content. 

* The direction argument can be used to do sliding transitions through
  a site.
* The contentBody argument provides the entire retrieved document, and can 
  be used to extract extra content out of the site header and footer, for
  example.


## API

### Required methods

#### $.hashban.setup: function (user_options)
Sets the global plugin options, and binds the window's popstate event.

#### $.fn.hashban
Find suitable links within the jquery collection, and bind their click 
event so they will load via hashban.

### Additional methods:

#### $.hashban.hijack: function(links)
Hijack a specific set of links (a jquery collection)

#### $.hashban.loadPage: function (url, push_state)
Load the page at url, changing the page state if push_state is true.


### Events

#### hashban-unload
Triggered during page load, before any new content is added to the document.

#### hashban-load
Triggered after new content has been added to the document.


## Todo

- Handle # in urls (scroll to the element)
- Prevent/handle simultaneous transitions? (or does this belong in the 
  transition_in method?)
- Remove setup method, use settings object (?)
