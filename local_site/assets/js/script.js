jQuery(document).ready(function($) {
    function animateTimeline() {
        $('.etw-timeline-entry').each(function() {
            const top = $(this).offset().top;
            const scrollBottom = $(window).scrollTop() + $(window).height();
            if (scrollBottom > top + 50) {
                $(this).addClass('animate');
            }
        });
    }
    $(window).on('scroll resize load', animateTimeline);
    animateTimeline();
});
