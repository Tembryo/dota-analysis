$(function(){

	var nr_slides = 0;
	var max_slides = 5;

	var positions = [];

	$(document).ready(function(){

		init();

		handle_move();

		$(document).on('click','#view-example',function(e){

			e.preventDefault();

			if($("#top-slider").css('visibility') == 'visible')
				$("#top-slider").css({
					'visibility':'hidden',
					'opacity':0
				});
			else
				$("#top-slider").css({
					'visibility':'visible',
					'opacity':1
				});
		});

	});

	function init()
	{
		nr_slides = $('#top-slider .slider-card').length;


		if($('#top-slider .slider-card-active').length == 0)
			$('#top-slider .slider-card').addClass('slider-card-active');
	
		$active_slide = $('#top-slider .slider-card-active').first();

		var slide_width = $active_slide.width();

		$active_slide.css({
			'left': '50%',
			'margin-left': '-'+(slide_width/2)+"px",
			'z-index':100
		});

		$active_slide.attr('position',1);
		$active_slide.attr('tranz',0);

		var current_slide = 1;

		positions[current_slide] = {};
		positions[current_slide]['left'] = '50%';
		positions[current_slide]['translate'] = 0;
		positions[current_slide]['z-index'] = 100;

		$('#top-slider .slider-card:not(.slider-card-active)').each(function(){

			++current_slide;

			if(current_slide > max_slides)
			{
				$(this).attr('position',current_slide);
				$(this).css('z-index',50);
				$(this).addClass('slider-card-hidden');
				return;
			}

			var previous_level_slide = current_slide - 2;
			if(previous_level_slide == 0) previous_level_slide = 1;

			var previous_slide_width = $('.slider-card[position="'+previous_level_slide+'"]')[0].getBoundingClientRect().width;
			var previous_slide_offset = parseInt($('.slider-card[position="'+previous_level_slide+'"]').css('left').slice(0,-2)) - 425;
			var previous_slide_translate = parseInt($('.slider-card[position="'+previous_level_slide+'"]').attr('tranz'));

			var horizontal_offset = previous_slide_width * 130 / slide_width;
			var translate_z = previous_slide_width * 50 / slide_width;

			$(this).attr('tranz',translate_z);

			if(current_slide % 2 == 0)
				horizontal_offset = -horizontal_offset;

			horizontal_offset += previous_slide_offset;
			translate_z += previous_slide_translate;

			var row = Math.floor(current_slide / 2);

			$(this).css({
				'z-index': (100 - row),
				'transform': 'perspective(500px) translateZ(-'+(translate_z)+'px)',
				'left': '+='+horizontal_offset+'px'
			})

			positions[current_slide] = {};
			positions[current_slide]['left'] = $(this).css('left');
			positions[current_slide]['translate'] = -translate_z;
			positions[current_slide]['z-index'] = 100-row;

			$(this).attr('position',current_slide);

		});

		$('#top-slider .slider-card').each(function(){
			$(this).css({
				'transition':'all .3s ease',
				'-moz-transition':'all .3s ease',
				'-webkit-transition':'all .3s ease',
				'-o-transition':'all .3s ease',
			})
		});
	}

	function handle_move()
	{
		$(document).on('click','#move-left',function(){
			$('.slider-card[position="2"]').click();
		});

		$(document).on('click','#move-right',function(){
			$('.slider-card[position="3"]').click();
		});

		$(document).on('click','.slider-card',function(e){

			if($(this).hasClass('slider-card-active')) return;

			var slide_width = $(this).width();

			var slide_nr = parseInt($(this).attr('position'));

			$(this).css({
				'left': '50%',
				'margin-left': '-'+(slide_width/2)+"px",
				'z-index':101,
				'transform': 'perspective(500px) translateZ(0px)'
			}).attr('position',1);

			$('.slider-card-active').removeClass('slider-card-active');
			$(this).addClass('slider-card-active');

			var nr_moved = Math.floor(slide_nr / 2); 

		
			$('#top-slider-cards .slider-card:not(.slider-card-active)').each(function(e){

				var this_slide_position = parseInt($(this).attr('position'));
				var new_pos;

				if(slide_nr % 2 == 0)
				{
					if(this_slide_position == 1)
					{
						new_pos = this_slide_position + nr_moved*2;
					}
					else if(this_slide_position % 2 == 0)
					{
						new_pos = this_slide_position - nr_moved*2;

						if(new_pos < 0)
							new_pos = Math.abs(new_pos) + 1;

					}
					else if(this_slide_position % 2 == 1)
					{
						new_pos = this_slide_position + nr_moved*2;
					}
				}
				else
				{
					if(this_slide_position == 1)
					{
						new_pos = this_slide_position - 1 + nr_moved * 2;
					}
					else if(this_slide_position % 2 == 0)
					{
						new_pos = this_slide_position + nr_moved * 2;
					}
					else if(this_slide_position % 2 == 1)
					{
						new_pos = this_slide_position - nr_moved * 2;

						if(new_pos < 0)
							new_pos = Math.abs(new_pos) + 1;

					}
				}

				$(this).attr('position',new_pos);

				if(new_pos <= max_slides)
				{
					$(this).css({
						'left': positions[new_pos]['left'],
						'z-index': positions[new_pos]['z-index'],
						'transform': 'perspective(500px) translateZ('+positions[new_pos]['translate']+'px)'
					});
				}

				if(new_pos > max_slides) {
					$(this).addClass('slider-card-hidden');
					$(this).css('z-index',50);
				}
				else
					$(this).removeClass('slider-card-hidden');


			});

		});
	}

});