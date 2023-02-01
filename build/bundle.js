
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.55.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (120:3) {:else}
    function create_else_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = "/images/assets/pump-off.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Pumpe aus");
    			attr_dev(img, "class", "svelte-1o2f9yk");
    			add_location(img, file, 120, 4, 2399);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(120:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (118:3) {#if state}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = "/images/assets/pump-on.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Pumpe an");
    			attr_dev(img, "class", "svelte-1o2f9yk");
    			add_location(img, file, 118, 4, 2328);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(118:3) {#if state}",
    		ctx
    	});

    	return block;
    }

    // (145:1) {:else}
    function create_else_block(ctx) {
    	let button;
    	let t0;
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text("Für ");
    			t1 = text(/*pumpTime*/ ctx[4]);
    			t2 = text(" min einschalten");
    			attr_dev(button, "aria-busy", /*isLoadingForTimer*/ ctx[6]);
    			add_location(button, file, 145, 2, 3094);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*turnOnPumpMinutes*/ ctx[10]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pumpTime*/ 16) set_data_dev(t1, /*pumpTime*/ ctx[4]);

    			if (dirty & /*isLoadingForTimer*/ 64) {
    				attr_dev(button, "aria-busy", /*isLoadingForTimer*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(145:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (143:1) {#if startedTimer}
    function create_if_block(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Timer gestartet");
    			attr_dev(input, "aria-invalid", "false");
    			input.readOnly = true;
    			add_location(input, file, 143, 2, 3001);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(143:1) {#if startedTimer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let h3;
    	let t1;
    	let input;
    	let t2;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let div2;
    	let div0;
    	let t5;
    	let div1;
    	let h5;
    	let t6;
    	let t7;
    	let button;
    	let t8;
    	let t9;
    	let br2;
    	let t10;
    	let br3;
    	let t11;
    	let label;
    	let t13;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let t19;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*state*/ ctx[0]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*startedTimer*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			h3 = element("h3");
    			h3.textContent = "Warmwasser";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			br1 = element("br");
    			t4 = space();
    			div2 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t5 = space();
    			div1 = element("div");
    			h5 = element("h5");
    			t6 = text(/*pumpTitleText*/ ctx[8]);
    			t7 = space();
    			button = element("button");
    			t8 = text(/*pumpSwitchText*/ ctx[3]);
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			br3 = element("br");
    			t11 = space();
    			label = element("label");
    			label.textContent = "Zeitschaltung";
    			t13 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "10 min";
    			option1 = element("option");
    			option1.textContent = "20 min";
    			option2 = element("option");
    			option2.textContent = "30 min";
    			option3 = element("option");
    			option3.textContent = "45 min";
    			option4 = element("option");
    			option4.textContent = "60 min";
    			t19 = space();
    			if_block1.c();
    			add_location(h3, file, 107, 1, 2092);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", /*errorText*/ ctx[7]);
    			attr_dev(input, "aria-invalid", /*isError*/ ctx[2]);
    			input.readOnly = true;
    			add_location(input, file, 109, 1, 2114);
    			add_location(br0, file, 111, 1, 2198);
    			add_location(br1, file, 112, 1, 2206);
    			attr_dev(div0, "id", "pump-indicator");
    			attr_dev(div0, "class", "svelte-1o2f9yk");
    			toggle_class(div0, "pump-indicator-on", /*state*/ ctx[0]);
    			add_location(div0, file, 116, 2, 2249);
    			attr_dev(h5, "class", "svelte-1o2f9yk");
    			add_location(h5, file, 125, 3, 2502);
    			attr_dev(button, "aria-busy", /*isLoadingForToggle*/ ctx[5]);
    			attr_dev(button, "class", "svelte-1o2f9yk");
    			add_location(button, file, 126, 3, 2530);
    			attr_dev(div1, "id", "pump-info");
    			attr_dev(div1, "class", "svelte-1o2f9yk");
    			add_location(div1, file, 124, 2, 2478);
    			attr_dev(div2, "id", "pump-toggle-section");
    			attr_dev(div2, "class", "svelte-1o2f9yk");
    			add_location(div2, file, 114, 1, 2215);
    			add_location(br2, file, 130, 1, 2655);
    			add_location(br3, file, 131, 1, 2663);
    			attr_dev(label, "for", "pump-time");
    			add_location(label, file, 133, 1, 2672);
    			option0.__value = "10";
    			option0.value = option0.__value;
    			option0.selected = true;
    			add_location(option0, file, 135, 2, 2775);
    			option1.__value = "20";
    			option1.value = option1.__value;
    			add_location(option1, file, 136, 2, 2821);
    			option2.__value = "30";
    			option2.value = option2.__value;
    			add_location(option2, file, 137, 2, 2858);
    			option3.__value = "45";
    			option3.value = option3.__value;
    			add_location(option3, file, 138, 2, 2895);
    			option4.__value = "60";
    			option4.value = option4.__value;
    			add_location(option4, file, 139, 2, 2932);
    			attr_dev(select, "id", "pump-time");
    			select.required = true;
    			if (/*pumpTime*/ ctx[4] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[11].call(select));
    			add_location(select, file, 134, 1, 2718);
    			attr_dev(form, "class", "svelte-1o2f9yk");
    			add_location(form, file, 106, 0, 2084);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, h3);
    			append_dev(form, t1);
    			append_dev(form, input);
    			append_dev(form, t2);
    			append_dev(form, br0);
    			append_dev(form, t3);
    			append_dev(form, br1);
    			append_dev(form, t4);
    			append_dev(form, div2);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, h5);
    			append_dev(h5, t6);
    			append_dev(div1, t7);
    			append_dev(div1, button);
    			append_dev(button, t8);
    			append_dev(form, t9);
    			append_dev(form, br2);
    			append_dev(form, t10);
    			append_dev(form, br3);
    			append_dev(form, t11);
    			append_dev(form, label);
    			append_dev(form, t13);
    			append_dev(form, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			select_option(select, /*pumpTime*/ ctx[4]);
    			append_dev(form, t19);
    			if_block1.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", prevent_default(/*togglePump*/ ctx[9]), false, true, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*errorText*/ 128) {
    				attr_dev(input, "placeholder", /*errorText*/ ctx[7]);
    			}

    			if (dirty & /*isError*/ 4) {
    				attr_dev(input, "aria-invalid", /*isError*/ ctx[2]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (dirty & /*state*/ 1) {
    				toggle_class(div0, "pump-indicator-on", /*state*/ ctx[0]);
    			}

    			if (dirty & /*pumpTitleText*/ 256) set_data_dev(t6, /*pumpTitleText*/ ctx[8]);
    			if (dirty & /*pumpSwitchText*/ 8) set_data_dev(t8, /*pumpSwitchText*/ ctx[3]);

    			if (dirty & /*isLoadingForToggle*/ 32) {
    				attr_dev(button, "aria-busy", /*isLoadingForToggle*/ ctx[5]);
    			}

    			if (dirty & /*pumpTime*/ 16) {
    				select_option(select, /*pumpTime*/ ctx[4]);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(form, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let pumpTitleText;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let apiURL = "http://192.168.178.20/api/neh2i23MKgNUZ3Rn2cq80yx20LK60KWOmUMv4O57/";

    	let timers = {
    		"10": "schedules/3",
    		"20": "schedules/5",
    		"30": "schedules/6",
    		"45": "schedules/7",
    		"60": "schedules/8",
    		"test": "schedules/9"
    	};

    	let state = true;
    	let pumpSwitchText;
    	let pumpTime;
    	let isLoadingForConnection = false;
    	let isLoadingForToggle = false;
    	let isLoadingForTimer = false;
    	let startedTimer = false;
    	let isError = true;
    	let errorText = "";

    	const togglePump = () => {
    		$$invalidate(5, isLoadingForToggle = true);

    		fetch(apiURL + "lights/13/state", {
    			method: 'PUT',
    			headers: { 'Content-type': 'application/json' },
    			body: '{"on":' + !state + '}'
    		}).then(response => response.json()).then(data => {
    			$$invalidate(5, isLoadingForToggle = false);

    			if (data[0].success) {
    				$$invalidate(0, state = !state);
    				$$invalidate(2, isError = false);
    			} else {
    				$$invalidate(2, isError = true);
    			}
    		});
    	};

    	const turnOnPumpMinutes = () => {
    		$$invalidate(6, isLoadingForTimer = true);

    		fetch(apiURL + timers[pumpTime], {
    			method: 'PUT',
    			headers: { 'Content-type': 'application/json' },
    			body: '{"status":"enabled"}'
    		}).then(response => response.json()).then(data => {
    			$$invalidate(5, isLoadingForToggle = false);

    			if (data[0].success) {
    				$$invalidate(6, isLoadingForTimer = false);
    				$$invalidate(1, startedTimer = true);
    				$$invalidate(2, isError = false);
    			} else {
    				$$invalidate(2, isError = true);
    			}
    		});
    	};

    	const getPumpstate = () => {
    		fetch(apiURL + "lights/13/").then(response => response.json()).then(data => {
    			console.log(data.state.on);

    			if (data.state.on == true || data.state.on == false) {
    				$$invalidate(0, state = data.state.on);
    				$$invalidate(2, isError = false);
    			} else {
    				$$invalidate(2, isError = true);
    			}
    		});
    	};

    	setTimeout(
    		() => {
    			getPumpstate();
    		},
    		"5000"
    	);

    	getPumpstate();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		pumpTime = select_value(this);
    		$$invalidate(4, pumpTime);
    	}

    	$$self.$capture_state = () => ({
    		apiURL,
    		timers,
    		state,
    		pumpSwitchText,
    		pumpTime,
    		isLoadingForConnection,
    		isLoadingForToggle,
    		isLoadingForTimer,
    		startedTimer,
    		isError,
    		errorText,
    		togglePump,
    		turnOnPumpMinutes,
    		getPumpstate,
    		pumpTitleText
    	});

    	$$self.$inject_state = $$props => {
    		if ('apiURL' in $$props) apiURL = $$props.apiURL;
    		if ('timers' in $$props) timers = $$props.timers;
    		if ('state' in $$props) $$invalidate(0, state = $$props.state);
    		if ('pumpSwitchText' in $$props) $$invalidate(3, pumpSwitchText = $$props.pumpSwitchText);
    		if ('pumpTime' in $$props) $$invalidate(4, pumpTime = $$props.pumpTime);
    		if ('isLoadingForConnection' in $$props) isLoadingForConnection = $$props.isLoadingForConnection;
    		if ('isLoadingForToggle' in $$props) $$invalidate(5, isLoadingForToggle = $$props.isLoadingForToggle);
    		if ('isLoadingForTimer' in $$props) $$invalidate(6, isLoadingForTimer = $$props.isLoadingForTimer);
    		if ('startedTimer' in $$props) $$invalidate(1, startedTimer = $$props.startedTimer);
    		if ('isError' in $$props) $$invalidate(2, isError = $$props.isError);
    		if ('errorText' in $$props) $$invalidate(7, errorText = $$props.errorText);
    		if ('pumpTitleText' in $$props) $$invalidate(8, pumpTitleText = $$props.pumpTitleText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*state*/ 1) {
    			$$invalidate(3, pumpSwitchText = state ? "Pumpe ausschalten" : "Pumpe anschalten");
    		}

    		if ($$self.$$.dirty & /*state*/ 1) {
    			$$invalidate(8, pumpTitleText = state ? "Pumpe an" : "Pumpe aus");
    		}

    		if ($$self.$$.dirty & /*isError*/ 4) {
    			$$invalidate(7, errorText = isError ? "Keine Verbindung" : "Verbunden");
    		}

    		if ($$self.$$.dirty & /*startedTimer*/ 2) {
    			{
    				if (startedTimer) {
    					setTimeout(
    						() => {
    							$$invalidate(1, startedTimer = false);
    						},
    						"5000"
    					);
    				}
    			}
    		}
    	};

    	return [
    		state,
    		startedTimer,
    		isError,
    		pumpSwitchText,
    		pumpTime,
    		isLoadingForToggle,
    		isLoadingForTimer,
    		errorText,
    		pumpTitleText,
    		togglePump,
    		turnOnPumpMinutes,
    		select_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
