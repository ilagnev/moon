$(document).ready(function() {
	moon.init();
});

var moon = {
	dataUrl: '/ajax/moon-data',

	selectors: {
		'link': '#moon-link'
	},

	actions: {
		stat: {
			url: '/stat',
			parts: {
				account: {name: 'account[]', value: 'all'},
				country: {name: 'country[]', value: 'all'}
			}
		},
		edit: {
			'account': '/accounts#!id/_id_'
		}
	},

	elements: {
		'link': null,
		'overlay': null,
		'wrapper': null,
		'search': null,
		'results_wrapper': null,
		'results': null
	},

	init: function () {
		//console.log('moon init start');
		this.setVars();
		//this.attachEvents();//todo: need more intelligent event attach
		//console.log(this.elements);
	},
	setVars: function () {
		var _self = this;
		_self.elements.link = $(_self.selectors.link);
		_self.elements.overlay = $('<div id="overlay"/>');
		// build moon window
		_self.elements.wrapper = $('<div id="moon"/>');
		_self.elements.search = $('<form class="search" method="post"><input type="text" name="moon-search" value=""/></form>')
			.appendTo(_self.elements.wrapper);

		// results
		_self.elements.results_wrapper = $('<div class="wrap"/>')
			.appendTo(_self.elements.wrapper);
		_self.elements.results = $('<ul class="results"/>')
			.appendTo(_self.elements.results_wrapper);

		// set content
		$.get(_self.dataUrl, function(r){
			//console.log(r);
			_self.elements.results.append(r);
			if (!_self.elements.results.find('li').length) {
				//todo: need user-friendly error notification
				console.log('moon error description: no data to work with');
				return;
			}

			_self.attachEvents();
		});
	},
	attachEvents: function () {
		var _self = this;
		//console.log(_self.elements.link);

		// index results element content
		_self.doIndex();

		// deny search form submit
		_self.elements.search.on('submit', function(e){
			e.preventDefault();
			return false;
		});

		// start search when type in search field
		_self.elements.search.find('input[name=moon-search]')
			.bind("change paste keyup", $.proxy(_self.search, _self));

		//todo: place key-selection init here from function
		_self.initKeySelection();

		// open moon when click on link
		_self.elements.link.click($.proxy(_self.openCloseHandler, _self));

		// open moon when down shortcut meta+k or meta+b
		$(document)
			.bind('keydown', 'meta+b', $.proxy(_self.openCloseHandler, _self))
			.bind('keydown', 'meta+k', $.proxy(_self.openCloseHandler, _self));
		_self.elements.search.find('input')
			.bind('keydown', 'meta+k', $.proxy(_self.openCloseHandler, _self))
			.bind('keydown', 'meta+b', $.proxy(_self.openCloseHandler, _self))
			.bind('keydown', 'esc', $.proxy(_self.openCloseHandler, _self));

		// close moon when click on overlay
		_self.elements.overlay.click(function(e){
			e.preventDefault();
			_self.close()
		});

		// update results wrapper size on window size change
		$(window).resize(function(){
			setTimeout(function(){
				//console.log(_self.elements.wrapper.height(), _self.elements.search.height());
				_self.elements.results_wrapper.height(
					_self.elements.wrapper.height() - _self.elements.search.height()
				);
				//console.log(_self.elements.results_wrapper.height());
			}, 10);
		});
	},

	initKeySelection: function(){
		var _self = this;

		// init key-selection plugin
		_self.elements.results
			//.find('li')
			.keySelection({
                targetEl: _self.elements.search.find('input[name=moon-search]').get(0),
				selectionItemSelector: 'li:visible',
				scrollContainer: '#moon .wrap',
				scrollMargin: 14,
				keyActions:[ //use any and as many keys you want. available actions: select, up, down
					{keyCode:13, action:"select"}, //enter
					{keyCode:38, action:"up"}, //up
					{keyCode:40, action:"down"} //down
				]
			})
			.on("keySelection.selection",function(e){
				var el = $(e.selectedElement);
				if (!el.data('type')) {
					console.log('selected element does not have type attribute');
					return;
				}

				var url;
				if (e.withShift) { // open edit link
					// replace id placeholders
					url = _self.actions.edit[el.data('type')].replace('_id_', el.data('id'));
					if (el.data('parent-id') && el.data('parent-type')) {
						url = url.replace('_parent_', el.data('parent-id'));
					}
					document.location = url;
				} else { // open stat link
					// set params
					_self.actions.stat.parts[el.data('type')].value = el.data('id');
					if (el.data('parent-id') && el.data('parent-type')) {
						_self.actions.stat.parts[el.data('parent-type')].value = el.data('parent-id');
					}

					// assemble stat link and follow it
					url = _self.actions.stat.url + $.map(_self.actions.stat.parts, function(o){
						return o.name+'/' + o.value;
					}).join('/');
					//console.log(url);

					// just use ajax reload page if already on accounts page
					if (document.location.href.indexOf('/accounts') >= 0) {
						document.location = url;
						document.location.reload();
						//$('#jqGridPublisherStatisticsFilterForm').submit();
						//_self.close();
					} else {
						document.location = url;
					}
				}
			});
	},

	index: null,
	wildTokenizer: function (obj) {
		//console.log(obj);
		//return obj;
		console.log(arguments.callee.caller.caller.name);

		if (!arguments.length || obj == null || obj == undefined) return []
		if (Array.isArray(obj)) return obj.map(function (t) { return t.toLowerCase() })

		var str = obj.toString().replace(/^\s+/, '');

		var strs = [];
		for (var i = 0; i < str.length-1; i++) {
			strs.push(str.substring(i));
		}

		console.log(strs);
		return strs
			//.join(' ')
		;
	},
	doIndex: function(){
		var _self = this;

		//lunr.Pipeline.registerFunction(_self.wildTokenizer, 'wildTokenizer');

		_self.index = lunr(function () {
			this.ref('pos');
			this.field('id', {boost: 10});
			this.field('name', {boost: 5});
			this.field('info');
			//this.use(lunr.ru);
		});

		//_self.index.pipeline.add(_self.wildTokenizer);
		//_self.index.pipeline.before(lunr.trimmer, _self.wildTokenizer);
		//console.log(lunr.pipeline);
		//console.log(lunr.trimmer);

		//console.log(_self.index);

		_self.elements.results.find('li').each(function(i, el){
			_self.index.add({
				pos: i,
				id: $(el).data('id'),
				name: $(el).find('span.name').text(),
				info: $(el).find('span.info').text()
			});
		});
	},
	search: function(){
		var _self = this;
		var val = _self.elements.search.find('input[name=moon-search]').val();
		if (val=='') {
			_self.elements.results.find('li:hidden').css('display', 'block');
		} else {
			var res = _self.index.search(val);
			_self.elements.results.children().css('display', 'none');
			$.each(res, function(i, el){
				_self.elements.results.find('li').eq(el.ref).css('display','block');
			});
		}
	},

	// data storage
	html5Storage: function(){
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	},
	addToStorage: function(key, value){

	},
	getFromStorage: function(key){
		if (this.html5Storage()) {
			return localStorage.getItem(key);
		} else {
			//todo: load data from server
		}
	},

	// open-close section
	opened: false,
	openCloseHandler: function(e){
		e.preventDefault();
		// open and close moon
		var _self = this;
		_self.opened ? _self.close() : _self.open();
	},
	open: function () {
		console.log('moon open');
		var _self = this,
			body = $('body');

		_self.opened = true;
		_self.elements.overlay.appendTo(body);
		_self.elements.wrapper.appendTo(body);
		$(window).trigger('resize');
		// set focus to text input element
		_self.elements.search.find('input').focus();
	},
	close: function () {
		console.log('moon close');
		var _self = this;
		_self.opened = false;
		_self.elements.overlay.detach();
		_self.elements.wrapper.detach();
	}
};