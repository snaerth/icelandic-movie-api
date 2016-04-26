//------------------------------------------------
// Date: 02.01.2016
// Author: Snær Seljan Þóroddsson
// email: snaerth@gmail.is
//------------------------------------------------
var movieapp = {
    init: function() {
        this.menu();
        this.inputAnimation();
        this.modal();
        this.filterOpener();
        this.contactForm();
        this.registerForm();
        this.passwordRevealer();
        this.smoothScroll();
        this.destroyLoader();
    },

    //------------------------------------------------
    // Initializes navigation menu
    //------------------------------------------------
    menu: function() {
        var menu = document.querySelector('.menu_multilevel_mobile'),
            trigger = document.querySelector('.trigger_menu'),
            push_content = document.querySelector('.push_content');
        if (menu) {
            new MobileMenu(menu, trigger, push_content);
        }
    },

    //------------------------------------------------
    // Input animation (like wave)
    //------------------------------------------------
    inputAnimation: function() {
        // Custom event listener to detect browser autofill form
        $.fn.allchange = function(callback) {
            var self = this;
            var last = "";
            var infunc = function() {
                var text = $(self).val();
                if (text != last) {
                    last = text;
                    callback();
                }
                setTimeout(infunc, 100);
            }
            setTimeout(infunc, 100);
        };


        (function() {
            if (!String.prototype.trim) {
                (function() {
                    // Make sure we trim BOM and NBSP
                    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
                    String.prototype.trim = function() {
                        return this.replace(rtrim, '');
                    };
                })();
            }

            [].slice.call(document.querySelectorAll('input.input__field, textarea.input__field')).forEach(function(inputEl) {
                // in case the input is already filled..
                if (inputEl.value.trim() !== '') {
                    classie.add(inputEl.parentNode, 'input--filled');
                }
                
                // Custom listener for chrome and firefox autofill form
                $(inputEl).allchange(function() {
                    classie.add(inputEl.parentNode, 'input--filled');
                });

                // events:
                inputEl.addEventListener('focus', onInputFocus);
                inputEl.addEventListener('blur', onInputBlur);
            });

            function onInputFocus(ev) {
                classie.add(ev.target.parentNode, 'input--filled');
            }

            function onInputBlur(ev) {
                if (ev.target.value.trim() === '') {
                    classie.remove(ev.target.parentNode, 'input--filled');
                }
            }
        })();
    },

    //------------------------------------------------
    // Opens and closes modals
    //------------------------------------------------
    modal: function() {
        var movies = document.querySelectorAll('.movie_container'),
            modals = document.querySelectorAll('.modal_custom'),
            modalButtons = document.querySelectorAll('.modal-button'),
            exitBtn = document.querySelectorAll('span.icon-exit, .exit-button'),
            eventType = isMobile() ? 'touchstart' : 'click';

        function addModalListeners(buttons, callback) {
            Array.prototype.slice.call(buttons).forEach(function(button) {
                button.addEventListener(eventType, function(ev) {
                    ev.preventDefault();
                    var btnId = button.dataset.id;
                    Array.prototype.slice.call(modals).forEach(function(modal) {
                        var modalId = modal.dataset.id;
                        if (btnId === modalId) {
                            callback(modal, button);
                        }
                    });
                });
            });
        }

        function openModal(modal, button) {
            var pageTop = window.pageYOffset;
            modal.style.top = pageTop + 'px';
            classie.add(modal, 'show');
            classie.add(document.querySelector('body'), 'overflow');
            $(modal).find('.modal_custom__body').addClass('animated fadeInUp');
        }

        function closeModal(modal, button) {
            if (classie.has(button, 'form')) {
                var hiddenForms = document.querySelectorAll('form');
                Array.prototype.slice.call(hiddenForms).forEach(function(form) {
                    if (classie.has(form, 'hidden')) {
                        classie.remove(form, 'hidden');
                    }
                });
                var successBox = document.querySelector('.success');
                if (successBox) {
                    successBox.parentNode.removeChild(successBox);
                }
            }
            classie.remove(modal, 'show');
            classie.remove(document.querySelector('body'), 'overflow');
            $(modal).find('.modal_custom__body').removeClass('animated fadeInUp');
        }

        addModalListeners(modalButtons, openModal);
        addModalListeners(exitBtn, closeModal);

    },
    
    //------------------------------------------------
    // Opens fileter if avilable
    //------------------------------------------------
    filterOpener: function() {
        var filterContainer = document.querySelector('.filter_container');
        if (filterContainer) {
            var trigger = document.querySelector('.icon-filter'),
                pusher = document.querySelector('.push_content'),
                exitTrigger = document.querySelector('.filter_container .icon-exit'),
                eventType = isMobile() ? 'touchstart' : 'click';

            var isOpen = false;
            var bodyClickHandler = "";
            AttachEvent(trigger, eventType, function(ev) {
                classie.add(trigger, 'open');
                if (classie.has(trigger, 'open')) {
                    classie.add(filterContainer, 'open');
                    classie.add(pusher, 'open_top');
                    isOpen = true;
                    ev.stopPropagation();
                    bodyClickHandler = myEvtHandler(filterContainer);
                    AttachEvent(document, eventType, bodyClickHandler);
                }
            });

            var myEvtHandler = function(filterContainer) {
                return function(ev) {
                    ev.stopPropagation();
                    if (isOpen) {
                        var level = 0;
                        for (var element = ev.target; element; element = element.parentNode) {
                            if (element.className !== undefined && element.className.indexOf('filter_container') > -1) {
                                return;
                            }
                            level++;
                        }
                        classie.remove(filterContainer, 'open');
                        classie.remove(pusher, 'open_top');
                        DetachEvent(document, eventType, bodyClickHandler);
                    }
                };
            };
            var closeFilter = function() {
                AttachEvent(exitTrigger, eventType, function(ev) {
                    classie.remove(filterContainer, 'open');
                    classie.remove(pusher, 'open_top');
                });
            } ();
        }
    },

    //------------------------------------------------
    // Contact form for user
    //------------------------------------------------
    contactForm: function() {
        var form = $('#contact_form');
        $(form).find('button[type=submit]').removeAttr('disabled');
        form.submit(function(e) {
            e.preventDefault();
            $(this).find('button[type=submit]').attr('disabled','');
            $.ajax({
                type: "POST",
                url: form.attr('action'),
                dataType: "HTML",
                data: form.serialize(),
                success: function(data) {
                    var data = $(data).find('.contact_form_container');
                    $('.contact_form_container').parent('.modal_custom__body').empty().append(data);
                    movieapp.contactForm();
                    movieapp.inputAnimation();
                }
            });
        });
    },
    
    //------------------------------------------------
    // Api key form 
    //------------------------------------------------
    registerForm: function() {
        var form = $('#register_form');
        $(form).find('button[type=submit]').removeAttr('disabled');
        form.submit(function(e) {
            e.preventDefault();
            $(this).find('button[type=submit]').attr('disabled','');
            $.ajax({
                type: "POST",
                url: form.attr('action'),
                dataType: "HTML",
                data: form.serialize(),
                success: function(data) {
                    var data = $(data).find('.register_form_container');
                    $('.register_form_container').parent('.modal_custom__body').empty().append(data);
                    movieapp.registerForm();
                    movieapp.inputAnimation();
                }
            });
        });
    },
    
    //------------------------------------------------
    // Reaveals passwords in inputs
    //------------------------------------------------
    passwordRevealer : function() {
        // Reaveals and hides input type password
        var inputPasswords = document.querySelectorAll('.input_password'),
            eyes = document.querySelectorAll('i.password'),
            eventType = isMobile() ? 'touchstart' : 'click';
        if (inputPasswords) {
            for (var i = 0; i < eyes.length; i++) {
                addPasswordListeners(eyes[i], inputPasswords[i]);
            }
        }

        function addPasswordListeners(eye, inputPassword) {
            AttachEvent(eye, eventType, function(ev) {
                // Reveals input type password       
                if (!classie.has(eye, 'open')) {
                    classie.add(eye, 'open');
                    inputPassword.type = 'text';
                    eye.innerHTML = 'visibility_off';
                }
                // Hides input type password
                else {
                    classie.remove(eye, 'open');
                    inputPassword.type = 'password';
                    eye.innerHTML = 'visibility';
                }
            });
        }  
    },
    
    //-------------------------------------------------------------
    // Performs a smooth page scroll to an anchor on the same page.
    //-------------------------------------------------------------
    smoothScroll: function() {
        $('a[href*="#"]:not([href="#"])').click(function () {
            if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
                var target = $(this.hash);
                target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
                if (target.length) {
                    $('html, body').animate({
                        scrollTop: target.offset().top - 30
                    }, 400);
                    return false;
                }
            }
        });
    },
    
    //-------------------------------------------------------------
    // Hides loader 
    //-------------------------------------------------------------
    destroyLoader : function() {
        // Index (home) page
        if ( window.location.pathname == '/' ){
            classie.add(document.querySelector('.loading_container.frontpage'), 'hidden');    
        }
     }
 };

(function() {
    movieapp.init();
})();




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

function isMobile() {
    var isMobile = false;
    // device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
        isMobile = true;
    }
    return isMobile;
}

