#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE event_tracker_test;
    \c event_tracker_test
    CREATE EXTENSION IF NOT EXISTS postgis;
    \c event_tracker
    CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL
