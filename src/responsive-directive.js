(function ( angular ) {
    'use strict';

    angular
        .module('angular-responsive', [])
        .provider('responsiveHelper', ["$windowProvider", function ($windowProvider)
        {
            // Gather winWidth based in Twitter BootStrap http://getbootstrap.com/css/#grid-media-queries

            var matchmedia = {
                rules: {
                    print : "print",
                    screen : "screen",
                    phone : "(max-width: 767px)",
                    tablet : "(min-width: 768px) and (max-width: 979px)",
                    desktop : "(min-width: 979px)",
                    portrait : "(orientation: portrait)",
                    landscape : "(orientation: landscape)"
                }
            };
            function createSafeListener(cb, $scope){
                return function(mediaQueryList){
                    safeApply(function() {
                        cb(mediaQueryList);
                    },$scope);
                };
            }



            var $window  = $windowProvider.$get();
            // is better get first the innerWitdh that will not include a lateral panel
            // like the console inspector, bookmarks, etc
            var winWidth = $window.innerWidth || $window.outerWidth;
            var helper   = {

                isXs: function () { return winWidth < 768; },
                isSm: function () { return winWidth >= 768 && winWidth < 992; },
                isMd: function () { return winWidth >= 992 && winWidth < 1200; },
                isLg: function () { return winWidth >= 1200;},
                isMobile: function() { return helper.isXs() && isSmartDevice($window)},
                isTablet: function() { return (helper.isSm()||helper.isMd()) && isSmartDevice($window)},
                isDesktop: function() { return !isSmartDevice($window) },
                isSmartDevice: function() { return isSmartDevice($window) },
                isTouch: function() {
                    return ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
                },
                isNotTouch: function() {
                    return !this.isTouch();
                },
                isLandscape: function() { return ( $window.orientation == 90 || $window.orientation == -90 ); },
                isPortrait: function() { return ( $window.orientation == 0 || $window.orientation == 180 ); },
                on:function(query, listener, $scope) {
                    var supportsMatchMedia = $window.matchMedia !== undefined && !!$window.matchMedia('all').addListener;
                    if(supportsMatchMedia) {
                        logger.log('adding listener for query: '+ query);
                        var mediaQueryList = $window.matchMedia(query);
                        var handler = createSafeListener(listener, $scope);
                        mediaQueryList.addListener(handler);
                        //immediately return the current mediaQueryList;
                        handler(mediaQueryList);

                        return function() {
                            logger.log('removing listener from query: '+ query);
                            mediaQueryList.removeListener(handler);

                        };
                    }
                },
                onPortrait : function(listener, $scope){
                    return helper.on(matchmedia.rules.portrait, listener, $scope);
                },
                onLandscape: function(listener, $scope){
                    return helper.on(matchmedia.rules.landscape, listener, $scope);
                }

            };





            // Publish accessor function...

            this.$get = function() {
                return helper;
            };
        }])

        .directive('ajMatchmedia', ['matchmedia', function(matchmedia) {
            return {
                restrict: 'E',
                scope: {
                    'queryListener': '&',
                    'queryMatches': '='
                },
                link: function(scope, element, attrs, controllers) {
                    var deregister;

                    if (attrs.on && attrs.queryListener) {
                        if (attrs.on.slice(0, 2) === 'on' && matchmedia[attrs.on] !== 'undefined') {
                            deregister = matchmedia[attrs.on](function(mediaQueryList) {
                                scope.queryListener({mediaQueryList: mediaQueryList});
                            });
                        } else {
                            deregister = matchmedia.on(attrs.on, function(mediaQueryList) {
                                scope.queryListener({mediaQueryList: mediaQueryList});
                            });
                        }
                        scope.$on('$destroy', deregister);
                    } else if (attrs.is && attrs.queryMatches) {
                        if (attrs.is.slice(0, 2) === 'is' && matchmedia[attrs.is] !== 'undefined') {
                            scope.queryMatches = matchmedia[attrs.is]();
                        } else {
                            scope.queryMatches = matchmedia.is(attrs.is);
                        }
                    }
                }
            };
        }])
        .factory('safeApply', ['$rootScope',function($rootScope) {
            return function(fn, $scope) {
                $scope = $scope || $rootScope;
                var phase = $scope.$root.$$phase;
                if(phase == '$apply' || phase == '$digest') {
                    if (fn) {
                        $scope.$eval(fn);
                    }
                } else {
                    if (fn) {
                        $scope.$apply(fn);
                    } else {
                        $scope.$apply();
                    }
                }
            };
        }])

    /**
     * Extra small devices Phones (<768px)
     */
        .directive('arMobile', ['responsiveHelper', function (responsiveHelper)
        {
            return {
                restrict    : "EAC",
                transclude  : 'element',
                template    : '<div></div>',
                compile     : buildCompileFn( 'arMobile', responsiveHelper.isMobile )
            };
        }])

    /**
     * Small devices Tablets (≥768px)
     */
        .directive('arTablet', ['responsiveHelper', function (responsiveHelper)
        {
            return {
                restrict    : "EAC",
                transclude  : 'element',
                template    : '<div></div>',
                compile     : buildCompileFn( 'arTablet', responsiveHelper.isTablet )
            };
        }])

    /**
     * Medium devices Desktops (≥992px)
     */
        .directive('arDesktop', ['responsiveHelper', function (responsiveHelper)
        {
            return {
                restrict    : "EAC",
                transclude  : 'element',
                template    : '<div></div>',
                compile     : buildCompileFn( 'arDesktop', responsiveHelper.isDesktop )
            };
        }])



    /**
     * Does the with a match user-specified combination (0..4)
     */
        .directive('arResponsive', ['responsiveHelper', function (responsiveHelper)
        {
            return {
                restrict    : "EAC",
                transclude  : 'element',
                template    : '<div></div>',
                compile     : buildCompileFn( 'arResponsive', checkAllTypes(responsiveHelper) )
            };
        }]);

    /**
     * Partial application for DRY construction of a directive compile function
     */
    function buildCompileFn(responsiveType, verifyFn )
    {
        return function compile(element, attr, transclude)
        {
            return function postLink(scope, element, attr)
            {
                var childElement, childScope,
                    config  = scope.$eval( attr[responsiveType] ),
                    unwatch = scope.$watch( config, function ()
                    {
                        // attribute changed, delete existing element & $scope

                        if (childElement) {
                            childElement.remove();
                            childScope.$destroy();
                            childElement = undefined;
                            childScope = undefined;
                        }

                        if ( verifyFn(config) )
                        {
                            // Create a new element and $scope...

                            childScope = scope.$new();
                            childElement = transclude(childScope, function (clone) {
                                element.after(clone);
                            });
                        }
                    });

                // Fix memory leak an remove watcher when element/directive is released

                scope.$on( "$destroy", unwatch );
            };
        };
    }

    /**
     * Partial application for DRY construction of function to scan of any valid responsive types
     */
    function checkAllTypes(responsiveHelper)
    {
        return function( deviceTypes )
        {
            return  ( deviceTypes['xs']  && responsiveHelper.isXs()  ) ||
                ( deviceTypes['sm']  && responsiveHelper.isSm()  ) ||
                ( deviceTypes['md']  && responsiveHelper.isMd()  ) ||
                ( deviceTypes['lg'] && responsiveHelper.isLg() ) ||
                ( deviceTypes['mobile'] && responsiveHelper.isMobile() ) ||
                ( deviceTypes['tablet'] && responsiveHelper.isTablet() ) ||
                ( deviceTypes['desktop'] && responsiveHelper.isDesktop() ) ||
                false;
        };
    }

    /**
     * Scan to determine if current window is hosted within a `smart` device
     * @param $window
     * @returns {boolean}
     */

    function isSmartDevice( $window )
    {
        // Adapted from http://www.detectmobilebrowsers.com
        var ua = $window['navigator']['userAgent'] || $window['navigator']['vendor'] || $window['opera'];

        // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
        return (/iPhone|iPod|iPad|Silk|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);
    }


})( window.angular );
