/*jshint eqeqeq:false */
(function (window) {
	'use strict';

	/**
	 * Creates a new client side storage object and will create an empty
	 * collection if no collection already exists.
	 *
	 * @param {string} name The name of our DB we want to use
	 * @param {function} callback Our fake DB uses callbacks because in
	 * real life you probably would be making AJAX calls
	 */
	function Store(options, callback) {
	  callback = callback || function () {};

	  this.kinto = new Kinto(options);
      this.store = this.kinto.collection(options.collection);

      this.syncOptions = {strategy: Kinto.syncStrategy.SERVER_WINS};
      this.store.sync(this.syncOptions)
      .then(function(result) {
        if (result.ok) {
          this.store.list()
            .then(function(records) {
              callback.call(this, records);
            });
        }
      }.bind(this))
      .catch(function (err) {
        // Special treatment since the demo server is flushed.
        if (/flushed/.test(err.message)) {
          // Mark every local record as «new» and re-upload.
          return this.store.resetSyncStatus()
            .then(function() {
              this.store.sync(this.syncOptions)
            }.bind(this));
        }
        // Ignore network errors (offline)
        if (/HTTP 0/.test(err.message)) {
          console.log('Sync aborted (cannot reach server)');
          return;
        }
        throw err;
      }.bind(this));
	}

	/**
	 * Finds items based on a query given as a JS object
	 *
	 * @param {object} query The query to match against (i.e. {foo: 'bar'})
	 * @param {function} callback	 The callback to fire when the query has
	 * completed running
	 *
	 * @example
	 * db.find({foo: 'bar', hello: 'world'}, function (data) {
	 *	 // data will return any items that have foo: bar and
	 *	 // hello: world in their properties
	 * });
	 */
	Store.prototype.find = function (query, callback) {
	  if (!callback) {
		return;
	  }

      console.log(query);
      this.store.list({filters: query}).then(function(results) {
        callback.call(this, results.data);
      }.bind(this))
      .catch(function (err) {
        throw err;
      });
	};

	/**
	 * Will retrieve all data from the collection
	 *
	 * @param {function} callback The callback to fire upon retrieving data
	 */
	Store.prototype.findAll = function (callback) {
	  callback = callback || function () {};
      this.store.list().then(function(records) {
        callback.call(this, records.data);
      });
	};

	/**
	 * Will save the given data to the DB. If no item exists it will create a new
	 * item, otherwise it'll simply update an existing item's properties
	 *
	 * @param {object} updateData The data to save back into the DB
	 * @param {function} callback The callback to fire after saving
	 * @param {number} id An optional param to enter an ID of an item to update
	 */
	Store.prototype.save = function (updateData, callback, id) {
	  callback = callback || function () {};
      var isNew = id === undefined;

      if (!isNew) {
        this.store.get(id)
        .then(function(record) {
          updateData = Object.assign({}, record.data, updateData);
          this.store.update(updateData)
          .then(function(result) {
            callback.call(this, [updateData]);
          }.bind(this))
          .then(function (result) {
            this.store.sync(this.syncOptions);
          }.bind(this));
        }.bind(this));
      } else {
        this.store.create(updateData)
        .then(function (result) {
		  callback.call(this, [updateData]);
        }.bind(this))
        .then(function (result) {
          this.store.sync(this.syncOptions);
        }.bind(this));
      }
	};

	/**
	 * Will remove an item from the Store based on its ID
	 *
	 * @param {number} id The ID of the item you want to remove
	 * @param {function} callback The callback to fire after saving
	 */
	Store.prototype.remove = function (id, callback) {
      this.store.delete(id)
      .then(function() {
        this.findAll(callback);
      }.bind(this));
	};

	/**
	 * Will drop all storage and start fresh
	 *
	 * @param {function} callback The callback to fire after dropping the data
	 */
	Store.prototype.drop = function (callback) {
      this.store.clear(function() {
        this.findAll(callback);
      }.bind(this));
	};

	// Export to window
	window.app = window.app || {};
	window.app.Store = Store;
})(window);
