# MySQL Authentication Plugins and this App

If you see an error like:

```
Server requests authentication using unknown plugin auth_gssapi_client
```

it means your MySQL user is configured to use an authentication plugin that the Node.js mysql2 driver (used by Sequelize) does not support. The `auth_gssapi_client` plugin is Kerberos-based and is not supported by `mysql2`.

## Supported plugins
The mysql2 driver typically supports these common plugins:
- `mysql_native_password` (widely supported; simplest choice)
- `caching_sha2_password` (default in MySQL 8; supported by mysql2)

Not supported by mysql2:
- `auth_gssapi_client` (Kerberos)
- Various enterprise/third-party plugins

## How to fix
Change the authentication plugin for the database user that your app uses. You can do this as a DBA or with a user that has sufficient privileges.

Replace the placeholders (YOUR_USER, YOUR_HOST, YOUR_PASSWORD) appropriately.

### Option A: Switch to mysql_native_password
```
-- On the MySQL server
ALTER USER 'YOUR_USER'@'YOUR_HOST' IDENTIFIED WITH mysql_native_password BY 'YOUR_PASSWORD';
FLUSH PRIVILEGES;
```

### Option B: Switch to caching_sha2_password (MySQL 8 default)
```
-- On the MySQL server
ALTER USER 'YOUR_USER'@'YOUR_HOST' IDENTIFIED WITH caching_sha2_password BY 'YOUR_PASSWORD';
FLUSH PRIVILEGES;
```

After altering the user, restart this app or try the health check again.

## Verify the current plugin
To see which plugin a user is using:
```
SELECT user, host, plugin FROM mysql.user WHERE user = 'YOUR_USER';
```

## Common scenarios
- Local MySQL 8 Community Server: prefer `caching_sha2_password` or `mysql_native_password`.
- Managed cloud MySQL that enforces enterprise/Kerberos plugins: create a separate application user with `mysql_native_password` or `caching_sha2_password` if possible, or use a different client stack that supports the enforced plugin.

## App-side behavior
We’ve enhanced the startup DB connectivity check to surface a clearer hint when an unsupported plugin is detected. If the app logs mention `auth_gssapi_client` or `unknown plugin`, follow the steps above.

Path to this document: Docs/mysql-auth-plugins.md
