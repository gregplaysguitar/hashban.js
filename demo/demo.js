(function($) {
    $(function() {

        function Transition() {
            // Define a custom transition class, using js pseudo-inheritance to 
            // inherit methods from Hashban.DefaultTransition

            // Apply the parent's constructor
            Hashban.DefaultTransition.apply(this, arguments);

            // Provide custom transition_in behaviour
            this.transition_in = function(new_content, contentBody) {
                // slide the new content up
                this.old_content.remove();
                new_content.css({
                    position: 'relative',
                    top: 1000
                }).show().animate({
                    top: 0
                }, 300);
                
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

            // Other functions which could be overridden:
            // this.should_use = function() {
            //     // return a bool
            // };
            // this.transition_out = function(endfade) {
            //     // perform out transition then call endfade callback
            // };
        };
        // Inherit non-overridden methods from parent
        Transition.prototype = new Hashban.DefaultTransition();

        function content_links() {
            hashban.hijack($('#content'));
        };

        var hashban_options = {
                contentWrapSelector: '#content',
                transitions: [Transition],
                content_init: content_links
            },
            hashban = Hashban(hashban_options);
        hashban.hijack($('#header nav'));
        hashban.bind();
        content_links();
    });
})(jQuery);