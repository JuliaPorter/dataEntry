const dateToFormInput = (date) => date.toISOString().split('T')[0];
const dateToUTCString = (date) => new Intl.DateTimeFormat(navigator.language, { timeZone: "UTC" }).format(date);

const dataStore = {
	dataId: 0,
	data: [],

	getNextId: function() {
		return ++this.dataId;
	},

	findEntryById: function(id) {
		for (entry of this.data) {
			if (entry.id == id) {
				return entry;
			}
		}
		throw new Error("Entry not found: " + id);
	},

	removeById: function(id) {
		for (var i = 0; i < this.data.length; i++) {
			if (this.data[i].id == id) {
				this.data.splice(i, 1);
				break;
			}
		}
	},

	exportCsv: function() {
		const header = DataGrid.columns
			.filter((col) => col.length).map((col) => '"' + col + '"').join(",");
		return header + "\n" + this.data.map(entry => entry.toCsv()).join("\n");
	},

	reset: function() {
		this.data = [];
		this.dataId = 0;
	}
};

const DataGrid = {
	columns: ['ID', 'Full Name', 'Date of Birth', 'Street Address', 'City', 'Province', 'Postal Code', ''],
	sortIdx: 0,
	sortDir: 0,
	toggleSort: function(th) {
		const colIdx = Number(th.id.split('_')[1]);
		if (this.sortIdx != colIdx) {
			this.sortIdx = colIdx;
			this.sortDir = 0;
		}
		// switch column sort
		this.sortDir = (this.sortDir + 1) % 3;
		// default sort by ID
		this.sortDir || this.setDefaultSort();
		// sort entries
		console.log("==> SORT : by %s %s", this.columns[this.sortIdx], ['UN', 'UP', 'DN'].at(this.sortDir));
		dataStore.data.sort((entry1, entry2) => {
			const v1 = entry1.fieldValue(this.sortIdx);
			const v2 = entry2.fieldValue(this.sortIdx);
			return ((v1 < v2) ? -1 : (v1 > v2) ? 1 : 0) * (this.sortDir < 2 ? this.sortDir : -1);
		});
		refreshDataTable();
	},
	setDefaultSort: function() {
		this.sortIdx = 0;
		this.sortDir = 1;
	}
}

function DataEntry(data) {
	this.setData = function(input) {
		this.data = {
			fullName: input[0],
			birthDate: new Date(input[1]),
			address: input[2],
			city: input[3],
			province: input[4],
			postCode: input[5]
		};
	};

	this.fieldValue = function(fieldIdx) {
		if (fieldIdx) {
			var scanIdx = 0;
			for (field in this.data) {
				if (fieldIdx == scanIdx + 1) {
					return this.data[field];
				}
				scanIdx++;
			}
		} else {
			return this.id;
		}
	};

	this.toCsv = function() {
		const csv = [];
		csv.push('"' + this.id + '"');
		for (field in this.data) {
			const val = this.data[field];
			const valStr = (val instanceof Date) ? dateToUTCString(val) : String(val);
			csv.push('"' + valStr.replace(/"/g, '""') + '"');
		}
		return csv.join(",");
	};

	this.edit = function(inputForm) {
		inputForm.itemid.value = this.id;
		inputForm.fullname.value = this.data.fullName;
		inputForm.birthdate.value = dateToFormInput(this.data.birthDate);
		inputForm.address.value = this.data.address;
		inputForm.city.value = this.data.city;
		inputForm.province.value = this.data.province;
		inputForm.postal.value = this.data.postCode;
		inputForm.submitButton.value = 'Save';
		inputForm.resetButton.value = 'Cancel';
	};

	this.id = dataStore.getNextId();
	this.setData(data);
}

function exportData() {
	if (dataStore.data.length) {
		window.open(encodeURI("data:text/csv;charset=utf-8," + dataStore.exportCsv()));
	} else {
		alert('Nothing to Export');
	}
}

function submitForm(inputForm) {
	const data = [];
	// validate
	data.push(validateNotBlank(inputForm.fullname));
	data.push(validateBirthDate(inputForm.birthdate));
	data.push(validateNotBlank(inputForm.address));
	data.push(validateNotBlank(inputForm.city));
	data.push(validateNotBlank(inputForm.province));
	data.push(validatePostalCode(inputForm.postal));
	processData(data, inputForm.itemid.value);
	resetForm(inputForm);
}

function resetForm(inputForm) {
	inputForm.reset();
	inputForm.submitButton.value = 'Submit';
	inputForm.resetButton.value = 'Clear';
}

function processData(data, id) {
	console.log("==> %s: %s", (id ? "UPDATE (" + id + ")" : "INSERT"), data);
	var dataEntry;
	try {
		if (id) {
			dataEntry = dataStore.findEntryById(id);
			dataEntry.setData(data);
			updateTableEntry(dataEntry)
		} else {
			dataEntry = new DataEntry(data);
			dataStore.data.push(dataEntry);
			addTableEntry(dataEntry)
		}
	} catch (error) {
		console.log(error);
		alert(error.message);
	}
}

function refreshDataTable() {
	// render sorts
	for (const th of DataGrid.table.getElementsByTagName('th')) {
		if (th.id != 'dataAction') {
			const dir = (th.id == 'column_' + DataGrid.sortIdx) ? DataGrid.sortDir : 0;
			th.className = ['unsorted', 'sortedUp', 'sortedDown'].at(dir);
		}
	}
	// render entries
	DataGrid.table.tBodies[0].innerHTML = '';
	for (dataEntry of dataStore.data) {
		addTableEntry(dataEntry);
	}
}

function addTableEntry(dataEntry) {
	populateTableRow(DataGrid.table.tBodies[0].insertRow(), dataEntry);
}

function updateTableEntry(dataEntry) {
	const row = document.getElementById('data_' + dataEntry.id);
	if (row) {
		populateTableRow(row, dataEntry);
	}
}

function removeTableEntry(row) {
	if (row) {
		const entryId = Number(row.id.split('_')[1]);
		row.parentNode.removeChild(row);
		dataStore.removeById(entryId);
	}
	return false;
}

function populateTableRow(row, dataEntry) {
	row.innerHTML = '';
	row.insertCell().textContent = dataEntry.id;
	for (field in dataEntry.data) {
		const cell = row.insertCell();
		const value = dataEntry.data[field];
		if (field == 'birthDate') {
			cell.textContent = dateToUTCString(value);
		} else {
			cell.textContent = value;
		}
	}
	const del = row.insertCell();
	del.className = 'delAction';
	del.onclick = (evt) => {
		removeTableEntry(evt.currentTarget.parentNode);
		evt.stopPropagation();
	}
	row.id = 'data_' + dataEntry.id;
	row.onclick = (evt) => dataEntry.edit(document.getElementById("entryForm"));
}

function validateNotBlank(formField) {
	const result = formField.value.trim();
	if (!result) {
		throw new Error("Field '" + getFieldName(formField) + "' is required");
	}
	return result;
}

function validateBirthDate(dateField) {
	const yearTo = new Date().getFullYear() - 18;
	const yearFrom = yearTo - 100;
	validateNotBlank(dateField);
	const birthDate = dateField.valueAsDate;
	const birthYear = birthDate.getFullYear()
	if ((birthYear < yearFrom) || (birthYear > yearTo)) {
		throw new Error("'" + getFieldName(dateField) + "' is not valid");
	}
	return birthDate;
}

function validatePostalCode(formField) {
	// TODO regex validator
	return formField.value.trim();
}

function getFieldName(formField) {
	return formField.labels.length > 0 ? formField.labels[0].textContent : formField.name;
}

function demoPreload() {
	const demoPreload = [
		['Joe Doe', '01/01/2000', '123 Main St', 'Toronto', 'ON', 'A1B2C3'],
		['Bob Red', '10/20/1990', '111 Long Ln', 'Montreal', 'QU', 'B2C2D2'],
		['Sam Fox', '12/31/1991', '987 Blue Av', 'Edmonton', 'AL', 'C3B2A1']
	];
	dataStore.reset();
	refreshDataTable();
	for (data of demoPreload) {
		processData(data);
	}
}

window.onload = (evt) => {
	DataGrid.table = document.getElementById("dataTable");
	var colIdx = 0;
	for (const th of DataGrid.table.getElementsByTagName('th')) {
		if (th.id != 'dataAction') {
			th.id = 'column_' + colIdx;
			th.className = 'unsorted';
			th.addEventListener('click', (evt) => DataGrid.toggleSort(evt.currentTarget));
		}
		colIdx++;
	}
	DataGrid.setDefaultSort();
	refreshDataTable();

	// trigger demo preload on Ctrl+Q
	document.addEventListener("keydown", (evt) => event.ctrlKey && (event.key == 'q') && demoPreload(), false);
}

