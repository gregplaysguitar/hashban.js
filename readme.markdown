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
            
            function Transition() {
                // Define a custom transition class, using js pseudo-inheritance 
                // to inherit methods from Hashban.DefaultTransition
            
                // Apply the parent's constructor
                Hashban.DefaultTransition.apply(this, arguments);
            
                // Provide custom transition_in behaviour
                this.transition_in = function(new_content, contentBody) {
                    // reveal the new content
                    this.old_content.remove();
                    new_content.fadeIn();
                    
                    // swap in the new header 
                    $('#header h1').css('position', 'relative').animate({
                        left: '-2000px'
                    }, 300).queue(function(next) {
                        $(this).html(contentBody.find('#header h1').html()).css({
                            left: '2000px'
                        });
                        next();
                    }).animate({
                        left: 0
                    }, 300);
                };
            };
            // Inherit non-overridden methods from parent
            Transition.prototype = new Hashban.DefaultTransition();
            
            hashban = Hashban({
                // applies the plugin to newly-loaded content 
                content_init: init,
                transitions: [Transition],
            });
            
            // apply the plugin to the site nav, only on initial load since it 
            // doesn't change
            hashban.hijack($('#nav'));
        }                    
    };
    
    function init() {
        // called each time a new page is loaded, ajax or otherwise
        
        if (Modernizr.history) {
            hashban.hijack($('#content'));
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

#### link_order
List of urls used to determine the direction of the transition, which is passed
to the `transition_in` and `transition_out` functions

#### loaderTimeout
Delay in ms before showing the loader. Used to avoid the loader 
flashing on fast page loads. Default is 300.

#### loader: function(show)
Function which toggles the loading state based on the argument. If
creating an actual element on the page, it should return this element,
and reuse it (i.e. don't create a new one each time). Defaults 
to `Hashban.prototype.loader`, which creates an element with the class
'hashban-loader' - if an element with this class already exists in
the html, it will use that.

#### transitions
Array of Transition objects which implement the methods described in the 
Transitions section below. The first object who's `should_use` method returns
true will be used, or the last one will be used by default if no matches
are found.

## Transitions

The transitions option allows different transitions for different pages or 
groups of pages. Each object in the array should define a `should_use` method,
which is used to determine which transition to use. The `transition_in` and 
`transition_out` methods perform the actual transition. 

    function Transition(old_content, data){
        this.old_content = old_content;
        this.data = data;
    };
    Transition.prototype = {
        should_use: function() {
            // return true if this transition should be used here
        },
        transition_out: function(endfade) {
            // remove old content then call endfade
        },
        transition_in: function(new_content, contentBody) {
            // reveal new content
        }
    };

##### Constructor: `function(old_content, data)`
old_content is the existing page content due to be replaced. data contains 
information about the pending page transition:

* from: from url 
* to: to url
* direction: the direction of the transition, 1 or -1
* state: the "state" object, if the pageload was triggered by popstate

##### `function should_use()`
Based on information passed to the constructor, return true if this transition
should be used.

##### `function transition_out(endfade)`
Function to transition old content off the page. Must call endfade
callback once done.

##### `function transition_in(new_content, contentBody)`
Function to transition new_content onto the page. contentBody contains the entire
retrieved html document if needed. The contentBody argument provides the entire
retrieved document, and can be used to extract extra content out of the site 
header and footer, for example.


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

- Detect middle-click, ⌘+click (Mac) and ctrl+click (Win); use default click 
  behaviour in these cases.
- Expose a method for updating the cached page content, so ajax page updates 
  can be remembered if the user goes back to the page.)
- Handle # in urls (scroll to the element)
- Prevent/handle simultaneous transitions? (or does this belong in the 
  transition_in method?)

## Todone

- Remember page scroll position and return to it on back (?)

