const history = [];
const pending_inputs_linked_list = linked_list_new();
let pending_readline_request = null;
let last_input_group = null;
let last_input_group_timeout = null;

function linked_list_new() {
    return {first:null, last:null};
}

function linked_list_new_node(value, prev) {
    return {value, next:null, prev};
}

function linked_list_is_empty(self) {
    return self.first == null;
}

function linked_list_pop_front(self) {
    let node = self.first
    self.first = node.next;
    if (!self.first) {
	self.last = null;
	return node.item;
    }
    self.first.prev = null;
}

function linked_list_add(self, item) {
    const old_last = self.last;
    const node = linked_list_new_node(item, self.last);
    self.last = node;
    if (self.first == null) {
	self.first = self.last;
    }
    if (old_last) {
	old_last.next = node;
    }
}

/**
 * Print a message to the visual console
 * Simply adding aria-live elements to the page suffers
 * from a screen reader bug
 * whereby messages sent in quick succession
 * are not read in the correct order by the screenreader.
 * This is why the weird last_input_group stuff must be done
 */
function print(s) {
    const output = document.getElementById("output");
    if (last_input_group == null) {
    	last_input_group = document.createElement('span');
	last_input_group.setAttribute('aria-live', 'polite');
	output.append(last_input_group);
    }
    const element = document.createElement('span');
    element.textContent = s;
    last_input_group.append(element);
    if (last_input_group_timeout){
	clearTimeout(last_input_group_timeout);
    }
    last_input_group_timeout = setTimeout(clear_last_input_group, 500);
}

function clear_last_input_group() {
    last_input_group_timeout = null;
    last_input_group = null;
}

function input_submit(value) {
    if (pending_readline_request) {
	pending_readline_request(value);
    } else {
	linked_list_add(pending_inputs_linked_list, value);
    }
}

window.addEventListener("load", function(){
    const input = document.getElementById("input");
    input.addEventListener("keypress", function(event) {
	if (event.key === "Enter") {
	    event.preventDefault();
	    input_submit(input.value);
	    input.value = "";
	}
    });
});

function readline_from_input() {
    return new Promise((accept, reject)=>{
	if (linked_list_is_empty(pending_inputs_linked_list)) {
	    pending_readline_request = accept;
	} else {
	    const output = linked_list_pop_front(pending_inputs_linked_list);
	    accept(output);
	}
    });
}
