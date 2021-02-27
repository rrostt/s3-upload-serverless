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

exports.up = async function(db) {
  await db.insert(
    'streams',
    ['id', 'userId', 'title', 'description'],
    ['6022c4058fabfe14be1aa838', 3, 'Jacks little plants', 'Jack is growing snappeas, and some flowers.']
  );
  await db.insert(
    'streams',
    ['id', 'userId', 'title', 'description'],
    ['6023b0be44d5050008108ef3', 4, 'The stream of dreets', 'Drömmarnas gata. Förlåt. Gammarnas Ströta.']
  );
  await db.insert(
    'streams',
    ['id', 'userId', 'title', 'description'],
    ['602a2f467a610700086b38d9', 3, 'Out my window', 'One picture per day, around lunch time.']
  );
  await db.insert(
    'streams',
    ['id', 'userId', 'title', 'description'],
    ['602bb38cde12000008408c10', 3, 'Me working 2020-02-16', 'Me working and having a meeting and what not.']
  );
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
