function makeNotification(options){
    let notificationHTML, templateFunction;
    const duration = 6000;

    // use lodash template function to interpolate the notification message into the icon wrapper HTML
    // https://lodash.com/docs/4.17.11#template
    switch (options.type) {

      case 'success':
        templateFunction = _.template('<i class="fas fa-check noty__icon"/></i><span class="noty__text"><%= compiledMessage %></span>');
        notificationHTML = templateFunction({ 'compiledMessage': options.message });
        break;

      case 'info':
        templateFunction = _.template('<i class="fas fa-info noty__icon"/></i><span class="noty__text"><%= compiledMessage %></span>');
        notificationHTML = templateFunction({ 'compiledMessage': options.message });
        break;

      case 'warning':
        templateFunction = _.template('<i class="fas fa-lightbulb noty__icon"/></i><span class="noty__text"><%= compiledMessage %></span>');
        notificationHTML = templateFunction({ 'compiledMessage': options.message });
        break;

      case 'error':
        templateFunction = _.template('<i class="fas fa-times noty__icon"/></i><span class="noty__text"><%= compiledMessage %></span>');
        notificationHTML = templateFunction({ 'compiledMessage': options.message });
        break;

      default:
        notificationHTML ='';
        console.log('makeNotification function has no params or cannot concatinate its content');
    }

    let notification = new Noty({
        text: notificationHTML,
        type: options.type,
        theme: 'light',
        layout: 'topRight',
        timeout: options.stayOpenUntilClick ? false : duration,
        progressBar: false,
        killer: options.closeOlderInstances, // what a morbid key name
        animation: {
            open: function (promise) {
                let n = this;
                TweenMax.fromTo ( n.barDom, 0.2, 
                    { autoAlpha: 0, y: -0  },
                    {
                        autoAlpha: 1,
                        y: -10,
                        ease: Circ.easeInOut,
                        onComplete: function () {
                            promise(function(resolve) {
                                resolve();
                            })
                        }
                    }
                );
                // console.log('showing notification');
            },

            close: function (promise) {
                let n = this;

                TweenMax.to (n.barDom, 0.05, { 
                                autoAlpha: 0,
                                ease: Circ.easeInOut,
                                onComplete: function () {
                                    promise(function(resolve) {
                                        resolve();
                                    })
                                }
                    }
                );
                // console.log('hiding notification');
            }
        }
    });

    return notification;
}
