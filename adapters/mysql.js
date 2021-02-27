const mysql = require('mysql')

module.exports = mysql.createConnection(process.env.MYSQL_CONNECTIONSTRING)
