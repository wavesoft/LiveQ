#!/bin/bash
LOCKFILE="/tmp/liveq-environment.lock"

# Start MySQL
SQL_BIN="/usr/local/bin/mysqld"
SQL_SCREEN="mysql"
function start_sql {
	screen -dmS ${SQL_SCREEN} ${SQL_BIN}
}
function stop_sql {
	PID=$(pidof $(basename ${SQL_BIN}))
	kill $PID
}

# Start REDIS
REDIS_BIN="/usr/local/bin/redis-server"
REDIS_SCREEN="redis"
function start_redis {
	screen -dmS ${REDIS_SCREEN} ${REDIS_BIN}
}
function stop_redis {
	PID=$(pidof $(basename ${REDIS_BIN}))
	kill $PID
}

# Start RabbitMQ
RABBITMQ_BIN="/usr/local/sbin/rabbitmq-server"
RABBITMQ_SCREEN="rabbitmq"
function start_rabbitmq {
	screen -dmS ${RABBITMQ_SCREEN} ${RABBITMQ_BIN}
}
function stop_rabbitmq {
	PID=$(ps aux | grep ${RABBITMQ_BIN} | grep login | awk '{print $2}')
	kill $PID
}

# Start ejabberd
EJABBERD_PATH="/usr/local/sbin/ejabberdctl"
function start_ejabberd {
	${EJABBERD_PATH} start
}
function stop_ejabberd {
	${EJABBERD_PATH} stop
}

# Start/Stop everything
function start_all {
	start_ejabberd
	start_rabbitmq
	start_redis
	start_sql
}
function stop_all {
	stop_ejabberd
	stop_rabbitmq
	stop_redis
	stop_sql
}

# Handle CTRL+C
trap stop_all SIGINT

# Start everything
echo "Starting local LiveQ Services..."
start_all
echo "[ Kill everything with CTRL+C ]"

# Wait forever
cat
