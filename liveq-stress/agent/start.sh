#!/bin/bash
PROJECT_DIR=$(dirname $(dirname $(pwd)))
export PYTHONPATH="$PYTHONPATH:${PROJECT_DIR}/liveq-common:${PROJECT_DIR}/liveq-agent"
export LIVEQ_STATIC_UUID=$(uuidgen | tr -d '-')
python ${PROJECT_DIR}/liveq-agent/liveq-agent.py
