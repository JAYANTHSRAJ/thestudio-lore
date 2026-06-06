(function ($) {
    "use strict";
    $(window).on('elementor/frontend/init', function () {

        elementorFrontend.hooks.addAction('frontend/element_ready/column', function ($scope) {
            if ($scope.hasClass('animated-slide-column')) {
                new Waypoint({
                    element: $scope, offset: '50%', handler: function () {
                        $scope.addClass('col-loaded');
                    }
                });
            }

            if ($scope.hasClass('animated-bg-parallax')) {
                var $wrap = $scope.find('>[class*="elementor-column-"]');
                var linkImage = $wrap.css('backgroundImage').replace('url(', '').replace(')', '').replace(/\"/gi, "");
                if (linkImage === 'none') {
                    return;
                }
                $wrap.prepend('<img src="' + linkImage + '" class="img-banner-parallax" alt="banner-parallax"/>')

                $wrap.find('>.img-banner-parallax').panr({
                    moveTarget: $wrap,
                    sensitivity: 20,
                    scale: false,
                    scaleOnHover: true,
                    scaleTo: 1.1,
                    scaleDuration: .25,
                    panY: true,
                    panX: true,
                    panDuration: 1.25,
                    resetPanOnMouseLeave: true
                });
            }
        });
        elementorFrontend.hooks.addAction('frontend/element_ready/section', function ($scope) {
            $(window).load(function () {
                if ($scope.hasClass('animated-bg-parallax')) {
                    var linkImage = $scope.css('backgroundImage').replace('url(', '').replace(')', '').replace(/\"/gi, "");
                    if (linkImage === 'none') {
                        return;
                    }
                    $scope.prepend('<img src="' + linkImage + '" class="img-banner-parallax" alt="banner-parallax" />')
                    $scope.find('>.img-banner-parallax').panr({
                        moveTarget: $scope,
                        sensitivity: 20,
                        scale: false,
                        scaleOnHover: true,
                        scaleTo: 1.1,
                        scaleDuration: .25,
                        panY: true,
                        panX: true,
                        panDuration: 1.25,
                        resetPanOnMouseLeave: false
                    });
                }

                
            })
        })
        elementorFrontend.hooks.addAction('frontend/element_ready/container', function ($scope) {
            if ($scope.hasClass('mostion_image')) {
                $('.mostion_image').each(function() {
                    $(this).mousemove(function(e){
                        var imageBox = $(this).find('.elementor-widget-image .elementor-widget-container img');
                        imageBox.each(function(index) {
                            var mouseX = (e.pageX / 50),
                                mouseY = (e.pageY / 50); 
    
                            var arrow = (index % 2 == 0) ? '-' : '';
                            
                            $(this).css({
                                'transform' : 'translateX(var(--translateX)) translateY(var(--translateY))',
                                '--translateX' : arrow + mouseX + 'px',
                                '--translateY' : arrow + mouseY + 'px',
                            });
                        });
                    });
                })
            }

            if($('.effects-background-deco-yes').length > 0) {
                $('.effects-background-deco-yes .elementor-icon').each(function() {
                    var icon = $(this);
                    icon.mousemove(function(e){
                        var heightBox = $(this).outerHeight(),
                            widthBox = $(this).outerWidth()
                        
                        var offsetBox = $(this).offset(),
                            offsetTop = offsetBox.top,
                            offsetLeft = offsetBox.left;
                            
                        var mouseX = (e.pageX),
                            mouseY = (e.pageY); 
                    
                        var beforeTop = mouseY - offsetTop,
                            beforeLeft = mouseX - offsetLeft;
                        
                        var typeY = '',
                            typeX = '';
                        
                        if(beforeTop < (heightBox / 2)) {
                            var typeY = '-';
                        }
                        if(beforeLeft < (widthBox / 2)) {
                            var typeX = '-';
                        }
                        
                        icon.css({
                            '--top-before' : typeY + '5%',
                            '--left-before' : typeX + '5%',
                        });
                    });
                })
            }
        })

        elementorFrontend.hooks.addAction('frontend/element_ready/counter.default', function ($element) {

            elementorFrontend.elementsHandler.addHandler(interanioCounter, {
                $element,
            })
    
		});

    })

})(jQuery)

class interanioCounter extends elementorModules.frontend.handlers.Base {
    getDefaultSettings() {
        return {
            selectors: {
                counterNumber: '.elementor-counter-number-style-2'
            }
        };
    }
    getDefaultElements() {
        const selectors = this.getSettings('selectors');
        return {
            $counterNumber: this.$element.find(selectors.counterNumber)
        };
    }
    onInit() {
        if (this.getDefaultElements().$counterNumber.length) {
            super.onInit();
            this.intersectionObserver = elementorModules.utils.Scroll.scrollObserver({
                callback: event => {
                    if (event.isInViewport) {
                        this.intersectionObserver.unobserve(this.elements.$counterNumber[0]);

                        var odo = this.elements.$counterNumber;
                        var countNumber = odo.attr("data-to-value");
                        odo.html(countNumber);
                    }
                }
            });
            this.intersectionObserver.observe(this.elements.$counterNumber[0]);
        }
    }
}

class interanioLoadmorePost extends elementorModules.frontend.handlers.Base {
    getDefaultSettings() {
        return {
            selectors: {
                loadmoreBtn: '.interanio-post-loadmore',
                list: '.interanio-list-wrapper',
                item: '.interanio-item'
            }
        };
    }
    getDefaultElements() {
        const selectors = this.getSettings('selectors');
        return {
            loadmoreBtn: this.$element.find(selectors.loadmoreBtn)
        };
    }
    onInit() {
        if (elementorFrontend.isEditMode()) {
            return;
        }
        var $ = jQuery;
        var $loadmoreBtn = this.getDefaultElements().loadmoreBtn;
        if ($loadmoreBtn.length) {
            super.onInit();

            var ins = this;
            
            $loadmoreBtn.on('click', function(e) {
                e.preventDefault();

                if ($(this).hasClass('loading')) {
                    return false;
                }

                var url = $(this).attr('href'),
                    total = parseInt($(this).attr('data-total')),
                    current = parseInt($(this).attr('data-current'));
                
                if (url) {
                    if (current < total) {
                        let hideAfterDone = current + 1 == total
                        ins.sendRequest(url, $(this), hideAfterDone);
                    } else {
                        $(this).parent('.interanio-loadmore').remove();
                    }
                }
            })
        }
    }
    sendRequest(url, btn, hideAfterDone = false) {
        var xhr = false;
        var $ = jQuery;

        if (xhr) {
            xhr.abort();
        }

        var $loadmoreBtn = btn,
            id = this.$element.data('id'),
            selectors = this.getSettings('selectors'),
            btnSelector = selectors.loadmoreBtn,
            listSelector = selectors.list,
            itemSelector = selectors.item;

        xhr = $.ajax({
            type: "GET",
            url: url,
            beforeSend: function () {
                $loadmoreBtn.addClass('loading');
            },
            success: function (data) {
                var $html = $(data),
                    listWrapper = $(listSelector, this.$element),
                    itemAppend = $html.find(`[data-id="${id}"] ${itemSelector}`),
                    btnNew = $html.find(`[data-id="${id}"] ${btnSelector}`);
                
                // setTimeout(function() { 
                // }, 1000);

                if (itemAppend.length && listWrapper.length) {
                    listWrapper.append(itemAppend);
                } else {
                    console.log('List or Item is not found!');
                }

                if (btnNew.length) {
                    $loadmoreBtn.attr({
                        'href': btnNew.attr('href'),
                        'data-total': btnNew.attr('data-total'),
                        'data-current': btnNew.attr('data-current')
                    })
                }
                if (hideAfterDone || !btnNew.length) {
                    $loadmoreBtn.parent('.interanio-loadmore').remove();
                }

                // window.history.pushState(null, null, url);
                xhr = false;
                $(document).trigger('interanio-posttype-loaded');

            },
            error: function(xhr) { // if error occured
				alert("Error occured. Please try again!");
				$loadmoreBtn.removeClass('loading');
			},
			complete: function() {
                $loadmoreBtn.removeClass('loading');
			},
        });
    }
}

class interanioSwiperBase extends elementorModules.frontend.handlers.SwiperBase {

    getDefaultSettings() {
        return {
            selectors: {
                carousel: '.interanio-swiper', slideContent: '.swiper-slide'
            }
        };
    }

    getDefaultElements() {
        const selectors = this.getSettings('selectors');
        const elements = {
            $swiperContainer: this.$element.find(selectors.carousel)
        };
        elements.$slides = elements.$swiperContainer.find(selectors.slideContent);
        return elements;
    }

    handleElementHandlers(swiper) {
        // const element = this.getDefaultElements();
		jQuery('.swiper-index.swiper-index-'+this.$element.data('id')).find('.current-index').text(swiper.realIndex + 1);
    }

    getSwiperSettings() {

        const elementSettings = this.getElementSettings(), slidesToShow = +elementSettings.column || 3,
            isSingleSlide = 1 === slidesToShow,
            elementorBreakpoints = elementorFrontend.config.responsive.activeBreakpoints, defaultSlidesToShowMap = {
                mobile: 1, tablet: isSingleSlide ? 1 : 2
            };

        // console.log(this.elements.$slides.length);
        const swiperOptions = {
            slidesPerView: slidesToShow,
            loop: 'yes' === elementSettings.infinite,
            speed: elementSettings.speed,
            handleElementorBreakpoints: true,
            watchSlidesProgress: true,
            watchSlidesVisibility: true,
            loopedSlides: this.elements.$swiperContainer.data('count'),
        };

        if ('true' === this.elements.$swiperContainer.data('center')) {
            swiperOptions.centeredSlides = true;
        }

        swiperOptions.breakpoints = {};
        let lastBreakpointSlidesToShowValue = slidesToShow,
            spacingSwiperSize = elementSettings.column_spacing_swiper.size,
            lastBreakpointSpacing = spacingSwiperSize || spacingSwiperSize === 0 ? spacingSwiperSize : 30;
        Object.keys(elementorBreakpoints).reverse().forEach(breakpointName => {
            // Tablet has a specific default `column`.
            const defaultSlidesToShow = defaultSlidesToShowMap[breakpointName] ? defaultSlidesToShowMap[breakpointName] : lastBreakpointSlidesToShowValue;

            lastBreakpointSpacing = elementSettings['column_spacing_swiper_' + breakpointName].size || lastBreakpointSpacing;

            swiperOptions.breakpoints[elementorBreakpoints[breakpointName].value] = {
                slidesPerView: +elementSettings['column_' + breakpointName] || defaultSlidesToShow,
                slidesPerGroup: +elementSettings['column_' + breakpointName] || 1,
                spaceBetween: +lastBreakpointSpacing
            };
            lastBreakpointSlidesToShowValue = +elementSettings['column_' + breakpointName] || defaultSlidesToShow;
        });

        if ('yes' === elementSettings.autoplay) {
            swiperOptions.autoplay = {
                delay: elementSettings.autoplay_speed,
                disableOnInteraction: 'yes' === elementSettings.pause_on_interaction
            };
        }

        if (isSingleSlide) {
            swiperOptions.effect = elementSettings.effect;

            if ('fade' === elementSettings.effect) {
                swiperOptions.fadeEffect = {
                    crossFade: true
                };
            }
        } else {
            swiperOptions.slidesPerGroup = +elementSettings.slides_to_scroll || 1;
        }

        if (elementSettings.column_spacing_swiper) {
            swiperOptions.spaceBetween = elementSettings.column_spacing_swiper.size;
        }

        if (elementSettings.center_carousel) {
            swiperOptions.centeredSlides = true;
        }

        const showArrows = 'arrows' === elementSettings.navigation || 'both' === elementSettings.navigation,
            showDots = 'dots' === elementSettings.navigation || 'both' === elementSettings.navigation;

        if (showArrows) {
            if ('yes' === elementSettings.custom_navigation) {
                swiperOptions.navigation = {
                    prevEl: elementSettings.custom_navigation_previous, nextEl: elementSettings.custom_navigation_next,
                };
            } else {
                swiperOptions.navigation = {
                    prevEl: '.elementor-swiper-button-prev-' + this.$element.data('id'),
                    nextEl: '.elementor-swiper-button-next-' + this.$element.data('id')
                };
            }
        }

        if (showDots) {
            swiperOptions.pagination = {
                el: '.swiper-pagination-' + this.$element.data('id'), type: 'bullets', clickable: true
            };
        }

        if ('yes' === elementSettings.lazyload) {
            swiperOptions.lazy = {
                loadPrevNext: true, loadPrevNextAmount: 1
            };
        }

        if ('yes' !== elementSettings.drag_move) {
            swiperOptions.allowTouchMove = false;
        }

        if ('yes' === elementSettings.show_index) {
            swiperOptions.on = {
				slideChange: (swiper) => {
				  	this.handleElementHandlers(swiper);
				},
			};
        }

        return swiperOptions;
    }

    async onInit() {
        super.onInit(...arguments);

        if (!this.elements.$swiperContainer.length || 2 > this.elements.$slides.length) {
            return;
        }

        

        const Swiper = elementorFrontend.utils.swiper;
        this.swiper = await new Swiper(this.elements.$swiperContainer, this.getSwiperSettings()); // Expose the swiper instance in the frontend

        this.elements.$swiperContainer.trigger("swiperInit", [this.swiper]);

        this.elements.$swiperContainer.data('swiper', this.swiper);
        const elementSettings = this.getElementSettings();

        if ('yes' === elementSettings.pause_on_hover) {
            this.togglePauseOnHover(true);
        }
    }

    updateSwiperOption(propertyName) {
        const elementSettings = this.getElementSettings(), newSettingValue = elementSettings[propertyName],
            params = this.swiper.params; // Handle special cases where the value to update is not the value that the Swiper library accepts.

        switch (propertyName) {
            case 'column_spacing_swiper':
                params.spaceBetween = newSettingValue.size || 30;
                break;

            case 'autoplay_speed':
                params.autoplay.delay = newSettingValue;
                break;

            case 'speed':
                params.speed = newSettingValue;
                break;
        }

        this.swiper.update();
    }

    getChangeableProperties() {
        return {
            pause_on_hover: 'pauseOnHover',
            autoplay_speed: 'delay',
            speed: 'speed',
            column_spacing_swiper: 'spaceBetween'
        };
    }

    onElementChange(propertyName) {
        const changeableProperties = this.getChangeableProperties();

        if (changeableProperties[propertyName]) {
            // 'pause_on_hover' is implemented by the handler with event listeners, not the Swiper library.
            if ('pause_on_hover' === propertyName) {
                const newSettingValue = this.getElementSettings('pause_on_hover');
                this.togglePauseOnHover('yes' === newSettingValue);
            } else {
                this.updateSwiperOption(propertyName);
            }
        }
    }

    onEditSettingsChange(propertyName) {
        if ('activeItemIndex' === propertyName && typeof this.swiper != 'undefined') {
            this.swiper.slideToLoop(this.getEditSettings('activeItemIndex') - 1);
        }
    }
}