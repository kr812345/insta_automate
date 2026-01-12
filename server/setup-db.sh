#!/bin/bash

echo "🔧 Setting up PostgreSQL database..."

# Check if running as postgres user or if we can connect
if psql -U postgres -c '\q' 2>/dev/null; then
    echo "✅ Connected as postgres user"
    psql -U postgres << EOSQL
-- Create database if not exists
SELECT 'CREATE DATABASE insta_automation'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'insta_automation')\gexec

-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'app_user') THEN
    CREATE USER app_user WITH PASSWORD 'app_password';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE insta_automation TO app_user;
ALTER DATABASE insta_automation OWNER TO app_user;

-- Connect to the database and grant schema privileges
\c insta_automation
GRANT ALL ON SCHEMA public TO app_user;
ALTER SCHEMA public OWNER TO app_user;
EOSQL
    echo "✅ Database and user setup complete!"
else
    echo "❌ Cannot connect as postgres user"
    echo "Please run one of these commands manually:"
    echo ""
    echo "sudo -u postgres psql << 'EOSQL'"
    echo "CREATE DATABASE insta_automation;"
    echo "CREATE USER app_user WITH PASSWORD 'app_password';"
    echo "GRANT ALL PRIVILEGES ON DATABASE insta_automation TO app_user;"
    echo "ALTER DATABASE insta_automation OWNER TO app_user;"
    echo "\\c insta_automation"
    echo "GRANT ALL ON SCHEMA public TO app_user;"
    echo "ALTER SCHEMA public OWNER TO app_user;"
    echo "EOSQL"
fi
