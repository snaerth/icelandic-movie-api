/*
 * Mobile menu multilevel with css3 transitions
 * Created by Snær Seljan Þóroddsson
 * snaerth@gmail.com
 * 08.09.2015
 */

; (function (window) {

    'use strict';
    // Checks if device is mobile
    // returns true if mobile
    function isMobile() {
        var isMobile = false; 
        // device detection
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
            || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
            isMobile = true;
        }
        return isMobile;
    }


    // logic to attach the event correctly in IE9 and below
    function AttachEvent(element, type, handler) {
        if (element.addEventListener) {
            element.addEventListener(type, handler, false);
        } else if (element.attachEvent) {
            element.attachEvent('on' + type, handler)
        } else {
            element['on' + type] = handler;
        }
    }

    // logic to detach the event correctly in IE9 and below
    function DetachEvent(element, type, handler) {
        if (element.removeEventListener) {
            element.removeEventListener(type, handler, false);
        } else if (element.detachEvent) { // for internet explorer
            element.detachEvent('on' + type, handler)
        } else {
            element['on' + type] = handler;
        }
    }

    // returns the closest element to element that has class "classname"
    function closest(element, classname) {
        if (classie.has(element, classname)) {
            return element;
        }
        return element.parentNode && closest(element.parentNode, classname);
    }

    function scrollTo(el) {
        el.scrollTop = 0;
    }

    // Constructor for menu
    function MobileMenu(element, menu_triggers, push_content) {
        // menu container
        this.element = element;
        // open menu trigger element
        this.menu_triggers = menu_triggers;
        // content to push
        this.push_content = push_content;
        // initialize menu
        this.init();
    }

    MobileMenu.prototype = {
        init: function () {
            // shows at what level we are at
            this.level = 0;
            // checks if on mobile phone and uses correct event type
            this.eventType = isMobile() ? 'touchstart' : 'click';
            // Holds count if menu is open or not
            this.isOpen = false;
            // All trees sublevels
            this.levels = Array.prototype.slice.call(document.querySelectorAll('.menu_level'));
            // All exit buttons
            this.exitButtons = Array.prototype.slice.call(document.querySelectorAll('.menu_container .icon-exit'));
            // initalize events
            this.init_events();
        },

        init_events: function () {

            // Sets trigger for opening and closing menu
            this.trigger_menu();
            // if exists open nodes next level 
            this.next_and_prev_level();
            // events to exit menu
            this.exit_menu();
        },

        // attaches events on one or more triggers.
        trigger_menu: function () {
            var _self = this;
            if (this.menu_triggers.length > 1) {
                Array.prototype.slice.call(this.menu_triggers).forEach(function (trigger) {
                    _self.open_close_menu(trigger, this.push_content);
                });
            } else {
                this.open_close_menu(this.menu_triggers, this.push_content);
            }
        },

        // opens menu on click
        open_close_menu: function (trigger, push_content) {
            var _self = this;
            AttachEvent(trigger, _self.eventType, function (ev) {
                if (classie.has(this, 'open')) {
                    classie.remove(this, 'open');
                    classie.remove(_self.element, 'open');
                    classie.remove(_self.element.children[0], 'open');
                    // resets all levels in menu
                    _self.levels_reset();
                } else {
                    classie.add(this, 'open');
                    classie.add(push_content, 'open');
                    classie.add(_self.element, 'open');
                    classie.add(_self.element.children[1], 'open');
                    classie.add(_self.element.children[1], 'active');
                    _self.isOpen = true;
                    ev.stopPropagation();
					
                    // closes menu if clicked/touched anywhere outside menu
                    _self.bodyClickHandler = _self.myEvtHandler(_self);
                    AttachEvent(document, _self.eventType, _self.bodyClickHandler);
                }
            });
        },

        myEvtHandler: function (menu) {
            return function (ev) {
                if (menu.isOpen) {
                    menu.levels_reset();
                    DetachEvent(this, menu.eventType, menu.bodyClickHandler);
                }
            };
        },

        levels_reset: function () {
            classie.remove(this.push_content, 'open');
            classie.remove(this.element, 'open');
            if (this.menu_triggers.length > 1) {
                Array.prototype.slice.call(this.menu_triggers).forEach(function (trigger) {
                    classie.remove(trigger, 'open');
                });
            } else {
                classie.remove(this.menu_triggers, 'open');
            }
            this.levels.forEach(function (el) {
                if (classie.has(el, 'open')) {
                    classie.removeClass(el, 'open');
                    classie.removeClass(el, 'active');
                }
            });
            this.level = 0;
            this.isOpen = false;
        },

        next_and_prev_level: function () {
            var _self = this;
            // attach event to each menu_level class 
            this.levels.forEach(function (level) {
                AttachEvent(level, _self.eventType, function handler(ev) {
                    ev.stopPropagation();
                    _self.levels.forEach(function (level) {
                        classie.remove(level, 'active');
                    });
                    var el = ev.target;
                    if (classie.has(el, 'next_level')) {
                        ev.preventDefault();
                        // next menu_level
                        var nextLevel = el.parentElement.nextElementSibling;
                        if (nextLevel !== null) {
                            classie.remove(_self.element.children[0], 'active');
                            classie.add(nextLevel, 'open');
                            classie.add(nextLevel, 'active');
                            _self.level++;
                            scrollTo(_self.element);
                        }
                    } else if (classie.has(el, 'prev_level') || classie.has(el, 'back')) {
                        ev.preventDefault();
                        var level = closest(el, 'menu_level');
                        classie.remove(level, 'open');
                        _self.level--;
                        classie.add(_self.levels[_self.level], 'active');
                        scrollTo(_self.element);
                    }
                });
            });
        },

        exit_menu: function () {
            var _self = this;
            this.exitButtons.forEach(function (exitBtn) {
                AttachEvent(exitBtn, _self.eventType, function (ev) {
                    _self.levels_reset();
                });
            });
        },
    };
    // attach object to window object
    window.MobileMenu = MobileMenu;
} (window));
