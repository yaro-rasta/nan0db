# NaN0 DB

Every data is a database.  
Connect everything to a database: website, local data, ftp data.
Everything can be fetched, updated or deleting if you have access rights.

You can attach any friends (shared) database to your own as a branch, for instance `mnt/YaRas.love/pics`.  
And you can extract any of your branches to other databases `const extractedDb = db.extract("pics")`.

You can see the other layers extending this abstraction:
- [nan0/db-fs](https://nan0.yaro.page/db-fs.html) - Database with a standard file management `node:fs`.
- [nan0/db-fetch](https:/nan0.yaro.page/db-fetch.html) - Database with a standard file management with `window.fetch`, for saving and deleting operations requires a server side for post and delete methods.

## LICENSE

ISC
