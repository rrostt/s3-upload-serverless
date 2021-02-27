'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('streams', {
    id: { type: 'string', primaryKey: true },
    userId: 'int',
    title: 'string',
    description: 'string',
  });
};

exports.down = function(db) {
  return db.dropTable('streams');
};

exports._meta = {
  "version": 1
};
