#!/bin/bash

# LiveQ CVMFS Directory
CVMFS_VAS_DIR="/cvmfs/sft.cern.ch/lcg/external/experimental/virtual-atom-smasher"
CVMFS_LIVEQ_DIR="${CVMFS_VAS_DIR}/liveq"

# CVMFS Binaries
AGENT_BIN="${CVMFS_LIVEQ_DIR}/liveq-agent/liveq-agent.py"
AGENT_CONFIG="/etc/liveq/liveq-agent.conf"

# Make sure we have log directory
[ ! -d /var/log/liveq ] && mkdir -p /var/log/liveq

# Log everything on the logfiles
exec >>/var/log/liveq/agent.err 2>>/var/log/liveq/agent.log

# Bootstrap
while true; do

        # Run script
        python ${AGENT_BIN} ${AGENT_CONFIG}
        EXITCODE=$?

        # Exit code 100 means 'restart script'
        if [ $EXITCODE -eq 100 ]; then
                echo "Asked to restart the agent"

        # Exit code 101 means 'reboot machine'
        elif [ $EXITCODE -eq 101 ]; then
                echo "Asked to reboot the machine"
                reboot
                break	

        # Any other exit code exits loop
        # (But the agent will be restarted from	cron)
        else
            	echo "Agent exited with code $EXITCODE"
                break
        fi

done
