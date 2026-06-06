(function ($) {
    "use strict";
    $(window).on('elementor/frontend/init', () => {
        const addHandler = ($element) => {
            elementorFrontend.elementsHandler.addHandler(interanioSwiperBase, {
                $element,
            })
        }

        if ($('.elementor-widget-interanio-banner-carousel .interanio-swiper').length > 0) {
            $('.elementor-widget-interanio-banner-carousel .interanio-swiper').on('swiperInit', function(e, slider) {
                slider.on('slideChangeTransitionStart', function (e) {
                    $('.elementor-banner-wrap-box-text .elementor-banner-box-text').hide(); 
                }); 
                
                slider.on('slideChangeTransitionEnd', function (e) {
                    $('.elementor-banner-wrap-box-text .elementor-banner-box-text').eq(e.realIndex).fadeIn();    
                }); 
            });    
        }

        elementorFrontend.hooks.addAction('frontend/element_ready/interanio-banner-carousel.default', addHandler);
    })
    
})(jQuery);

