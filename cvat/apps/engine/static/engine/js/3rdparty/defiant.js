/*
 * defiant.js.js [v1.4.5]
 * http://www.defiantjs.com
 * Copyright (c) 2013-2017, Hakan Bilgin <hbi@longscript.com>
 * Licensed under the MIT License
 */
/*
 * x10.js v0.1.3
 * Web worker wrapper with simple interface
 *
 * Copyright (c) 2013-2015, Hakan Bilgin <hbi@longscript.com>
 * Licensed under the MIT License
 */

(function(window, undefined) {
	//'use strict';

	var x10 = {
		init: function() {
			return this;
		},
		work_handler: function(event) {
			var args = Array.prototype.slice.call(event.data, 1),
				func = event.data[0],
				ret  = tree[func].apply(tree, args);

			// return process finish
			postMessage([func, ret]);
		},
		setup: function(tree) {
			var url    = window.URL || window.webkitURL,
				script = 'var tree = {'+ this.parse(tree).join(',') +'};',
				blob   = new Blob([script + 'self.addEventListener("message", '+ this.work_handler.toString() +', false);'],
									{type: 'text/javascript'}),
				worker = new Worker(url.createObjectURL(blob));

			// thread pipe
			worker.onmessage = function(event) {
				var args = Array.prototype.slice.call(event.data, 1),
					func = event.data[0];
				x10.observer.emit('x10:'+ func, args);
			};

			return worker;
		},
		call_handler: function(func, worker) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0, -1),
					callback = arguments[arguments.length-1];

				// add method name
				args.unshift(func);

				// listen for 'done'
				x10.observer.on('x10:'+ func, function(event) {
					callback(event.detail[0]);
				});

				// start worker
				worker.postMessage(args);
			};
		},
		compile: function(hash) {
			var worker = this.setup(typeof(hash) === 'function' ? {func: hash} : hash),
				obj    = {},
				fn;
			// create return object
			if (typeof(hash) === 'function') {
				obj.func = this.call_handler('func', worker);
				return obj.func;
			} else {
				for (fn in hash) {
					obj[fn] = this.call_handler(fn, worker);
				}
				return obj;
			}
		},
		parse: function(tree, isArray) {
			var hash = [],
				key,
				val,
				v;

			for (key in tree) {
				v = tree[key];
				// handle null
				if (v === null) {
					hash.push(key +':null');
					continue;
				}
				// handle undefined
				if (v === undefined) {
					hash.push(key +':undefined');
					continue;
				}
				switch (v.constructor) {
					case Date:     val = 'new Date('+ v.valueOf() +')';           break;
					case Object:   val = '{'+ this.parse(v).join(',') +'}';       break;
					case Array:    val = '['+ this.parse(v, true).join(',') +']'; break;
					case String:   val = '"'+ v.replace(/"/g, '\\"') +'"';        break;
					case RegExp:
					case Function: val = v.toString();                            break;
					default:       val = v;
				}
				if (isArray) hash.push(val);
				else hash.push(key +':'+ val);
			}
			return hash;
		},
		// simple event emitter
		observer: (function() {
			var stack = {};

			return {
				on: function(type, fn) {
					if (!stack[type]) {
						stack[type] = [];
					}
					stack[type].unshift(fn);
				},
				off: function(type, fn) {
					if (!stack[type]) return;
					var i = stack[type].indexOf(fn);
					stack[type].splice(i,1);
				},
				emit: function(type, detail) {
					if (!stack[type]) return;
					var event = {
							type         : type,
							detail       : detail,
							isCanceled   : false,
							cancelBubble : function() {
								this.isCanceled = true;
							}
						},
						len = stack[type].length;
					while(len--) {
						if (event.isCanceled) return;
						stack[type][len](event);
					}
				}
			};
		})()
	};

	if (typeof module === "undefined") {
		// publish x10
		window.x10 = x10.init();
	} else {
		module.exports = x10.init();
	}

})(this);


(function(window, module, undefined) {
	'use strict';

	var Defiant = {
		is_ie     : /(msie|trident)/i.test(navigator.userAgent),
		is_safari : /safari/i.test(navigator.userAgent),
		env       : 'production',
		xml_decl  : '<?xml version="1.0" encoding="utf-8"?>',
		namespace : 'xmlns:d="defiant-namespace"',
		tabsize   : 4,
		render: function(template, data) {
			var processor = new XSLTProcessor(),
				span      = document.createElement('span'),
				opt       = {match: '/'},
				tmpltXpath,
				scripts,
				temp,
				sorter;
			// handle arguments
			switch (typeof(template)) {
				case 'object':
					this.extend(opt, template);
					if (!opt.data) opt.data = data;
					break;
				case 'string':
					opt.template = template;
					opt.data = data;
					break;
				default:
					throw 'error';
			}
			opt.data = JSON.toXML(opt.data);
			tmpltXpath = '//xsl:template[@name="'+ opt.template +'"]';

			if (!this.xsl_template) this.gatherTemplates();

			if (opt.sorter) {
				sorter = this.node.selectSingleNode(this.xsl_template, tmpltXpath +'//xsl:for-each//xsl:sort');
				if (sorter) {
					if (opt.sorter.order) sorter.setAttribute('order', opt.sorter.order);
					if (opt.sorter.select) sorter.setAttribute('select', opt.sorter.select);
					sorter.setAttribute('data-type', opt.sorter.type || 'text');
				}
			}

			temp = this.node.selectSingleNode(this.xsl_template, tmpltXpath);
			temp.setAttribute('match', opt.match);
			processor.importStylesheet(this.xsl_template);
			span.appendChild(processor.transformToFragment(opt.data, document));
			temp.removeAttribute('match');

			if (this.is_safari) {
				scripts = span.getElementsByTagName('script');
				for (var i=0, il=scripts.length; i<il; i++) scripts[i].defer = true;
			}
			return span.innerHTML;
		},
		gatherTemplates: function() {
			var scripts = document.getElementsByTagName('script'),
				str     = '',
				i       = 0,
				il      = scripts.length;
			for (; i<il; i++) {
				if (scripts[i].type === 'defiant/xsl-template') str += scripts[i].innerHTML;
			}
			this.xsl_template = this.xmlFromString('<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xlink="http://www.w3.org/1999/xlink" '+ this.namespace +'>'+ str.replace(/defiant:(\w+)/g, '$1') +'</xsl:stylesheet>');
		},
		getSnapshot: function(data, callback) {
			return JSON.toXML(data, callback || true);
		},
		xmlFromString: function(str) {
			var parser,
				doc;
			str = str.replace(/>\s{1,}</g, '><');
			if (str.trim().match(/<\?xml/) === null) {
				str = this.xml_decl + str;
			}
			if ( 'ActiveXObject' in window ) {
				doc = new ActiveXObject('Msxml2.DOMDocument');
				doc.loadXML(str);
				doc.setProperty('SelectionNamespaces', this.namespace);
				if (str.indexOf('xsl:stylesheet') === -1) {
					doc.setProperty('SelectionLanguage', 'XPath');
				}
			} else {
				parser = new DOMParser();
				doc = parser.parseFromString(str, 'text/xml');
			}
			return doc;
		},
		extend: function(src, dest) {
			for (var content in dest) {
				if (!src[content] || typeof(dest[content]) !== 'object') {
					src[content] = dest[content];
				} else {
					this.extend(src[content], dest[content]);
				}
			}
			return src;
		},
		node: {}
	};

	// Export
	window.Defiant = module.exports = Defiant;

})(
	typeof window !== 'undefined' ? window : {},
	typeof module !== 'undefined' ? module : {}
);


if (typeof(XSLTProcessor) === 'undefined') {

	// emulating XSLT Processor (enough to be used in defiant)
	var XSLTProcessor = function() {};
	XSLTProcessor.prototype = {
		importStylesheet: function(xsldoc) {
			this.xsldoc = xsldoc;
		},
		transformToFragment: function(data, doc) {
			var str = data.transformNode(this.xsldoc),
				span = document.createElement('span');
			span.innerHTML = str;
			return span;
		}
	};

} else if (typeof(XSLTProcessor) !== 'function' && !XSLTProcessor) {

	// throw error
	throw 'XSLTProcessor transformNode not implemented';

}


// extending STRING
if (!String.prototype.fill) {
	String.prototype.fill = function(i,c) {
		var str = this;
		c = c || ' ';
		for (; str.length<i; str+=c){}
		return str;
	};
}

if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/gm, '');
	};
}

if (!String.prototype.xTransform) {
	String.prototype.xTransform = function () {
		var str = this;
		if (this.indexOf('translate(') === -1) {
			str = this.replace(/contains\(([^,]+),([^\\)]+)\)/g, function(c,h,n) {
				var a = 'abcdefghijklmnopqrstuvwxyz';
				return "contains(translate("+ h +", \""+ a.toUpperCase() +"\", \""+ a +"\"),"+ n.toLowerCase() +")";
			});
		}
		return str.toString();
	};
}

/* jshint ignore:start */
if (typeof(JSON) === 'undefined') {
	window.JSON = {
		parse: function (sJSON) { return eval("(" + sJSON + ")"); },
		stringify: function (vContent) {
			if (vContent instanceof Object) {
				var sOutput = "";
				if (vContent.constructor === Array) {
					for (var nId = 0; nId < vContent.length; sOutput += this.stringify(vContent[nId]) + ",", nId++);
					return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
				}
				if (vContent.toString !== Object.prototype.toString) {
					return "\"" + vContent.toString().replace(/"/g, "\\$&") + "\"";
				}
				for (var sProp in vContent) {
					sOutput += "\"" + sProp.replace(/"/g, "\\$&") + "\":" + this.stringify(vContent[sProp]) + ",";
				}
				return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
			}
			return typeof vContent === "string" ? "\"" + vContent.replace(/"/g, "\\$&") + "\"" : String(vContent);
		}
	};
}
/* jshint ignore:end */

if (!JSON.toXML) {
	JSON.toXML = function(tree, callback) {
		'use strict';

		var interpreter = {
				map              : [],
				rx_validate_name : /^(?!xml)[a-z_][\w\d.:]*$/i,
				rx_node          : /<(.+?)( .*?)>/,
				rx_constructor   : /<(.+?)( d:contr=".*?")>/,
				rx_namespace     : / xmlns\:d="defiant\-namespace"/,
				rx_data          : /(<.+?>)(.*?)(<\/d:data>)/i,
				rx_function      : /function (\w+)/i,
				namespace        : 'xmlns:d="defiant-namespace"',
				to_xml_str: function(tree) {
					return {
						str: this.hash_to_xml(null, tree),
						map: this.map
					};
				},
				hash_to_xml: function(name, tree, array_child) {
					var is_array = tree.constructor === Array,
						self = this,
						elem = [],
						attr = [],
						key,
						val,
						val_is_array,
						type,
						is_attr,
						cname,
						constr,
						cnName,
						i,
						il,
						fn = function(key, tree) {
							val = tree[key];
							if (val === null || val === undefined || val.toString() === 'NaN') val = null;

							is_attr = key.slice(0,1) === '@';
							cname   = array_child ? name : key;
							if (cname == +cname && tree.constructor !== Object) cname = 'd:item';
							if (val === null) {
								constr = null;
								cnName = false;
							} else {
								constr = val.constructor;
								cnName = constr.toString().match(self.rx_function)[1];
							}

							if (is_attr) {
								attr.push( cname.slice(1) +'="'+ self.escape_xml(val) +'"' );
								if (cnName !== 'String') attr.push( 'd:'+ cname.slice(1) +'="'+ cnName +'"' );
							} else if (val === null) {
								elem.push( self.scalar_to_xml( cname, val ) );
							} else {
								switch (constr) {
									case Function:
										// if constructor is function, then it's not a JSON structure
										throw 'JSON data should not contain functions. Please check your structure.';
										/* falls through */
									case Object:
										elem.push( self.hash_to_xml( cname, val ) );
										break;
									case Array:
										if (key === cname) {
											val_is_array = val.constructor === Array;
											if (val_is_array) {
												i = val.length;
												while (i--) {
													if (val[i] === null || !val[i] || val[i].constructor === Array) val_is_array = true;
													if (!val_is_array && val[i].constructor === Object) val_is_array = true;
												}
											}
											elem.push( self.scalar_to_xml( cname, val, val_is_array ) );
											break;
										}
										/* falls through */
									case String:
										if (typeof(val) === 'string') {
											val = val.toString().replace(/\&/g, '&amp;')
													.replace(/\r|\n/g, '&#13;');
										}
										if (cname === '#text') {
											// prepare map
											self.map.push(tree);
											attr.push('d:mi="'+ self.map.length +'"');
											attr.push('d:constr="'+ cnName +'"');
											elem.push( self.escape_xml(val) );
											break;
										}
										/* falls through */
									case Number:
									case Boolean:
										if (cname === '#text' && cnName !== 'String') {
											// prepare map
											self.map.push(tree);
											attr.push('d:mi="'+ self.map.length +'"');
											attr.push('d:constr="'+ cnName +'"');
											elem.push( self.escape_xml(val) );
											break;
										}
										elem.push( self.scalar_to_xml( cname, val ) );
										break;
								}
							}
						};
					if (tree.constructor === Array) {
						i = 0;
						il = tree.length;
						for (; i<il; i++) {
							fn(i.toString(), tree);
						}
					} else {
						for (key in tree) {
							fn(key, tree);
						}
					}
					if (!name) {
						name = 'd:data';
						attr.push(this.namespace);
						if (is_array) attr.push('d:constr="Array"');
					}
					if (name.match(this.rx_validate_name) === null) {
						attr.push( 'd:name="'+ name +'"' );
						name = 'd:name';
					}
					if (array_child) return elem.join('');
					// prepare map
					this.map.push(tree);
					attr.push('d:mi="'+ this.map.length +'"');

					return '<'+ name + (attr.length ? ' '+ attr.join(' ') : '') + (elem.length ? '>'+ elem.join('') +'</'+ name +'>' : '/>' );
				},
				scalar_to_xml: function(name, val, override) {
					var attr = '',
						text,
						constr,
						cnName;

					// check whether the nodename is valid
					if (name.match(this.rx_validate_name) === null) {
						attr += ' d:name="'+ name +'"';
						name = 'd:name';
						override = false;
					}
					if (val === null || val.toString() === 'NaN') val = null;
					if (val === null) return '<'+ name +' d:constr="null"/>';
					if (val.length === 1 && val.constructor === Array && !val[0]) {
						return '<'+ name +' d:constr="null" d:type="ArrayItem"/>';
					}
					if (val.length === 1 && val[0].constructor === Object) {

						text = this.hash_to_xml(false, val[0]);

						var a1 = text.match(this.rx_node),
							a2 = text.match(this.rx_constructor);
						a1 = (a1 !== null)? a1[2]
									.replace(this.rx_namespace, '')
									.replace(/>/, '')
									.replace(/"\/$/, '"') : '';
						a2 = (a2 !== null)? a2[2] : '';

						text = text.match(this.rx_data);
						text = (text !== null)? text[2] : '';

						return '<'+ name + a1 +' '+ a2 +' d:type="ArrayItem">'+ text +'</'+ name +'>';
					} else if (val.length === 0 && val.constructor === Array) {
						return '<'+ name +' d:constr="Array"/>';
					}
					// else
					if (override) {
						return this.hash_to_xml( name, val, true );
					}

					constr = val.constructor;
					cnName = constr.toString().match(this.rx_function)[1];
					text = (constr === Array)   ? this.hash_to_xml( 'd:item', val, true )
												: this.escape_xml(val);

					attr += ' d:constr="'+ cnName +'"';
					// prepare map
					this.map.push(val);
					attr += ' d:mi="'+ this.map.length +'"';

					return (name === '#text') ? this.escape_xml(val) : '<'+ name + attr +'>'+ text +'</'+ name +'>';
				},
				escape_xml: function(text) {
					return String(text) .replace(/</g, '&lt;')
										.replace(/>/g, '&gt;')
										.replace(/"/g, '&quot;')
										.replace(/&nbsp;/g, '&#160;');
				}
			},
			processed,
			doc,
			task;
		// depending on request
		switch (typeof callback) {
			case 'function':
				// compile interpreter with 'x10.js'
				task = x10.compile(interpreter);

				// parse in a dedicated thread
				task.to_xml_str(tree, function(processed) {
					// snapshot distinctly improves performance
					callback({
						doc: Defiant.xmlFromString(processed.str),
						src: tree,
						map: processed.map
					});
				});
				return;
			case 'boolean':
				processed = interpreter.to_xml_str.call(interpreter, tree);
				// return snapshot
				return {
					doc: Defiant.xmlFromString(processed.str),
					src: tree,
					map: processed.map
				};
			default:
				processed = interpreter.to_xml_str.call(interpreter, tree);
				doc = Defiant.xmlFromString(processed.str);

				this.search.map = processed.map;
				return doc;
		}
	};
}


if (!JSON.search) {
	JSON.search = function(tree, xpath, single) {
		'use strict';

		var isSnapshot = tree.doc && tree.doc.nodeType,
			doc        = isSnapshot ? tree.doc : JSON.toXML(tree),
			map        = isSnapshot ? tree.map : this.search.map,
			src        = isSnapshot ? tree.src : tree,
			xres       = Defiant.node[ single ? 'selectSingleNode' : 'selectNodes' ](doc, xpath.xTransform()),
			ret        = [],
			mapIndex,
			i;

		if (single) xres = [xres];
		i = xres.length;

		while (i--) {
			switch(xres[i].nodeType) {
				case 2:
				case 3:
					ret.unshift( xres[i].nodeValue );
					break;
				default:
					mapIndex = +xres[i].getAttribute('d:mi');
					//if (map[mapIndex-1] !== false) {
						ret.unshift( map[mapIndex-1] );
					//}
			}
		}

		// if environment = development, add search tracing
		if (Defiant.env === 'development') {
			this.trace = JSON.mtrace(src, ret, xres);
		}

		return ret;
	};
}

if (!JSON.mtrace) {
	JSON.mtrace = function(root, hits, xres) {
		'use strict';

		var win       = window,
			stringify = JSON.stringify,
			sroot     = stringify( root, null, '\t' ).replace(/\t/g, ''),
			trace     = [],
			i         = 0,
			il        = xres.length,
			od        = il ? xres[i].ownerDocument.documentElement : false,
			map       = this.search.map,
			hstr,
			cConstr,
			fIndex = 0,
			mIndex,
			lStart,
			lEnd;

		for (; i<il; i++) {
			switch (xres[i].nodeType) {
				case 2:
					cConstr = xres[i].ownerElement ? xres[i].ownerElement.getAttribute('d:'+ xres[i].nodeName) : 'String';
					hstr    = '"@'+ xres[i].nodeName +'": '+ win[ cConstr ]( hits[i] );
					mIndex  = sroot.indexOf(hstr);
					lEnd    = 0;
					break;
				case 3:
					cConstr = xres[i].parentNode.getAttribute('d:constr');
					hstr    = win[ cConstr ]( hits[i] );
					hstr    = '"'+ xres[i].parentNode.nodeName +'": '+ (hstr === 'Number' ? hstr : '"'+ hstr +'"');
					mIndex  = sroot.indexOf(hstr);
					lEnd    = 0;
					break;
				default:
					if (xres[i] === od) continue;
					if (xres[i].getAttribute('d:constr') === 'String' || xres[i].getAttribute('d:constr') === 'Number') {
						cConstr = xres[i].getAttribute('d:constr');
						hstr    = win[ cConstr ]( hits[i] );
						mIndex  = sroot.indexOf(hstr, fIndex);
						hstr    = '"'+ xres[i].nodeName +'": '+ (cConstr === 'Number' ? hstr : '"'+ hstr +'"');
						lEnd    = 0;
						fIndex  = mIndex + 1;
					} else {
						hstr   = stringify( hits[i], null, '\t' ).replace(/\t/g, '');
						mIndex = sroot.indexOf(hstr);
						lEnd   = hstr.match(/\n/g).length;
					}
			}
			lStart = sroot.substring(0,mIndex).match(/\n/g).length+1;
			trace.push([lStart, lEnd]);
		}

		return trace;
	};
}

Defiant.node.selectNodes = function(XNode, XPath) {
	if (XNode.evaluate) {
		var ns = XNode.createNSResolver(XNode.documentElement),
			qI = XNode.evaluate(XPath, XNode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
			res = [],
			i   = 0,
			il  = qI.snapshotLength;
		for (; i<il; i++) {
			res.push( qI.snapshotItem(i) );
		}
		return res;
	} else {
		return XNode.selectNodes(XPath);
	}
};
Defiant.node.selectSingleNode = function(XNode, XPath) {
	if (XNode.evaluate) {
		var xI = this.selectNodes(XNode, XPath);
		return (xI.length > 0)? xI[0] : null;
	} else {
		return XNode.selectSingleNode(XPath);
	}
};


Defiant.node.prettyPrint = function(node) {
	var root = Defiant,
		tabs = root.tabsize,
		decl = root.xml_decl.toLowerCase(),
		ser,
		xstr;
	if (root.is_ie) {
		xstr = node.xml;
	} else {
		ser  = new XMLSerializer();
		xstr = ser.serializeToString(node);
	}
	if (root.env !== 'development') {
		// if environment is not development, remove defiant related info
		xstr = xstr.replace(/ \w+\:d=".*?"| d\:\w+=".*?"/g, '');
	}
	var str    = xstr.trim().replace(/(>)\s*(<)(\/*)/g, '$1\n$2$3'),
		lines  = str.split('\n'),
		indent = -1,
		i      = 0,
		il     = lines.length,
		start,
		end;
	for (; i<il; i++) {
		if (i === 0 && lines[i].toLowerCase() === decl) continue;
		start = lines[i].match(/<[A-Za-z_\:]+.*?>/g) !== null;
		//start = lines[i].match(/<[^\/]+>/g) !== null;
		end   = lines[i].match(/<\/[\w\:]+>/g) !== null;
		if (lines[i].match(/<.*?\/>/g) !== null) start = end = true;
		if (start) indent++;
		lines[i] = String().fill(indent, '\t') + lines[i];
		if (start && end) indent--;
		if (!start && end) indent--;
	}
	return lines.join('\n').replace(/\t/g, String().fill(tabs, ' '));
};


Defiant.node.toJSON = function(xnode, stringify) {
	'use strict';

	var interpret = function(leaf) {
			var obj = {},
				win = window,
				attr,
				type,
				item,
				cname,
				cConstr,
				cval,
				text,
				i, il, a;

			switch (leaf.nodeType) {
				case 1:
					cConstr = leaf.getAttribute('d:constr');
					if (cConstr === 'Array') obj = [];
					else if (cConstr === 'String' && leaf.textContent === '') obj = '';

					attr = leaf.attributes;
					i = 0;
					il = attr.length;
					for (; i<il; i++) {
						a = attr.item(i);
						if (a.nodeName.match(/\:d|d\:/g) !== null) continue;

						cConstr = leaf.getAttribute('d:'+ a.nodeName);
						if (cConstr && cConstr !== 'undefined') {
							if (a.nodeValue === 'null') cval = null;
							else cval = win[ cConstr ]( (a.nodeValue === 'false') ? '' : a.nodeValue );
						} else {
							cval = a.nodeValue;
						}
						obj['@'+ a.nodeName] = cval;
					}
					break;
				case 3:
					type = leaf.parentNode.getAttribute('d:type');
					cval = (type) ? win[ type ]( leaf.nodeValue === 'false' ? '' : leaf.nodeValue ) : leaf.nodeValue;
					obj = cval;
					break;
			}
			if (leaf.hasChildNodes()) {
				i = 0;
				il = leaf.childNodes.length;
				for(; i<il; i++) {
					item  = leaf.childNodes.item(i);
					cname = item.nodeName;
					attr  = leaf.attributes;

					if (cname === 'd:name') {
						cname = item.getAttribute('d:name');
					}
					if (cname === '#text') {
						cConstr = leaf.getAttribute('d:constr');
						if (cConstr === 'undefined') cConstr = undefined;
						text = item.textContent || item.text;
						cval = cConstr === 'Boolean' && text === 'false' ? '' : text;

						if (!cConstr && !attr.length) obj = cval;
						else if (cConstr && il === 1) {
							obj = win[cConstr](cval);
						} else if (!leaf.hasChildNodes()) {
							obj[cname] = (cConstr)? win[cConstr](cval) : cval;
						} else {
							if (attr.length < 3) obj = (cConstr)? win[cConstr](cval) : cval;
							else obj[cname] = (cConstr)? win[cConstr](cval) : cval;
						}
					} else {
						if (item.getAttribute('d:constr') === 'null') {
							if (obj[cname] && obj[cname].push) obj[cname].push(null);
							else if (item.getAttribute('d:type') === 'ArrayItem') obj[cname] = [obj[cname]];
							else obj[cname] = null;
							continue;
						}
						if (obj[cname]) {
							if (obj[cname].push) obj[cname].push(interpret(item));
							else obj[cname] = [obj[cname], interpret(item)];
							continue;
						}
						cConstr = item.getAttribute('d:constr');
						switch (cConstr) {
							case 'null':
								if (obj.push) obj.push(null);
								else obj[cname] = null;
								break;
							case 'Array':
								//console.log( Defiant.node.prettyPrint(item) );
								if (item.parentNode.firstChild === item && cConstr === 'Array' && cname !== 'd:item') {
									if (cname === 'd:item' || cConstr === 'Array') {
										cval = interpret(item);
										obj[cname] = cval.length ? [cval] : cval;
									} else {
										obj[cname] = interpret(item);
									}
								}
								else if (obj.push) obj.push( interpret(item) );
								else obj[cname] = interpret(item);
								break;
							case 'String':
							case 'Number':
							case 'Boolean':
								text = item.textContent || item.text;
								cval = cConstr === 'Boolean' && text === 'false' ? '' : text;

								if (obj.push) obj.push( win[cConstr](cval) );
								else obj[cname] = interpret(item);
								break;
							default:
								if (obj.push) obj.push( interpret( item ) );
								else obj[cname] = interpret( item );
						}
					}
				}
			}
			if (leaf.nodeType === 1 && leaf.getAttribute('d:type') === 'ArrayItem') {
				obj = [obj];
			}
			return obj;
		},
		node = (xnode.nodeType === 9) ? xnode.documentElement : xnode,
		ret  = interpret(node),
		rn   = ret[node.nodeName];

	// exclude root, if "this" is root node
	if (node === node.ownerDocument.documentElement && rn && rn.constructor === Array) {
		ret = rn;
	}
	if (stringify && stringify.toString() === 'true') stringify = '\t';
	return stringify ? JSON.stringify(ret, null, stringify) : ret;
};


// check if jQuery is present
if (typeof(jQuery) !== 'undefined') {
	(function ( $ ) {
		'use strict';

		$.fn.defiant = function(template, xpath) {
			this.html( Defiant.render(template, xpath) );
			return this;
		};

	}(jQuery));
}
