#!/bin/bash

# Populate some properties
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPONENT="$1"

# Check for errors
[ -z "$(which virtualenv)" ] && echo "ERROR: Missing 'virtualenv'! Install it with 'pip install virtualenv'" && exit 1

# Check if we have a virtualenv created
VENV_DIR="${BASE_DIR}/.virtualenv"
if [ ! -d "${VENV_DIR}" ]; then
	echo "INFO: Missing virtualenv directory, will create"
	virtualenv --prompt="(LiveQ) $PS1" ${VENV_DIR}

	echo "INFO: Installing requirements"
	source ${VENV_DIR}/bin/activate
	pip install -r ${BASE_DIR}/requirements.txt
fi

# Activate virtual env
source ${VENV_DIR}/bin/activate

# Start component
if [ -z "$COMPONENT" ]; then
	echo "ERROR: Please specify a component to bootstrap or 'shell' to get a shell prompt"
	exit 1

elif [ "$COMPONENT" == "shell" ]; then
	bash

elif [ "$COMPONENT" == "admin" ]; then
	
	# Launch admin and pass-through commands
	shift
	cd "${BASE_DIR}/tools"
	${BASE_DIR}/tools/admin.py $*

else

	# Get component dir
	COMPONENT_DIR="${BASE_DIR}/${COMPONENT}"
	if [ ! -d "${COMPONENT_DIR}" ]; then
		echo "ERROR: Component directory $COMPONENT_DIR not found!"
		exit 1
	fi

	# Get component launcher
	COMPONENT_LAUNCHER="${COMPONENT_DIR}/${COMPONENT}.py"
	if [ ! -f "${COMPONENT_LAUNCHER}" ]; then
		echo "ERROR: Component launcher $COMPONENT_LAUNCHER not found!"
		exit 1
	fi

	# Launch
	cd ${COMPONENT_DIR}
	${COMPONENT_LAUNCHER}

fi
