function operate( connect, table){
	this.table = table;
    this.connection = connect;
}
operate.prototype.createTable = function(callback){
	const action = 'CREATE TABLE IF NOT EXISTS ' + this.table;
	this.connection.query(action, callback);
};
operate.prototype.dropTable = function(callback){
	const action = 'DROP TABLE ' + this.table;
	this.connection.query(action, callback);
};
operate.prototype.insertItem = function(dataJson, callback) {
	const query = 'INSERT ' + this.table + ' SET ';
	let keyArray = [];
	for(let key in dataJson) {
		let keyString = key + '="' + dataJson[key] + '"';
		keyArray.push(keyString);
	}
	const action = query + keyArray.join();
	console.log('action:'+action);
	this.connection.query(action, callback);
};
operate.prototype.delAll = function(callback) {
	const action = 'DELETE FROM ' + this.table;
    this.connection.query(action,callback);
};
operate.prototype.delItem = function(dataJson, callback) {
	const query = 'DELETE FROM ' + this.table + ' WHERE ';
	let keyArray = [];
	for(let key in dataJson) {
		let keyString = key + '="' + dataJson[key] + '"';
		keyArray.push(keyString);
	}
	const action = query + keyArray.join(' AND ');
    this.connection.query(action, callback)
};
operate.prototype.selectAll = function(callback) {
	const action = 'SELECT * ' + 'FROM ' + this.table;
    this.connection.query(action, callback)
};
operate.prototype.selectItem = function(dataJson, callback) {
	const query = 'SELECT * FROM ' + this.table + ' WHERE ';
	let keyArray = [];
	for(let key in dataJson) {
		let keyString = key + '="' + dataJson[key] + '"';
		keyArray.push(keyString);
	}
	const action = query + keyArray.join(' AND ');
    this.connection.query(action, callback)
};
operate.prototype.updateAll = function(dataJson, callback){
	const query = 'UPDATE ' + this.table + ' SET ';
	let keyArray = [];
	for(let key in dataJson) {
		let keyString = key + '="' + dataJson[key] + '"';
		keyArray.push(keyString);
	}
	const action = query + keyArray.join();
    this.connection.query(action, callback)
};
operate.prototype.updateItem = function(searchDataJson, setDataJson, callback) {
	const query = 'UPDATE ' + this.table + ' SET ';
	let setKeyArray = [];
	let searchKeyArray = [];
	for(let key in setDataJson) {
		let keyString = key + '="' + setDataJson[key] + '"';
		setKeyArray.push(keyString);
	}
	for(let key in searchDataJson) {
		let keyString = key + '="' + searchDataJson[key] + '"';
		searchKeyArray.push(keyString);
	}
	const action = query + setKeyArray.join() + ' WHERE ' + searchKeyArray.join();
	console.log('action:' + action);
    this.connection.query(action, callback);
}

module.exports.operate = operate;