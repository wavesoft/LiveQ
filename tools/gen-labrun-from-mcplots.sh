#!/bin/bash
#
# Expand archive to a labrun-compatible folder
#

[ -z "$1" ] && echo "ERROR: Please specify the MCPlots production archive to use" && exit 1
[ -z "$2" ] && echo "ERROR: Please specify the output directory" && exit 1

# Create temporary folder
WORK_DIR=$(mktemp -d labrun.XXXXXXXXX)

# Extract archive
tar -zx -C ${WORK_DIR} -f $1

# Find all the important files
for FILE in $(find ${WORK_DIR} -mindepth 9 -name '*.dat'); do

	# Get AIDA PATH
	AIDAPATH=$(cat $FILE | grep "BEGIN HISTOGRAM" | awk '{print $4}')

	# Strip heading component
	AIDAPATH=${AIDAPATH:1}
	AIDAPATH=${AIDAPATH/\//_}

	# Move to destination folder
	DEST_DIR="$2/${AIDAPATH}.dat"
	mv -v $FILE $DEST_DIR

done

# Cleanup
rm -rf ${WORK_DIR}
