#!/bin/bash

# LiveQ CVMFS Directory
CVMFS_VAS_DIR="/cvmfs/sft.cern.ch/lcg/external/experimental/virtual-atom-smasher"
CVMFS_LIVEQ_DIR="${CVMFS_VAS_DIR}/liveq"

# CVMFS Binaries
AGENT_WRAPPER_BIN="${CVMFS_VAS_DIR}/liveq-agent-wrapper.sh"

# Make sure we have log directory
[ ! -d /var/log/liveq ] && mkdir -p /var/log/liveq

# Log everything on the logfiles
exec 2>>/var/log/liveq/bootstrap-err.log >>/var/log/liveq/bootstrap-out.log

# Count python processes
ACTIVE_PROC=$(ps aux | grep python | grep liveq-agent -c)

# Check if it's dead
if [ $ACTIVE_PROC -eq 0 ]; then
	echo "No active liveq-agent found. Starting agent..."
	exec ${AGENT_WRAPPER_BIN}&
fi
