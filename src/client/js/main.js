Stripe.setPublishableKey('pk_test_ihV2zzGJlyMc5nwpMWgKzOmB');


$(document).ready(function() {

    $('#charge-error').hide();

    $('#payment-form').submit(function(event) {
        $('#charge-error').hide();
        var $form = $(this);
        $form.find('button').prop('disabled', true);
        Stripe.card.createToken($form, stripeResponseHandler);
        return false;
    });

    function stripeResponseHandler(status, response) {
        if (response.error) {
            $('#charge-error').show();
            $('.payment-errors').text(response.error.message);
            $('.submit-button').removeAttr('disabled');
        } else {
            var form$ = $('#payment-form');
            var token = response.id;
            form$.append('<input type="hidden" name="stripeToken" value="' + token + '"/>');
            form$.get(0).submit();
        }
    }

    $('#add-product-form').submit(function(event) {
        event.preventDefault();
        $('#product-response').text('');
        var payload = {name: $('#product-name').val(), amount:$('#product-price').val()};
        $.ajax({
            type: 'POST',
            url: '/api/v1/product',
            data: payload
        })
            .done(function(data) {
                $('#product-response').text('Yay! Product Added!');
            })
            .fail(function() {
                $('#product-response').text('Yike! Something went wrong.');
            });
        $('#product-name').val('');
        $('#product-price').val('');
    });

    $('[id^=delete-product-form]').submit(function(event) {
        event.preventDefault();
        $('#product-response').text('');
        var payload = {};
        var index = this.id;
        index = index.substring(19);
        var url = '/api/v1/product/' + index;
        $.ajax({
            type: 'DELETE',
            url: url,
            data: payload
        })
            .done(function(data) {
                $('#product-response').text('Yay! Product Removed!');
            })
            .fail(function() {
                $('#product-response').text('Yike! Remvoing Something went wrong.');
            });
        $('#product-name').val('');
        $('#product-price').val('');
    });



    $('#buy-item-form').submit(function(event) {
        var $form = $(this);
        $form.find('button').prop('disabled', true);
        $form.get(0).submit();
    });

});
