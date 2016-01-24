#!/bin/bash

# CVMFS Binaries
LOGCAT_BIN="/cvmfs/sft.cern.ch/lcg/external/experimental/dumbq/client/utils/dumbq-logcat"

# Start logcat, monitoring DumbQ Agent
${LOGCAT_BIN} \
	--prefix="[%d/%m/%y %H:%M:%S] " \
	/var/log/messages[yellow] \
	/var/log/liveq/agent.log[green] \
	/var/log/liveq/agent.err[red] \
	/var/log/liveq/bootstrap-out.log[cyan] \
	/var/log/liveq/bootstrap-err.log[red]
